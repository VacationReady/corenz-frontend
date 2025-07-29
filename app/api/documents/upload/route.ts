import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import supabase from "@/lib/supabase-admin";

export async function POST(req: Request) {
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

    console.log("✅ Document uploaded:", document);
    return NextResponse.json(document);
  } catch (error) {
    console.error("❌ Document upload error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
