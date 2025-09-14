import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import supabase from "@/lib/supabase-admin";

export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: { profileImageUrl: true },
    });

    if (!user?.profileImageUrl) {
      return NextResponse.json({ url: null });
    }

    const { data: signed, error: signErr } = await supabase.storage
      .from("documents")
      .createSignedUrl(user.profileImageUrl, 60 * 5);
    if (signErr) {
      return NextResponse.json({ error: signErr.message }, { status: 500 });
    }

    return NextResponse.json({ url: signed?.signedUrl ?? null });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = params.id;
    const body = await req.json();
    const path: string | undefined =
      typeof body?.path === "string" ? body.path : undefined;

    if (!path) {
      return NextResponse.json(
        { error: "Invalid path" },
        { status: 400 },
      );
    }

    // Allow self-update or admin
    if (session.user.id !== userId && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { profileImageUrl: path },
      select: { id: true, profileImageUrl: true },
    });

    return NextResponse.json({ id: updated.id, path: updated.profileImageUrl });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 },
    );
  }
}
