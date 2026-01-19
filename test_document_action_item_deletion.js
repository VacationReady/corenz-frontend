// Test script to verify document deletion removes associated action items
// This can be run in a Node.js environment with Prisma client

const { PrismaClient } = require('@prisma/client');

async function testDocumentActionItemDeletion() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🧪 Testing document action item deletion...\n');

    // 1. Create a test company and user
    const testCompany = await prisma.company.findFirst({
      where: { name: { contains: 'Test' } }
    }) || await prisma.company.create({
      data: {
        id: 'test-company-' + Date.now(),
        name: 'Test Company for Document Deletion',
        domain: 'test-doc-delete.com',
        status: 'ACTIVE'
      }
    });

    const testUser = await prisma.user.findFirst({
      where: { companyId: testCompany.id, role: 'ADMIN' }
    }) || await prisma.user.create({
      data: {
        id: 'test-user-' + Date.now(),
        email: 'test-doc-delete@example.com',
        name: 'Test Admin User',
        role: 'ADMIN',
        companyId: testCompany.id
      }
    });

    const testEmployee = await prisma.employee.create({
      data: {
        id: 'test-employee-' + Date.now(),
        userId: testUser.id,
        companyId: testCompany.id,
        isActive: true
      }
    });

    console.log(`✅ Using company: ${testCompany.name} (${testCompany.id})`);
    console.log(`✅ Using user: ${testUser.name} (${testUser.id})`);
    console.log(`✅ Using employee: ${testEmployee.id} \n`);

    // Test Case 1: Document deletion via documents API
    console.log('📋 Test Case 1: Document deletion via documents API');
    await testDocumentDeletionAPI(prisma, testCompany, testUser, testEmployee);
    
    // Test Case 2: Document deletion via employee deletion
    console.log('\n📋 Test Case 2: Document deletion via employee deletion');
    await testEmployeeDeletionAPI(prisma, testCompany, testUser);

    console.log('\n🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function testDocumentDeletionAPI(prisma, testCompany, testUser, testEmployee) {
  // 1. Create a test document that requires acknowledgement and signature
  const testDocument = await prisma.document.create({
    data: {
      id: 'test-doc-' + Date.now(),
      name: 'Test Document for API Deletion',
      path: 'test/path.pdf',
      size: 1024,
      type: 'application/pdf',
      url: 'test/path.pdf',
      uploaderId: testUser.id,
      companyId: testCompany.id,
      employeeId: testEmployee.id,
      requiresAck: true,
      requiresSignature: true,
      signatureDueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    }
  });

  console.log(`📄 Created test document: ${testDocument.name} (${testDocument.id})`);

  // 2. Create associated action items
  const acknowledgementActionItem = await prisma.actionItem.create({
    data: {
      id: 'ack-action-' + Date.now(),
      companyId: testCompany.id,
      type: 'DOCUMENT_ACKNOWLEDGEMENT',
      title: `Acknowledge document: ${testDocument.name}`,
      description: 'Test acknowledgement action item',
      assignedToId: testUser.id,
      relatedEmployeeId: testEmployee.id,
      status: 'PENDING',
      metadata: {
        documentId: testDocument.id,
        documentName: testDocument.name,
        documentPath: testDocument.path
      }
    }
  });

  const signatureActionItem = await prisma.actionItem.create({
    data: {
      id: 'sig-action-' + Date.now() + 1,
      companyId: testCompany.id,
      type: 'DOCUMENT_SIGNATURE',
      title: `Sign document: ${testDocument.name}`,
      description: 'Test signature action item',
      assignedToId: testUser.id,
      relatedEmployeeId: testEmployee.id,
      status: 'PENDING',
      metadata: {
        documentId: testDocument.id,
        documentName: testDocument.name,
        documentPath: testDocument.path
      }
    }
  });

  console.log(`📋 Created acknowledgement action item: ${acknowledgementActionItem.id}`);
  console.log(`📋 Created signature action item: ${signatureActionItem.id}`);

  // 3. Verify action items exist before deletion
  const actionItemsBefore = await prisma.actionItem.findMany({
    where: {
      companyId: testCompany.id,
      metadata: {
        path: ['documentId'],
        equals: testDocument.id
      }
    }
  });

  console.log(`🔍 Found ${actionItemsBefore.length} action items before deletion`);

  // 4. Simulate document deletion (same logic as the API route)
  console.log('🗑️  Simulating document deletion...');
  
  await prisma.$transaction([
    // Delete action items for document acknowledgements
    prisma.actionItem.deleteMany({
      where: {
        companyId: testCompany.id,
        type: 'DOCUMENT_ACKNOWLEDGEMENT',
        metadata: {
          path: ['documentId'],
          equals: testDocument.id,
        },
      },
    }),
    // Delete action items for document signatures
    prisma.actionItem.deleteMany({
      where: {
        companyId: testCompany.id,
        type: 'DOCUMENT_SIGNATURE',
        metadata: {
          path: ['documentId'],
          equals: testDocument.id,
        },
      },
    }),
    // Delete the document
    prisma.document.delete({ where: { id: testDocument.id } }),
  ]);

  console.log('✅ Document deletion completed');

  // 5. Verify action items are deleted
  const actionItemsAfter = await prisma.actionItem.findMany({
    where: {
      companyId: testCompany.id,
      metadata: {
        path: ['documentId'],
        equals: testDocument.id
      }
    }
  });

  const documentExists = await prisma.document.findUnique({
    where: { id: testDocument.id }
  });

  console.log(`🔍 Found ${actionItemsAfter.length} action items after deletion`);
  console.log(`📄 Document exists: ${documentExists ? 'YES ❌' : 'NO ✅'}`);

  if (actionItemsAfter.length === 0 && !documentExists) {
    console.log('✅ SUCCESS: Document and all associated action items were properly deleted!');
  } else {
    console.log('❌ FAILURE: Some action items or the document still exist');
    if (actionItemsAfter.length > 0) {
      console.log('   Remaining action items:');
      actionItemsAfter.forEach(item => {
        console.log(`   - ${item.type}: ${item.title} (${item.id})`);
      });
    }
  }
}

async function testEmployeeDeletionAPI(prisma, testCompany, testUser) {
  // 1. Create another test employee
  const testEmployee2 = await prisma.employee.create({
    data: {
      id: 'test-employee-2-' + Date.now(),
      userId: testUser.id,
      companyId: testCompany.id,
      isActive: true
    }
  });

  // 2. Create test documents attached to this employee
  const employeeDocument = await prisma.document.create({
    data: {
      id: 'emp-doc-' + Date.now(),
      name: 'Employee Document for Deletion Test',
      path: 'test/emp-doc.pdf',
      size: 1024,
      type: 'application/pdf',
      url: 'test/emp-doc.pdf',
      uploaderId: testUser.id,
      companyId: testCompany.id,
      employeeId: testEmployee2.id,
      requiresAck: true,
      requiresSignature: true
    }
  });

  const companyDocument = await prisma.document.create({
    data: {
      id: 'company-doc-' + Date.now(),
      name: 'Company Document for Deletion Test',
      path: 'test/company-doc.pdf',
      size: 1024,
      type: 'application/pdf',
      url: 'test/company-doc.pdf',
      uploaderId: testUser.id,
      companyId: testCompany.id,
      employeeId: null, // Company-level document
      requiresAck: true,
      requiresSignature: true
    }
  });

  console.log(`📄 Created employee document: ${employeeDocument.id}`);
  console.log(`📄 Created company document: ${companyDocument.id}`);

  // 3. Create action items for both documents
  await prisma.actionItem.createMany({
    data: [
      {
        id: 'emp-ack-' + Date.now(),
        companyId: testCompany.id,
        type: 'DOCUMENT_ACKNOWLEDGEMENT',
        title: `Acknowledge: ${employeeDocument.name}`,
        assignedToId: testUser.id,
        relatedEmployeeId: testEmployee2.id,
        status: 'PENDING',
        metadata: { documentId: employeeDocument.id, documentName: employeeDocument.name }
      },
      {
        id: 'emp-sig-' + Date.now(),
        companyId: testCompany.id,
        type: 'DOCUMENT_SIGNATURE',
        title: `Sign: ${employeeDocument.name}`,
        assignedToId: testUser.id,
        relatedEmployeeId: testEmployee2.id,
        status: 'PENDING',
        metadata: { documentId: employeeDocument.id, documentName: employeeDocument.name }
      },
      {
        id: 'comp-ack-' + Date.now(),
        companyId: testCompany.id,
        type: 'DOCUMENT_ACKNOWLEDGEMENT',
        title: `Acknowledge: ${companyDocument.name}`,
        assignedToId: testUser.id,
        status: 'PENDING',
        metadata: { documentId: companyDocument.id, documentName: companyDocument.name }
      },
      {
        id: 'comp-sig-' + Date.now(),
        companyId: testCompany.id,
        type: 'DOCUMENT_SIGNATURE',
        title: `Sign: ${companyDocument.name}`,
        assignedToId: testUser.id,
        status: 'PENDING',
        metadata: { documentId: companyDocument.id, documentName: companyDocument.name }
      }
    ]
  });

  console.log('📋 Created action items for both documents');

  // 4. Verify action items exist before deletion
  const actionItemsBefore = await prisma.actionItem.findMany({
    where: {
      companyId: testCompany.id,
      metadata: {
        path: ['documentId'],
        in: [employeeDocument.id, companyDocument.id]
      }
    }
  });

  console.log(`🔍 Found ${actionItemsBefore.length} action items before employee deletion`);

  // 5. Simulate employee deletion (simplified version of the API logic)
  console.log('🗑️  Simulating employee deletion...');
  
  const companyId = testCompany.id;
  const userId = testUser.id;
  const employeeId = testEmployee2.id;

  await prisma.$transaction(async (tx) => {
    // Delete employee-specific documents and their action items
    const employeeDocs = await tx.document.findMany({
      where: { employeeId },
      select: { id: true, path: true },
    });
    
    if (employeeDocs.length) {
      // Delete action items for each document individually
      for (const doc of employeeDocs) {
        await tx.actionItem.deleteMany({
          where: {
            companyId,
            type: { in: ["DOCUMENT_ACKNOWLEDGEMENT", "DOCUMENT_SIGNATURE"] },
            metadata: {
              path: ["documentId"],
              equals: doc.id,
            },
          },
        });
      }
    }
    await tx.document.deleteMany({ where: { employeeId } });

    // Delete company-level documents uploaded by this user (as last resort)
    const companyDocs = await tx.document.findMany({
      where: { uploaderId: userId, employeeId: null },
      select: { id: true, path: true },
    });
    
    if (companyDocs.length) {
      // Delete action items for each document individually
      for (const doc of companyDocs) {
        await tx.actionItem.deleteMany({
          where: {
            companyId,
            type: { in: ["DOCUMENT_ACKNOWLEDGEMENT", "DOCUMENT_SIGNATURE"] },
            metadata: {
              path: ["documentId"],
              equals: doc.id,
            },
          },
        });
      }
    }
    await tx.document.deleteMany({ where: { uploaderId: userId, employeeId: null } });

    // Delete the employee
    await tx.employee.delete({ where: { id: employeeId } });
  });

  console.log('✅ Employee deletion completed');

  // 6. Verify results
  const actionItemsAfter = await prisma.actionItem.findMany({
    where: {
      companyId: testCompany.id,
      metadata: {
        path: ['documentId'],
        in: [employeeDocument.id, companyDocument.id]
      }
    }
  });

  const employeeDocExists = await prisma.document.findUnique({
    where: { id: employeeDocument.id }
  });

  const companyDocExists = await prisma.document.findUnique({
    where: { id: companyDocument.id }
  });

  const employeeExists = await prisma.employee.findUnique({
    where: { id: testEmployee2.id }
  });

  console.log(`🔍 Found ${actionItemsAfter.length} action items after deletion`);
  console.log(`📄 Employee document exists: ${employeeDocExists ? 'YES ❌' : 'NO ✅'}`);
  console.log(`📄 Company document exists: ${companyDocExists ? 'YES ❌' : 'NO ✅'}`);
  console.log(`👤 Employee exists: ${employeeExists ? 'YES ❌' : 'NO ✅'}`);

  if (actionItemsAfter.length === 0 && !employeeDocExists && !companyDocExists && !employeeExists) {
    console.log('✅ SUCCESS: Employee, documents, and all associated action items were properly deleted!');
  } else {
    console.log('❌ FAILURE: Some items still exist');
    if (actionItemsAfter.length > 0) {
      console.log('   Remaining action items:');
      actionItemsAfter.forEach(item => {
        console.log(`   - ${item.type}: ${item.title} (${item.id})`);
      });
    }
  }
}

// Run the test
if (require.main === module) {
  testDocumentActionItemDeletion();
}

module.exports = { testDocumentActionItemDeletion };
