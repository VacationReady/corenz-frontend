import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const revalidate = 0; // 🚩 disables Vercel caching for this API route

export async function GET() {
    try {
        const blackouts = await prisma.blackoutDay.findMany();
        return NextResponse.json(blackouts, {
            headers: {
                "Cache-Control": "no-store", // 🚩 ensures no caching of API response
            },
        });
    } catch (error) {
        console.error("Error fetching blackout days:", error);
        return NextResponse.json({ error: "Failed to fetch blackout days." }, { status: 500 });
    }
}
