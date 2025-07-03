import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const rules = await prisma.eventRule.findMany({
            where: {
                companyId: "default-company-id", // replace with dynamic companyId later
            },
            select: {
                eventCategoryId: true,
                blackoutDates: true,
                eventCategory: {
                    select: {
                        id: true,
                        name: true,
                        color: true,
                    },
                },
            },
        });

        const blackoutEvents = rules.flatMap((rule) =>
            rule.blackoutDates.map((date) => ({
                title: `Blocked: ${rule.eventCategory.name}`,
                start: date,
                end: date,
                allDay: true,
                color: rule.eventCategory.color || "#FF0000",
                categoryId: rule.eventCategoryId,
            }))
        );

        return NextResponse.json(blackoutEvents);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Internal server error." }, { status: 500 });
    }
}