import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import supabase from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const objectPath = `news-covers/${session.user.companyId || "company"}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(objectPath, buffer, { upsert: false, contentType: file.type });
    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 400 });
    }

    // Return a short-lived signed URL for immediate preview
    const { data: signed, error: signErr } = await supabase.storage
      .from("documents")
      .createSignedUrl(objectPath, 60 * 10);
    if (signErr) {
      return NextResponse.json({ error: signErr.message }, { status: 400 });
    }

    return NextResponse.json({
      path: objectPath,
      url: signed?.signedUrl || null,
      name: file.name,
      size: file.size,
      type: file.type || "application/octet-stream",
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}


