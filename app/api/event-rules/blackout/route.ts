import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
    try {
        const { date, categoryIds, note } = await req.json();

        if (!date || !categoryIds || !Array.isArray(categoryIds)) {
            return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
        }

        const blackoutDate = new Date(date);

        // For each event category, update its EventRule by adding the blackout date if not already present
        await Promise.all(
            categoryIds.map(async (categoryId: string) => {
                const rule = await prisma.eventRule.findFirst({
                    where: {
                        eventCategoryId: categoryId,
                        companyId: "default-company-id", // replace with dynamic companyId later
                    },
                });

                if (rule) {
                    const isAlreadyBlocked = rule.blackoutDates.some(
                        (d) => new Date(d).toDateString() === blackoutDate.toDateString()
                    );

                    if (!isAlreadyBlocked) {
                        await prisma.eventRule.update({
                            where: { id: rule.id },
                            data: {
                                blackoutDates: {
                                    set: [...rule.blackoutDates, blackoutDate],
                                },
                            },
                        });
                    }
                } else {
                    // If rule doesn't exist, create it for this category
                    await prisma.eventRule.create({
                        data: {
                            companyId: "default-company-id",
                            eventCategoryId: categoryId,
                            enforceEntitlement: true,
                            noticePeriodDays: 0,
                            maxConcurrent: null,
                            blackoutDates: [blackoutDate],
                        },
                    });
                }
            })
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Internal server error." }, { status: 500 });
    }
}