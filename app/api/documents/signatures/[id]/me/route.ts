import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import supabase from "@/lib/supabase-admin";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ signed: false });
    }

    const employee = await prisma.employee.findFirst({
      where: { userId: session.user.id, companyId: session.user.companyId },
      select: { id: true },
    });
    if (!employee) return NextResponse.json({ signed: false });

    const artifact = await prisma.documentSignatureArtifact.findUnique({
      where: {
        documentId_employeeId: { documentId: params.id, employeeId: employee.id },
      },
    });
    if (!artifact) return NextResponse.json({ signed: false });

    let artifactUrl: string | null = null;
    if (artifact.artifactPath) {
      const { data: signed } = await supabase.storage
        .from("documents")
        .createSignedUrl(artifact.artifactPath, 60 * 5);
      artifactUrl = signed?.signedUrl ?? null;
    }

    return NextResponse.json({
      signed: true,
      method: artifact.method,
      typedText: artifact.typedText,
      artifactUrl,
      signedAt: artifact.signedAt,
    });
  } catch (e) {
    console.error("Sign check error:", e);
    return NextResponse.json({ signed: false });
  }
}


