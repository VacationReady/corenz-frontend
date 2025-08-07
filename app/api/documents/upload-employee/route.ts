import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import supabase from "@/lib/supabase-admin";
import { randomUUID } from "crypto";

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
    const companyId = session.user.companyId;
    const uploaderId = session.user.id;

    // ✅ Access control flags
    const canViewAdmin = formData.get("canViewAdmin") === "true";
    const canViewManager = formData.get("canViewManager") === "true";
    const canViewEmployee = formData.get("canViewEmployee") === "true";

    // ✅ Requires Acknowledgement toggle
    const requiresAck = formData.get("requiresAck") === "true";

    if (!file || !name || !category || !employeeId) {
        return NextResponse.json({ error: "Missing fields" }, { status: 400 });
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

    // ✅ Retrieve public URL after upload
    const { data: urlData } = supabase.storage.from("documents").getPublicUrl(path);
    const fileUrl = urlData.publicUrl;

    // ✅ Create document record in Prisma with access flags
    const document = await prisma.document.create({
        data: {
            name,
            category,
            path,
            url: fileUrl,
            size: file.size,
            type: file.type,
            uploaderId,
            companyId,
            employeeId,
            canViewAdmin,
            canViewManager,
            canViewEmployee,
            requiresAck, // <--- Save the requiresAck flag!
        },
    });

    // --- BEGIN: Send Resend email for employee docs with requiresAck ---
    if (requiresAck && employeeId) {
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
                const docLink = `${process.env.NEXT_PUBLIC_BASE_URL}/employees/${employeeId}/documents`;
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
                          <p>A new document <b>${name}</b> (${category || 'General'}) has been uploaded and requires your acknowledgement.</p>
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

    return NextResponse.json({
  document: {
    id: document.id,
    url: document.url,
    name: document.name,
    category: document.category,
    size: document.size,
    type: document.type,
    createdAt: document.createdAt,
  },
});
}
