// Script to create test employees for testing the enhanced form system
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function createTestEmployees() {
  try {
    console.log('🔍 Finding company and department...');
    
    const company = await prisma.company.findFirst();
    const department = await prisma.department.findFirst();
    
    if (!company || !department) {
      console.log('❌ No company or department found. Run the seed script first.');
      return;
    }
    
    console.log(`Found company: ${company.name} (${company.id})`);
    console.log(`Found department: ${department.name} (${department.id})`);
    
    // Create test employees
    const testEmployees = [
      {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@corenz.com',
        role: 'EMPLOYEE'
      },
      {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@corenz.com',
        role: 'MANAGER'
      },
      {
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@corenz.com',
        role: 'ADMIN'
      }
    ];
    
    for (const emp of testEmployees) {
      console.log(`\n👤 Creating employee: ${emp.firstName} ${emp.lastName}`);
      
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: emp.email }
      });
      
      if (existingUser) {
        console.log(`   ⚠️  User ${emp.email} already exists, skipping...`);
        continue;
      }
      
      // Create user
      const hashedPassword = await bcrypt.hash('password123', 10);
      
      const user = await prisma.user.create({
        data: {
          email: emp.email,
          password: hashedPassword,
          firstName: emp.firstName,
          lastName: emp.lastName,
          role: emp.role,
          isActivated: true,
          companyId: company.id,
          departmentId: department.id,
        },
      });
      
      // Create employee
      const employee = await prisma.employee.create({
        data: {
          userId: user.id,
          isActive: true,
          companyId: company.id,
          departmentId: department.id,
        },
      });
      
      console.log(`   ✅ Created user: ${user.id}`);
      console.log(`   ✅ Created employee: ${employee.id}`);
    }
    
    console.log('\n🎉 Test employees created successfully!');
    console.log('\nLogin credentials for all users:');
    console.log('Password: password123');
    console.log('\nUsers:');
    testEmployees.forEach(emp => {
      console.log(`- ${emp.email} (${emp.role})`);
    });
    
  } catch (error) {
    console.error('❌ Error creating test employees:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestEmployees();
