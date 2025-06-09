import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

console.log("🟣 Top-level route file loaded."); // Confirms file loads

export async function GET() {
  console.log("🟢 GET /api/activate route hit.");
  return NextResponse.json({ message: "Activate route is live." });
}

export async function POST(req: Request) {
  console.log("🟡 Activation route HIT");

  let body;

  try {
    body = await req.json();
  } catch (err) {
    console.error("🔴 Failed to parse JSON body", err);
    return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
  }

  console.log("🟡 Step 1: Received body", body);

  try {
    const { token, password } = body;

    if (!token || !password) {
      console.error("🔴 Step 2: Missing token or password");
      return NextResponse.json({ error: 'Missing token or password' }, { status: 400 });
    }

    console.log("🟡 Step 3: Finding activation token...");
    const activation = await prisma.activationToken.findUnique({
      where: { token },
      include: { employee: true },
    });

    if (!activation) {
      console.error("🔴 Step 4: Invalid or expired token");
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
    }

    console.log("🟢 Step 5: Token found. Hashing password...");

    let hashedPassword;
    try {
      hashedPassword = await bcrypt.hash(password, 10);
    } catch (err) {
      console.error("🔴 Step 6: Bcrypt hash failed", err);
      return NextResponse.json({ error: 'Password hashing failed' }, { status: 500 });
    }

    console.log("🟢 Step 7: Password hashed. Updating employee...");

    try {
      await prisma.employee.update({
        where: { id: activation.employeeId },
        data: {
          password: hashedPassword,
          isActive: true,
        },
      });
    } catch (err) {
      console.error("🔴 Step 8: Employee update failed", err);
      return NextResponse.json({ error: 'Employee update failed' }, { status: 500 });
    }

    console.log("🟢 Step 9: Deleting activation token...");
    try {
      await prisma.activationToken.delete({
        where: { token },
      });
    } catch (err) {
      console.error("🔴 Step 10: Token deletion failed", err);
      return NextResponse.json({ error: 'Token deletion failed' }, { status: 500 });
    }

    console.log("✅ Step 11: Activation complete.");
    return NextResponse.json({ message: 'Account activated' });
  } catch (error: any) {
    console.error("🔴 Step 12: Unknown activation error", error);

    const fallback =
      error?.message ||
      error?.toString?.() ||
      JSON.stringify(error, Object.getOwnPropertyNames(error)) ||
      'Unknown error';

    return NextResponse.json({ error: fallback }, { status: 500 });
  }
}
