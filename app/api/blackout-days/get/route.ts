import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const blackouts = await prisma.blackoutDay.findMany();
        return NextResponse.json(blackouts);
    } catch (error) {
        console.error("Error fetching blackout days:", error);
        return NextResponse.json({ error: "Internal server error." }, { status: 500 });
    }
}