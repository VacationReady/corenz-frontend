import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import supabase from "@/lib/supabase-admin";

export async function GET(
  req: NextRequest,
  context: { params: { id: string } },
) {
  const { id } = context.params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const doc = await prisma.document.findFirst({
    where: { id, companyId: session.user.companyId },
    select: { path: true },
  });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { data } = await supabase.storage
    .from("documents")
    .createSignedUrl(doc.path, 60 * 5);
  return NextResponse.json({ url: data?.signedUrl || null });
}


