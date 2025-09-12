import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import supabase from "@/lib/supabase-admin";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = params.id;
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

    // Try public URL first
    const { data: pub } = supabase.storage
      .from("documents")
      .getPublicUrl(objectPath);
    let url = pub?.publicUrl;

    // If not public, create a long-lived signed URL
    if (!url) {
      const { data: signed, error: signErr } = await supabase.storage
        .from("documents")
        .createSignedUrl(objectPath, 60 * 60 * 24 * 365 * 10); // ~10 years
      if (signErr)
        return NextResponse.json({ error: signErr.message }, { status: 500 });
      url = signed?.signedUrl;
    }

    await prisma.user.update({
      where: { id: userId },
      data: { profileImageUrl: url || null },
    });

    return NextResponse.json({ url });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 },
    );
  }
}
