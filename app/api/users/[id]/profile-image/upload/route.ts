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

    await prisma.user.update({
      where: { id: userId },
      data: { profileImageUrl: objectPath },
    });
    return NextResponse.json({ path: objectPath });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 },
    );
  }
}
