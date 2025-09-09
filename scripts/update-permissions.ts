import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updatePermissions() {
  console.log('🔄 Updating permission profiles with employee detail screens...\n');

  try {
    // Get the company
    const company = await prisma.company.findFirst();
    if (!company) {
      console.log('❌ No company found');
      return;
    }

    // Update Admin profile
    const adminProfile = await prisma.permissionProfile.findFirst({
      where: { companyId: company.id, name: 'Admin' },
    });

    if (adminProfile) {
      const updatedAdminPermissions = {
        'dashboard': ['read'],
        'approvals': ['read', 'edit'],
        'employees': ['read', 'edit', 'delete'],
        'calendar': ['read', 'edit', 'delete'],
        'documents': ['read', 'edit', 'delete'],
        'reports': ['read', 'edit', 'delete'],
        'org-chart': ['read'],
        'news': ['read', 'edit', 'delete'],
        'settings': ['read', 'edit', 'delete'],
        'onboarding': ['read', 'edit', 'delete'],
        'offboarding': ['read', 'edit', 'delete'],
        'forms': ['read', 'edit', 'delete'],
        'leave-requests': ['read', 'edit', 'delete'],
        'working-patterns': ['read', 'edit', 'delete'],
        'departments': ['read', 'edit', 'delete'],
        'job-roles': ['read', 'edit', 'delete'],
        'permissions': ['read', 'edit', 'delete'],
        // Employee detail screens
        'employee-overview': ['read', 'edit'],
        'employee-documents': ['read', 'edit', 'delete'],
        'employee-driver-licenses': ['read', 'edit', 'delete'],
        'employee-employment-checks': ['read', 'edit', 'delete'],
        'employee-forms': ['read', 'edit', 'delete'],
        'employee-leave': ['read', 'edit'],
        'employee-offboarding': ['read', 'edit'],
        'employee-onboarding': ['read', 'edit', 'delete'],
        'employee-performance': ['read', 'edit'],
        'employee-settings': ['read', 'edit'],
        'employee-training': ['read', 'edit', 'delete'],
      };

      await prisma.permissionProfile.update({
        where: { id: adminProfile.id },
        data: { permissions: JSON.stringify(updatedAdminPermissions) },
      });
      console.log('✅ Updated Admin permissions with employee detail screens');
    }

    // Update Manager profile
    const managerProfile = await prisma.permissionProfile.findFirst({
      where: { companyId: company.id, name: 'Manager' },
    });

    if (managerProfile) {
      const updatedManagerPermissions = {
        'dashboard': ['read'],
        'employees': ['read', 'edit'],
        'calendar': ['read', 'edit'],
        'documents': ['read', 'edit'],
        'reports': ['read'],
        'org-chart': ['read'],
        'news': ['read'],
        'leave-requests': ['read', 'edit'],
        'working-patterns': ['read'],
        'onboarding': ['read'],
        'offboarding': ['read'],
        // Employee detail screens - Managers can view and edit most employee details
        'employee-overview': ['read', 'edit'],
        'employee-documents': ['read', 'edit'],
        'employee-driver-licenses': ['read', 'edit'],
        'employee-employment-checks': ['read', 'edit'],
        'employee-forms': ['read', 'edit'],
        'employee-leave': ['read', 'edit'],
        'employee-offboarding': ['read'],
        'employee-onboarding': ['read', 'edit'],
        'employee-performance': ['read', 'edit'],
        'employee-settings': ['read'],
        'employee-training': ['read', 'edit'],
      };

      await prisma.permissionProfile.update({
        where: { id: managerProfile.id },
        data: { permissions: JSON.stringify(updatedManagerPermissions) },
      });
      console.log('✅ Updated Manager permissions with employee detail screens');
    }

    // Update Employee profile
    const employeeProfile = await prisma.permissionProfile.findFirst({
      where: { companyId: company.id, name: 'Employee' },
    });

    if (employeeProfile) {
      const updatedEmployeePermissions = {
        'dashboard': ['read'],
        'calendar': ['read'],
        'documents': ['read'],
        'news': ['read'],
        'leave-requests': ['read', 'edit'],
        'onboarding': ['read'],
        // Employee detail screens - Employees can only view their own details
        'employee-overview': ['read'],
        'employee-documents': ['read'],
        'employee-forms': ['read'],
        'employee-leave': ['read', 'edit'],
        'employee-training': ['read'],
      };

      await prisma.permissionProfile.update({
        where: { id: employeeProfile.id },
        data: { permissions: JSON.stringify(updatedEmployeePermissions) },
      });
      console.log('✅ Updated Employee permissions with employee detail screens');
    }

    // Update user assignments
    console.log('\n🔄 Updating user permission profile assignments...');

    const users = await prisma.user.findMany();
    for (const user of users) {
      let targetProfile = null;
      if (user.role === 'ADMIN') {
        targetProfile = adminProfile;
      } else if (user.role === 'MANAGER') {
        targetProfile = managerProfile;
      } else {
        targetProfile = employeeProfile;
      }

      if (targetProfile) {
        await prisma.user.update({
          where: { id: user.id },
          data: { permissionProfileId: targetProfile.id },
        });
        console.log(`✅ Updated ${user.email} to use ${targetProfile.name} profile`);
      }
    }

    console.log('\n🎉 Permission profiles updated successfully!');

  } catch (error) {
    console.error('❌ Error updating permissions:', error);
  }
}

updatePermissions()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
