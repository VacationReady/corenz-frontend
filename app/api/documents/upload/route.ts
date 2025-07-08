import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import supabase from "@/lib/supabase-admin";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const name = formData.get("name") as string;
  const category = formData.get("category") as string;

  if (!file || !name) {
    return NextResponse.json({ error: "File and name are required" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = `${Date.now()}-${file.name}`;

    // Upload to Supabase
    const { data, error } = await supabase.storage
      .from("documents")
      .upload(fileName, buffer);

    if (error) {
      console.error("Supabase upload error:", error);
      return NextResponse.json({ error: "Supabase upload failed" }, { status: 500 });
    }

    // Generate public URL
    const { data: publicUrlData } = supabase.storage
      .from("documents")
      .getPublicUrl(data.path);

    const publicUrl = publicUrlData?.publicUrl;

    if (!publicUrl) {
      return NextResponse.json({ error: "Failed to generate public URL" }, { status: 500 });
    }

    // Create document in Prisma
    const document = await prisma.document.create({
      data: {
        name,
        category: category || null,
        path: data.path,
        size: file.size,
        type: file.type,
        url: publicUrl,
        uploaderId: session.user.id,
        companyId: session.user.companyId,
      },
    });

    // Return the full document object
    return NextResponse.json(document);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
