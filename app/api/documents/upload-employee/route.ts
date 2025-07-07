import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import supabase from "@/lib/supabase-admin";
import { randomUUID } from "crypto";

export const runtime = "nodejs"; // Ensure Node runtime for FormData upload

export async function POST(req: NextRequest) {
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

    // ✅ Create document record in Prisma
    await prisma.document.create({
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
        },
    });

    return NextResponse.json({ success: true });
}
