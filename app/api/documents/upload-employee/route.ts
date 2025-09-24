import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import supabase from "@/lib/supabase-admin";
import { z } from "zod";

const optionalStringFromForm = z.preprocess(
  (val) => {
    if (val === null || val === undefined) {
      return undefined;
    }
    if (typeof val === "string") {
      const trimmed = val.trim();
      return trimmed === "" ? undefined : trimmed;
    }
    return val;
  },
  z.string().optional(),
);

const booleanFromForm = (defaultValue: boolean) =>
  z
    .union([z.string(), z.boolean(), z.null(), z.undefined()])
    .transform((val) => {
      if (val === null || val === undefined || val === "") {
        return defaultValue;
      }
      if (typeof val === "boolean") {
        return val;
      }
      if (typeof val === "string") {
        const normalized = val.trim().toLowerCase();
        if (normalized === "true") return true;
        if (normalized === "false") return false;
      }
      return defaultValue;
    });

const employeeUploadSchema = z.object({
  file: z.instanceof(File, { message: "File is required" }),
  name: z.string({ required_error: "Document name is required" }).trim().min(1),
  category: optionalStringFromForm,
  employeeId: z
    .preprocess((val) => (typeof val === "string" ? val.trim() : val), z.string())
    .refine((v) => !!v && v.length > 0, { message: "employeeId is required" }),
  canViewAdmin: booleanFromForm(true),
  canViewManager: booleanFromForm(true),
  canViewEmployee: booleanFromForm(true),
  requiresAck: booleanFromForm(false),
  requiresSignature: booleanFromForm(false),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();

  try {
    const {
      file,
      name,
      category,
      employeeId,
      canViewAdmin,
      canViewManager,
      canViewEmployee,
      requiresAck,
      requiresSignature,
    } = employeeUploadSchema.parse({
      file: formData.get("file"),
      name: formData.get("name"),
      category: formData.get("category"),
      employeeId: formData.get("employeeId"),
      canViewAdmin: formData.get("canViewAdmin"),
      canViewManager: formData.get("canViewManager"),
      canViewEmployee: formData.get("canViewEmployee"),
      requiresAck: formData.get("requiresAck"),
      requiresSignature: formData.get("requiresSignature"),
    });

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = `${Date.now()}-${file.name}`;

    const { data, error } = await supabase.storage
      .from("documents")
      .upload(fileName, buffer);
    if (error) {
      return NextResponse.json({ error: "Supabase upload failed" }, { status: 500 });
    }

    const { data: signedUrlData, error: signErr } = await supabase.storage
      .from("documents")
      .createSignedUrl(data.path, 60 * 5);
    if (signErr) {
      return NextResponse.json({ error: signErr.message }, { status: 500 });
    }

    const fileUrl = signedUrlData?.signedUrl ?? null;

    const document = await prisma.document.create({
      data: {
        id: crypto.randomUUID(),
        name,
        category: category ?? null,
        path: data.path,
        size: file.size,
        type: file.type,
        url: data.path,
        uploaderId: session.user.id,
        companyId: session.user.companyId,
        employeeId,
        canViewAdmin,
        canViewManager,
        canViewEmployee,
        requiresAck,
        requiresSignature,
      },
    });

    // Return both keys for compatibility with existing clients
    const payload = {
      id: document.id,
      url: fileUrl,
      name: document.name,
      category: document.category,
      size: document.size,
      type: document.type,
      createdAt: document.createdAt,
    };

    return NextResponse.json({ Document: payload, document: payload });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid form data", details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import supabase from "@/lib/supabase-admin";
import { randomUUID } from "crypto";
import { resend } from "@/lib/resend";
import { getAppBaseUrl } from "@/lib/email/template";
import { buildDocumentNotificationEmail } from "@/lib/email/documentNotifications";

export const runtime = "nodejs"; // Ensure Node runtime for FormData upload

export async function POST(req: NextRequest) {
  console.log("DOC UPLOAD EMPLOYEE API HIT:", new Date().toISOString());

  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const name = formData.get("name") as string;
  const category = formData.get("category") as string;
  const employeeId = formData.get("employeeId") as string;
  let companyId = session.user.companyId as string | undefined;
  let uploaderId = session.user.id as string | undefined;

  // ✅ Access control flags
  const canViewAdmin = formData.get("canViewAdmin") === "true";
  const canViewManager = formData.get("canViewManager") === "true";
  const canViewEmployee = formData.get("canViewEmployee") === "true";

  // ✅ Requires Acknowledgement toggle
  const requiresAck = formData.get("requiresAck") === "true";
  const requiresSignature = formData.get("requiresSignature") === "true";
  const signatureDueAtStr = (formData.get("signatureDueAt") as string) || "";
  const signatureDueAt = signatureDueAtStr ? new Date(signatureDueAtStr) : undefined;

  if (!file || !name || !category || !employeeId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Ensure uploader exists; if not, fallback to employee's userId
  const employeeForContext = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: {
      userId: true,
      companyId: true,
      User: { select: { companyId: true } },
    },
  });
  if (!employeeForContext) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }
  if (!uploaderId) {
    uploaderId = employeeForContext.userId || undefined;
  } else {
    const uploaderExists = await prisma.user.findUnique({
      where: { id: uploaderId },
    });
    if (!uploaderExists) {
      uploaderId = employeeForContext.userId || undefined;
    }
  }
  if (!uploaderId) {
    return NextResponse.json(
      { error: "No valid uploader user found" },
      { status: 400 },
    );
  }
  // Ensure companyId present (session -> employee -> employee.user)
  if (!companyId) companyId = employeeForContext.companyId || undefined;
  if (!companyId) companyId = employeeForContext.User?.companyId || undefined;
  if (!companyId)
    return NextResponse.json(
      { error: "Missing company context" },
      { status: 400 },
    );

  // Validate company exists to avoid FK violation
  const companyExists = await prisma.company.findUnique({
    where: { id: companyId },
  });
  if (!companyExists) {
    return NextResponse.json(
      { error: "Invalid company context" },
      { status: 400 },
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const path = `${companyId}/${employeeId}/${randomUUID()}-${file.name}`;

  const { data, error: uploadError } = await supabase.storage
    .from("documents")
    .upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error(uploadError);
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: signed, error: signErr } = await supabase.storage
    .from("documents")
    .createSignedUrl(path, 60 * 5);
  if (signErr) {
    return NextResponse.json({ error: signErr.message }, { status: 500 });
  }
  const fileUrl = signed?.signedUrl ?? null;

  // ✅ Create document record in Prisma with access flags
  const document = await prisma.document.create({
    data: {
      id: crypto.randomUUID(),
      name,
      category,
      path,
      url: path,
      size: file.size,
      type: file.type,
      uploaderId: uploaderId,
      companyId: companyId,
      employeeId,
      canViewAdmin,
      canViewManager,
      canViewEmployee,
      requiresAck, // <--- Save the requiresAck flag!
      requiresSignature,
      signatureDueAt: signatureDueAt || null,
    },
  });

  // --- BEGIN: Send Resend email for employee docs with requiresAck/Signature ---
  if ((requiresAck || requiresSignature) && employeeId) {
    // Find the Employee row for this document
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { userId: true },
    });
    console.log("Employee found:", employee);

    // If the Employee has a User linked, notify that user
    if (employee?.userId) {
      const user = await prisma.user.findUnique({
        where: { id: employee.userId },
        select: { email: true, name: true },
      });
      console.log("User found for notification:", user);

      if (user?.email) {
        const baseUrl = getAppBaseUrl();
        const docLink = `${baseUrl}/employees/${employeeId}/documents?open=${document.id}`;
        const { subject, html, text } = buildDocumentNotificationEmail({
          recipientName: user.name,
          documentName: name,
          category,
          docLink,
          requiresSignature,
          signatureDueAt,
        });

        await resend.emails.send({
          from: "noreply@peoplecore.co.nz",
          to: user.email,
          subject,
          html,
          text,
        });
      }
    }
  }
  // --- END: Send Resend email for employee docs with requiresAck/Signature ---

  return NextResponse.json({
    Document: {
      id: document.id,
      url: fileUrl,
      name: document.name,
      category: document.category,
      size: document.size,
      type: document.type,
      createdAt: document.createdAt,
    },
  });
}

