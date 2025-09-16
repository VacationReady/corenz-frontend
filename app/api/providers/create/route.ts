import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { name } = await req.json();

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const provider = await prisma.trainingProvider.create({
      data: {
        id: `provider_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name
      },
    });

    return NextResponse.json(provider);
  } catch (error) {
    console.error("Error creating provider:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

