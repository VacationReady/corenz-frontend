import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const savedReport = await prisma.savedReport.findUnique({
      where: { id: params.id },
    });

    if (!savedReport) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    return NextResponse.json(savedReport);
  } catch (error) {
    console.error("Error fetching saved report:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.savedReport.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: "Deleted successfully" });
  } catch (error) {
    console.error("Error deleting saved report:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
