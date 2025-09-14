export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import supabase from "@/lib/supabase-admin";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { randomUUID } from "crypto";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();

  const typeOfCheck = formData.get("typeOfCheck") as string;
  const documentNumber = formData.get("documentNumber") as string;
  const dateOfIssue = formData.get("dateOfIssue") as string;
  const expiryDate = formData.get("expiryDate") as string;
  const file = formData.get("file") as File | null;

  let documentUrl: string | undefined = undefined;
  let signedUrl: string | undefined = undefined;

  if (file) {
    const fileExt = file.name.split(".").pop();
    const fileName = `${randomUUID()}.${fileExt}`;
    const { data, error } = await supabase.storage
      .from("documents")
      .upload(fileName, file.stream(), {
        contentType: file.type,
      });
    if (error) {
      console.error(error);
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }
    documentUrl = data.path;
    const { data: signed } = await supabase.storage
      .from("documents")
      .createSignedUrl(data.path, 60 * 5);
    signedUrl = signed?.signedUrl;
  }

  const updated = await prisma.employmentCheck.update({
    where: { id: params.id },
    data: {
      typeOfCheck,
      documentNumber,
      dateOfIssue: new Date(dateOfIssue),
      expiryDate: new Date(expiryDate),
      ...(documentUrl && { documentUrl }),
    },
  });

  if (!signedUrl && updated.documentUrl) {
    const { data: signedExisting } = await supabase.storage
      .from("documents")
      .createSignedUrl(updated.documentUrl, 60 * 5);
    signedUrl = signedExisting?.signedUrl;
  }

  return NextResponse.json({ ...updated, documentUrl: signedUrl ?? null });
}
