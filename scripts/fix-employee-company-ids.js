// Script to fix existing employees that don't have companyId set
// This should be run once to fix existing data

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixEmployeeCompanyIds() {
  try {
    console.log('🔍 Finding employees without companyId...');
    
    // Find employees that don't have companyId set
    const employeesWithoutCompanyId = await prisma.employee.findMany({
      where: {
        companyId: null
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            companyId: true
          }
        }
      }
    });

    console.log(`Found ${employeesWithoutCompanyId.length} employees without companyId`);

    if (employeesWithoutCompanyId.length === 0) {
      console.log('✅ All employees already have companyId set');
      return;
    }

    // Update each employee with their user's companyId
    for (const employee of employeesWithoutCompanyId) {
      if (employee.user.companyId) {
        console.log(`Updating employee ${employee.id} (${employee.user.email}) with companyId: ${employee.user.companyId}`);
        
        await prisma.employee.update({
          where: { id: employee.id },
          data: { companyId: employee.user.companyId }
        });
      } else {
        console.warn(`⚠️  Employee ${employee.id} (${employee.user.email}) has no companyId on user either`);
      }
    }

    console.log('✅ Employee companyId fix completed');
  } catch (error) {
    console.error('❌ Error fixing employee companyIds:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixEmployeeCompanyIds();
