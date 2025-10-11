import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    // Find the switch token
    const switchToken = await prisma.tenantSwitchToken.findUnique({
      where: { token },
      include: {
        User: {
          select: {
            id: true,
            email: true,
            companyId: true,
          },
        },
        Company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!switchToken) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 404 }
      );
    }

    // Check if token is expired
    if (new Date() > switchToken.expiresAt) {
      await prisma.tenantSwitchToken.delete({
        where: { id: switchToken.id },
      });
      return NextResponse.json(
        { error: "Token has expired" },
        { status: 410 }
      );
    }

    // Check if token was already used
    if (switchToken.used) {
      return NextResponse.json(
        { error: "Token has already been used" },
        { status: 410 }
      );
    }

    // Mark token as used
    await prisma.tenantSwitchToken.update({
      where: { id: switchToken.id },
      data: { used: true },
    });

    // Generate a temporary password hash that the user can authenticate with
    const tempPassword = `temp_${token.substring(0, 16)}`;
    const tempPasswordHash = await bcrypt.hash(tempPassword, 10);

    // Update user's password temporarily (will be used once for login)
    await prisma.user.update({
      where: { id: switchToken.User.id },
      data: { password: tempPasswordHash },
    });

    return NextResponse.json({
      email: switchToken.User.email,
      tempPassword,
      companyId: switchToken.Company.id,
      companyName: switchToken.Company.name,
    });
  } catch (error) {
    console.error("Process switch error:", error);
    return NextResponse.json(
      { error: "Failed to process switch" },
      { status: 500 }
    );
  }
}
