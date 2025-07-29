import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import supabase from "@/lib/supabase-admin";

export async function POST(req: Request) {
  console.log("DOC UPLOAD API HIT:", new Date().toISOString());

  const session = await getServerSession(authOptions);
  if (!session || !session.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const name = formData.get("name") as string;
  const category = formData.get("category") as string;

  const employeeId = formData.get("employeeId") as string | null;
  const type = formData.get("type") as string | null;

  // ✅ Access control flags default to visible
  const canViewAdmin =
    formData.get("canViewAdmin") === "true" || formData.get("canViewAdmin") === null;
  const canViewManager =
    formData.get("canViewManager") === "true" || formData.get("canViewManager") === null;
  const canViewEmployee =
    formData.get("canViewEmployee") === "true" || formData.get("canViewEmployee") === null;

  // ✅ Requires Acknowledgement toggle
  const requiresAck = formData.get("requiresAck") === "true";

  // ✅ Department & Job Role restrictions
  const rawDepartments = formData.get("departments") as string | null;
  const rawJobRoles = formData.get("jobRoles") as string | null;

  const departments = rawDepartments ? JSON.parse(rawDepartments) : [];
  const jobRoles = rawJobRoles ? JSON.parse(rawJobRoles) : [];

  if (!file || !name) {
    return NextResponse.json({ error: "File and name are required" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = `${Date.now()}-${file.name}`;

    // ✅ Upload to Supabase
    const { data, error } = await supabase.storage.from("documents").upload(fileName, buffer);
    if (error) {
      console.error("Supabase upload error:", error);
      return NextResponse.json({ error: "Supabase upload failed" }, { status: 500 });
    }

    // ✅ Generate public URL
    const { data: publicUrlData } = supabase.storage.from("documents").getPublicUrl(data.path);
    const publicUrl = publicUrlData?.publicUrl;
    if (!publicUrl) {
      return NextResponse.json({ error: "Failed to generate public URL" }, { status: 500 });
    }

    // ✅ Save document in DB
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
        employeeId: type === "employee" && employeeId ? employeeId : null,
        canViewAdmin: canViewAdmin ?? true,
        canViewManager: canViewManager ?? true,
        canViewEmployee: canViewEmployee ?? true,
        requiresAck, // ✅ Persist toggle!
        ...(departments.length > 0 && departments[0] !== "all"
          ? { departments: { connect: departments.map((d: string) => ({ id: d })) } }
          : {}),
        ...(jobRoles.length > 0 && jobRoles[0] !== "all"
          ? { jobRoles: { connect: jobRoles.map((j: string) => ({ id: j })) } }
          : {}),
      },
      include: {
        departments: true,
        jobRoles: true,
      },
    });

    // --- BEGIN: Send Resend email for employee docs with requiresAck ---
    if (requiresAck && document.employeeId) {
      // Find the Employee row for this document
      const employee = await prisma.employee.findUnique({
        where: { id: document.employeeId },
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
          const docLink = `${process.env.NEXT_PUBLIC_BASE_URL}/employees/${document.employeeId}/documents`;
          const resendRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'onboarding@resend.dev',
              to: user.email,
              subject: 'New Document Requires Your Acknowledgement',
              html: `
                <p>Hi ${user.name || 'there'},</p>
                <p>A new document <b>${document.name}</b> (${document.category || 'General'}) has been uploaded and requires your acknowledgement.</p>
                <p><a href="${docLink}">View & Acknowledge Document</a></p>
                <p>Thank you,<br/>HR Team</p>
              `
            })
          });
          const resendJson = await resendRes.json();
          console.log("Resend API response:", resendJson);
        }
      }
    }
    // --- END: Send Resend email for employee docs with requiresAck ---

    // --- BEGIN: Send Resend emails for company docs with requiresAck ---
    if (
      requiresAck &&
      !document.employeeId // Company doc (not employee-specific)
    ) {
      // 1. Build document access query
      const departmentIds = document.departments.map((d) => d.id);
      const jobRoleIds = document.jobRoles.map((j) => j.id);

      // 2. Find all employees who are in scope for this doc
      // If unrestricted, fetch all active employees in the company
      let employees: { id: string; userId: string }[] = [];
      if (
        (!departmentIds || departmentIds.length === 0) &&
        (!jobRoleIds || jobRoleIds.length === 0)
      ) {
        employees = await prisma.employee.findMany({
          where: {
            isActive: true,
            user: { companyId: document.companyId },
          },
          select: { id: true, userId: true },
        });
      } else {
        employees = await prisma.employee.findMany({
          where: {
            isActive: true,
            user: { companyId: document.companyId },
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
      console.log("Company doc notification: Employees in scope:", employees.length);

      // 3. Fetch all users for those employees
      const users = await prisma.user.findMany({
  where: {
    id: { in: employees.map((e) => e.userId) },
    email: { not: "" },
  },
  select: { id: true, email: true, name: true },
});

      // 4. Send emails (in batches of 50 for free Resend)
      const chunkSize = 50;
      for (let i = 0; i < users.length; i += chunkSize) {
        const chunk = users.slice(i, i + chunkSize);
        await Promise.all(
          chunk.map(async (user) => {
            const docLink = `${process.env.NEXT_PUBLIC_BASE_URL}/documents`;
            const resendRes = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                from: "onboarding@resend.dev",
                to: user.email,
                subject: "New Document Requires Your Acknowledgement",
                html: `
                  <p>Hi ${user.name || "there"},</p>
                  <p>A new document <b>${document.name}</b> (${document.category || "General"}) has been uploaded and requires your acknowledgement.</p>
                  <p><a href="${docLink}">View & Acknowledge Document</a></p>
                  <p>Thank you,<br/>HR Team</p>
                `,
              }),
            });
            const resendJson = await resendRes.json();
            console.log(
              `Resend API response for user ${user.email}:`,
              resendJson
            );
          })
        );
      }
    }
    // --- END: Send Resend emails for company docs with requiresAck ---

    console.log("✅ Document uploaded:", document);
    return NextResponse.json(document);
  } catch (error) {
    console.error("❌ Document upload error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
