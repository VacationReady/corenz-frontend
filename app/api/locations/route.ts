import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const items = await prisma.location.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(items);
}


