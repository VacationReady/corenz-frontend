// /app/api/documents/upload-employee/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import supabase from "@/lib/supabase-admin";
import { randomUUID } from "crypto";

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

    if (!file || !name || !category || !employeeId) {
        return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const path = `${companyId}/${employeeId}/${randomUUID()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(path, buffer, {
            contentType: file.type,
            upsert: false,
        });

    if (uploadError) {
        console.error(uploadError);
        return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    await prisma.document.create({
    data: {
        name,
        category,
        path,
        url: fileUrl,              // ✅ add this line
        size,
        type,
        uploaderId,
        companyId,
        employeeId,
    },
});

    return NextResponse.json({ success: true });
}
