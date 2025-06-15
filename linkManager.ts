import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const managerEmail = 'manager@test.com';     // ✅ Replace with your actual manager email
  const employeeEmail = 'employee@test.com';    // ✅ Replace with your actual employee email

  const manager = await prisma.user.findUnique({ where: { email: managerEmail } });
  const employee = await prisma.user.findUnique({ where: { email: employeeEmail } });

  if (!manager || !employee) {
    console.error('❌ Manager or employee not found. Check the emails.');
    return;
  }

  await prisma.user.update({
    where: { id: employee.id },
    data: { managerId: manager.id },
  });

  console.log(`✅ Linked ${employee.email} to manager ${manager.email}`);
}

main()
  .catch(e => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
