import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import supabase from "@/lib/supabase-admin";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = params.id;
    const body = await req.json();
    let url: string | undefined = typeof body?.url === "string" ? body.url : undefined;
    const path: string | undefined = typeof body?.path === "string" ? body.path : undefined;

    if (!url && path) {
      const { data } = supabase.storage.from("documents").getPublicUrl(path);
      url = data?.publicUrl;
    }

    if (!url) {
      return NextResponse.json({ error: "Invalid url or path" }, { status: 400 });
    }

    // Allow self-update or admin
    if (session.user.id !== userId && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { profileImageUrl: url },
      select: { id: true, profileImageUrl: true },
    });

    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}


