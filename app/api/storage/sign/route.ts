import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import supabase from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const path = searchParams.get("path");
  if (!path) {
    return NextResponse.json({ error: "Missing path" }, { status: 400 });
  }

  try {
    const document = await prisma.document.findFirst({
      where: { path },
      select: { id: true, companyId: true, path: true },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    if (document.companyId !== session.user.companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const tenantPrefix = `${session.user.companyId}/`;
    if (document.path.includes("/") && document.path.startsWith(tenantPrefix)) {
      if (!path.startsWith(tenantPrefix)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const { data, error } = await supabase.storage
      .from("documents")
      .createSignedUrl(document.path, 60 * 5);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ url: data?.signedUrl ?? null });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Failed to sign URL" },
      { status: 500 },
    );
  }
}
