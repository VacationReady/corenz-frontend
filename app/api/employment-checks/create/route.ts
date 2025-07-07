import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import supabase from "@/lib/supabase-admin";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();

  const typeOfCheck = formData.get("typeOfCheck") as string;
  const documentNumber = formData.get("documentNumber") as string;
  const dateOfIssue = formData.get("dateOfIssue") as string;
  const expiryDate = formData.get("expiryDate") as string;
  const employeeId = formData.get("employeeId") as string;
  const file = formData.get("file") as File | null;

  let documentUrl: string | null = null;

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
    const { data: urlData } = supabase.storage.from("documents").getPublicUrl(data.path);
    documentUrl = urlData.publicUrl;
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

  return NextResponse.json(employmentCheck);
}
