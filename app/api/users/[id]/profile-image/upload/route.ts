import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import supabase from "@/lib/supabase-admin";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: userId } = await context.params;
    if (session.user.companyId) {
      const target = await prisma.user.findFirst({
        where: { id: userId, companyId: session.user.companyId },
        select: { id: true },
      });
      if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (session.user.id !== userId && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file)
      return NextResponse.json({ error: "File is required" }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const objectPath = `avatars/${userId}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(objectPath, buffer, { upsert: true, contentType: file.type });
    if (uploadError)
      return NextResponse.json({ error: uploadError.message }, { status: 400 });

    await prisma.user.update({
      where: { id: userId },
      data: { profileImageUrl: objectPath },
    });

    // Return a short-lived signed URL for immediate display
    let signedUrl: string | null = null;
    try {
      const { data: signed } = await supabase.storage
        .from("documents")
        .createSignedUrl(objectPath, 60 * 5);
      signedUrl = signed?.signedUrl ?? null;
    } catch (_) {
      signedUrl = null;
    }

    return NextResponse.json({ path: objectPath, url: signedUrl });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 },
    );
  }
}
