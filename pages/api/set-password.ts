// pages/api/set-password.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ error: 'Token and password are required.' });
  }

  try {
    // 1. Find activation token and employee
    const activationToken = await prisma.activationToken.findUnique({
      where: { token },
      include: { employee: true },
    });

    if (!activationToken || !activationToken.employee) {
      return res.status(400).json({ error: 'Invalid or expired token.' });
    }

    const employee = activationToken.employee;

    // 2. Check if already activated
    if (employee.isActivated) {
      return res.status(400).json({ error: 'Account already activated.' });
    }

    // 3. Create a new User
    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: {
        email: employee.email,
        password: hashedPassword,
        firstName: employee.firstName,
        lastName: employee.lastName,
        phone: employee.phone,
        department: employee.department,
        jobRole: employee.jobRole,
        role: employee.role, // Should already be EMPLOYEE or similar
        isActivated: true,
      },
    });

    // 4. Update employee record
    await prisma.employee.update({
      where: { id: employee.id },
      data: {
        isActivated: true,
        isActive: true,
        password: hashedPassword,
      },
    });

    // 5. Optionally, delete the token to prevent reuse
    await prisma.activationToken.delete({
      where: { token },
    });

    return res.status(200).json({ message: 'Account activated successfully' });
  } catch (error) {
    console.error('Activation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
