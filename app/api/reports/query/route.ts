import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { buildDynamicQuery } from "@/lib/queryBuilder";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { model, selectedFields, filters, pagination, sort } = await req.json();
    const data = await buildDynamicQuery({ model, selectedFields, filters, pagination, sort });
    return NextResponse.json({ data });
  } catch (error) {
    console.error("Query error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
