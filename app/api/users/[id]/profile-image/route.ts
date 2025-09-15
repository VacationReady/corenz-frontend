import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import supabase from "@/lib/supabase-admin";
import { z } from "zod";

const profileImageUpdateSchema = z.object({
  path: z
    .string({ required_error: "path is required" })
    .trim()
    .min(1, "path is required"),
});

export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findFirst({
      where: { id: params.id, companyId: session.user.companyId },
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
    const { path } = profileImageUpdateSchema.parse(await req.json());

    // Allow self-update or admin
    if (session.user.id !== userId && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Ensure target is in same company
    const target = await prisma.user.findFirst({ where: { id: userId, companyId: session.user.companyId }, select: { id: true } });
    if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { profileImageUrl: path },
      select: { id: true, profileImageUrl: true },
    });

    return NextResponse.json({ id: updated.id, path: updated.profileImageUrl });
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: e.flatten() },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 },
    );
  }
}
