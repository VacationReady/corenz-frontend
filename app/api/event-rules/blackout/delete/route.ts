import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
    try {
        const { eventRuleId, dateToRemove } = await req.json();

        if (!eventRuleId || !dateToRemove) {
            return NextResponse.json({ error: "Missing eventRuleId or dateToRemove." }, { status: 400 });
        }

        const eventRule = await prisma.eventRule.findUnique({
            where: { id: eventRuleId },
            select: { blackoutDates: true },
        });

        if (!eventRule) {
            return NextResponse.json({ error: "EventRule not found." }, { status: 404 });
        }

        const filteredDates = eventRule.blackoutDates.filter(
            (d) => new Date(d).toISOString().split("T")[0] !== new Date(dateToRemove).toISOString().split("T")[0]
        );

        await prisma.eventRule.update({
            where: { id: eventRuleId },
            data: {
                blackoutDates: filteredDates,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting blackout date:", error);
        return NextResponse.json({ error: "Internal server error." }, { status: 500 });
    }
}
