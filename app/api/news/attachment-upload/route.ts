import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import supabase from "@/lib/supabase-admin";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const companyId = session?.user?.companyId;
    if (!session?.user?.id || !companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]+/g, "_");
    const objectPath = `news-attachments/${companyId}/${Date.now()}-${randomUUID()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(objectPath, buffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 400 });
    }

    const { data: signed, error: signedError } = await supabase.storage
      .from("documents")
      .createSignedUrl(objectPath, 60 * 10);

    if (signedError) {
      return NextResponse.json({ error: signedError.message }, { status: 400 });
    }

    return NextResponse.json({
      path: objectPath,
      url: signed?.signedUrl ?? null,
      name: file.name,
      size: file.size,
      type: file.type || "application/octet-stream",
    });
  } catch (error) {
    console.error("Attachment upload error", error);
    return NextResponse.json({ error: "Failed to upload attachment" }, { status: 500 });
  }
}
