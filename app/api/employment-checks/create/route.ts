export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import supabase from "@/lib/supabase-admin";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();

  const typeOfCheck = formData.get("typeOfCheck") as string;
  const documentNumber = formData.get("documentNumber") as string;
  const dateOfIssue = formData.get("dateOfIssue") as string;
  const expiryDate = formData.get("expiryDate") as string;
  const employeeId = formData.get("employeeId") as string;
  const file = formData.get("file") as File | null;

  let documentUrl: string | null = null;
  let documentName: string | null = null;
  let documentSize: number | null = null;
  let documentType: string | null = null;
  let documentPath: string | null = null;

  try {
    if (file) {
      const fileExt = file.name.split(".").pop();
      const fileName = `${randomUUID()}.${fileExt}`;

      // ✅ Convert to Buffer to avoid duplex issues
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const { data, error } = await supabase.storage
        .from("documents")
        .upload(fileName, buffer, {
          contentType: file.type,
        });

      if (error) {
        console.error(error);
        return NextResponse.json({ error: "Upload failed" }, { status: 500 });
      }

      const { data: urlData } = supabase.storage.from("documents").getPublicUrl(data.path);
      documentUrl = urlData.publicUrl;
      documentName = file.name;
      documentSize = file.size;
      documentType = file.type;
      documentPath = data.path;
    }

    const employmentCheck = await prisma.employmentCheck.create({
      data: {
        typeOfCheck,
        documentNumber,
        dateOfIssue: new Date(dateOfIssue),
        expiryDate: new Date(expiryDate),
        employeeId,
        documentUrl,
      },
    });

    // ✅ Also create Document record for /documents view
    if (documentUrl && documentName && documentPath) {
      await prisma.document.create({
        data: {
          name: documentName,
          path: documentPath,
          url: documentUrl,
          size: documentSize ?? 0,
          type: documentType ?? "",
          category: "Employment Checks",
          employeeId,
          uploaderId: session.user.id,
          companyId: session.user.companyId ?? undefined,
        },
      });
    }

    return NextResponse.json(employmentCheck);
  } catch (error) {
    console.error("Employment Check creation error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
