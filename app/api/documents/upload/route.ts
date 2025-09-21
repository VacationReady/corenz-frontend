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

const jsonArrayFromForm = z.preprocess(
  (val) => {
    if (typeof val === "string") {
      const trimmed = val.trim();
      if (!trimmed) {
        return [];
      }
      try {
        return JSON.parse(trimmed);
      } catch {
        return trimmed;
      }
    }
    if (Array.isArray(val)) {
      return val;
    }
    if (val === null || val === undefined) {
      return [];
    }
    return val;
  },
  z.array(z.string()),
);

const documentUploadSchema = z.object({
  file: z.instanceof(File, { message: "File is required" }),
  name: z
    .string({ required_error: "Document name is required" })
    .trim()
    .min(1, "Document name is required"),
  category: optionalStringFromForm,
  employeeId: optionalStringFromForm,
  type: z
    .preprocess((val) => {
      if (typeof val === "string") {
        const trimmed = val.trim();
        return trimmed === "" ? undefined : trimmed;
      }
      return undefined;
    }, z.enum(["employee", "company"]).optional()),
  canViewAdmin: booleanFromForm(true),
  canViewManager: booleanFromForm(true),
  canViewEmployee: booleanFromForm(true),
  requiresAck: booleanFromForm(false),
  requireAckFromNewStarters: booleanFromForm(false),
  departments: jsonArrayFromForm,
  jobRoles: jsonArrayFromForm,
  requiresSignature: booleanFromForm(false),
  signatureDueAt: z
    .preprocess((val) => {
      if (typeof val === "string") {
        const t = val.trim();
        if (!t) return undefined;
        const dt = new Date(t);
        return isNaN(dt.getTime()) ? undefined : dt;
      }
      return undefined;
    }, z.date().optional()),
  signerDepartments: jsonArrayFromForm,
  signerJobRoles: jsonArrayFromForm,
  signerEmployees: jsonArrayFromForm,
  deferNotifications: booleanFromForm(false),
});

export async function POST(req: Request) {
  console.log("DOC UPLOAD API HIT:", new Date().toISOString());

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
      type,
      canViewAdmin,
      canViewManager,
      canViewEmployee,
      requiresAck,
      requireAckFromNewStarters,
      departments,
      jobRoles,
      requiresSignature,
      signatureDueAt,
      signerDepartments,
      signerJobRoles,
      signerEmployees,
      deferNotifications,
    } = documentUploadSchema.parse({
      file: formData.get("file"),
      name: formData.get("name"),
      category: formData.get("category"),
      employeeId: formData.get("employeeId"),
      type: formData.get("type"),
      canViewAdmin: formData.get("canViewAdmin"),
      canViewManager: formData.get("canViewManager"),
      canViewEmployee: formData.get("canViewEmployee"),
      requiresAck: formData.get("requiresAck"),
      requireAckFromNewStarters: formData.get("requireAckFromNewStarters"),
      departments: formData.get("departments"),
      jobRoles: formData.get("jobRoles"),
      requiresSignature: formData.get("requiresSignature"),
      signatureDueAt: formData.get("signatureDueAt"),
      signerDepartments: formData.get("signerDepartments"),
      signerJobRoles: formData.get("signerJobRoles"),
      signerEmployees: formData.get("signerEmployees"),
      deferNotifications: formData.get("deferNotifications"),
    });

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = `${Date.now()}-${file.name}`;

    // ✅ Upload to Supabase
    const { data, error } = await supabase.storage
      .from("documents")
      .upload(fileName, buffer);
    if (error) {
      console.error("Supabase upload error:", error);
      return NextResponse.json(
        { error: "Supabase upload failed" },
        { status: 500 },
      );
    }

    const { data: signedUrlData, error: signErr } = await supabase.storage
      .from("documents")
      .createSignedUrl(data.path, 60 * 5);
    if (signErr) {
      return NextResponse.json(
        { error: signErr.message },
        { status: 500 },
      );
    }

    const fileUrl = signedUrlData?.signedUrl ?? null;

    // ✅ Save document in DB
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
        employeeId: type === "employee" && employeeId ? employeeId : null,
        canViewAdmin,
        canViewManager,
        canViewEmployee,
        requiresAck, // ✅ Persist toggle!
        requireAckFromNewStarters, // ✅ Persist new field!
        requiresSignature,
        signatureDueAt: signatureDueAt ?? null,
        ...(departments.length > 0 && departments[0] !== "all"
          ? {
              Department: {
                connect: departments.map((d) => ({ id: d })),
              },
            }
          : {}),
        ...(jobRoles.length > 0 && jobRoles[0] !== "all"
          ? { JobRole: { connect: jobRoles.map((j) => ({ id: j })) } }
          : {}),
      },
      include: {
        Department: true,
        JobRole: true,
      },
    });

    // --- BEGIN: Persist signature scopes if enabled ---
    if (requiresSignature) {
      if (Array.isArray(signerEmployees) && signerEmployees.length > 0) {
        await prisma.documentSignatureEmployee.createMany({
          data: signerEmployees.map((empId: string) => ({
            documentId: document.id,
            employeeId: empId,
            dueAt: signatureDueAt ?? null,
          })),
          skipDuplicates: true,
        });
      }
      if (Array.isArray(signerDepartments) && signerDepartments.length > 0) {
        await prisma.documentSignatureDepartment.createMany({
          data: signerDepartments.map((deptId: string) => ({
            documentId: document.id,
            departmentId: deptId,
          })),
          skipDuplicates: true,
        });
      }
      if (Array.isArray(signerJobRoles) && signerJobRoles.length > 0) {
        await prisma.documentSignatureJobRole.createMany({
          data: signerJobRoles.map((roleId: string) => ({
            documentId: document.id,
            jobRoleId: roleId,
          })),
          skipDuplicates: true,
        });
      }
    }
    // --- END: Persist signature scopes if enabled ---

    // --- BEGIN: Send Resend email for employee docs with requiresAck/Signature ---
    if (!deferNotifications && (requiresAck || requiresSignature) && document.employeeId) {
      const employee = await prisma.employee.findFirst({
        where: { id: document.employeeId, companyId: document.companyId },
        select: { userId: true },
      });
      console.log("Employee found:", employee);

      if (employee?.userId) {
        const user = await prisma.user.findFirst({
          where: { id: employee.userId, companyId: document.companyId },
          select: { email: true, name: true },
        });
        console.log("User found for notification:", user);

        if (user?.email) {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL;
          const docLink = `${baseUrl}/employees/${document.employeeId}/documents?open=${document.id}`;
          const resendRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "noreply@peoplecore.co.nz",
              to: user.email,
              subject: requiresSignature
                ? "New Document Requires Your Signature"
                : "New Document Requires Your Acknowledgement",
              html: `
                <p>Hi ${user.name || "there"},</p>
                <p>A new document <b>${document.name}</b> (${document.category || "General"}) has been uploaded and requires your ${requiresSignature ? "signature" : "acknowledgement"}.</p>
                <p>${signatureDueAt ? `Due by: <b>${new Date(signatureDueAt).toLocaleString()}</b><br/>` : ""}<a href="${docLink}">View ${requiresSignature ? "& Sign" : "& Acknowledge"} Document</a></p>
                <p>Thank you,<br/>HR Team</p>
              `,
            }),
          });
          const resendJson = await resendRes.json();
          console.log("Resend API response:", resendJson);
        }
      }
    }
    // --- END: Send Resend email for employee docs with requiresAck ---

    // --- BEGIN: Send Resend emails for company docs with requiresAck/Signature ---
    if (
      !deferNotifications &&
      (requiresAck || requiresSignature) &&
      !document.employeeId // Company doc (not employee-specific)
    ) {
      const departmentIds = document.Department.map((d) => d.id);
      const jobRoleIds = document.JobRole.map((j) => j.id);

      let employees: { id: string; userId: string }[] = [];
      if (
        (!departmentIds || departmentIds.length === 0) &&
        (!jobRoleIds || jobRoleIds.length === 0)
      ) {
        employees = await prisma.employee.findMany({
          where: {
            isActive: true,
            User: { companyId: document.companyId },
          },
          select: { id: true, userId: true },
        });
      } else {
        employees = await prisma.employee.findMany({
          where: {
            isActive: true,
            User: { companyId: document.companyId },
            OR: [
              departmentIds && departmentIds.length > 0
                ? { departmentId: { in: departmentIds } }
                : undefined,
              jobRoleIds && jobRoleIds.length > 0
                ? { jobRoleId: { in: jobRoleIds } }
                : undefined,
            ].filter(Boolean) as any,
          },
          select: { id: true, userId: true },
        });
      }
      console.log(
        "Company doc notification: Employees in scope:",
        employees.length,
      );

      const users = await prisma.user.findMany({
        where: {
          id: { in: employees.map((e) => e.userId) },
          email: { not: "" },
          companyId: document.companyId,
        },
        select: { id: true, email: true, name: true },
      });

      const chunkSize = 50;
      for (let i = 0; i < users.length; i += chunkSize) {
        const chunk = users.slice(i, i + chunkSize);
        await Promise.all(
          chunk.map(async (user) => {
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL;
            const docLink = `${baseUrl}/documents?open=${document.id}`;
            const resendRes = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                from: "noreply@peoplecore.co.nz",
                to: user.email,
                subject: requiresSignature
                  ? "New Document Requires Your Signature"
                  : "New Document Requires Your Acknowledgement",
                html: `
                  <p>Hi ${user.name || "there"},</p>
                  <p>A new document <b>${document.name}</b> (${document.category || "General"}) has been uploaded and requires your ${requiresSignature ? "signature" : "acknowledgement"}.</p>
                  <p>${signatureDueAt ? `Due by: <b>${new Date(signatureDueAt).toLocaleString()}</b><br/>` : ""}<a href="${docLink}">View ${requiresSignature ? "& Sign" : "& Acknowledge"} Document</a></p>
                  <p>Thank you,<br/>HR Team</p>
                `,
              }),
            });
            const resendJson = await resendRes.json();
            console.log(
              `Resend API response for user ${user.email}:`,
              resendJson,
            );
          }),
        );
      }
    }
    // --- END: Send Resend emails for company docs with requiresAck/Signature ---

    console.log("✅ Document uploaded:", document);
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
  } catch (error) {
    console.error("❌ Document upload error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid form data", details: error.flatten() },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

