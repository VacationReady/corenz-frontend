import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { parse } from "csv-parse/sync";
import { auditLog } from "@/lib/audit";

const workingPatternImportSchema = z.object({
  name: z.string().min(1, "Working pattern name is required"),
  description: z.string().optional(),
  patternType: z.enum(["STANDARD", "SHIFT_BASED", "FLEXIBLE", "COMPRESSED"]).optional(),
  contractedHoursPerWeek: z.string().transform(val => val ? parseFloat(val) : undefined).optional(),
  mondayHours: z.string().transform(val => val ? parseFloat(val) : undefined).optional(),
  tuesdayHours: z.string().transform(val => val ? parseFloat(val) : undefined).optional(),
  wednesdayHours: z.string().transform(val => val ? parseFloat(val) : undefined).optional(),
  thursdayHours: z.string().transform(val => val ? parseFloat(val) : undefined).optional(),
  fridayHours: z.string().transform(val => val ? parseFloat(val) : undefined).optional(),
  saturdayHours: z.string().transform(val => val ? parseFloat(val) : undefined).optional(),
  sundayHours: z.string().transform(val => val ? parseFloat(val) : undefined).optional(),
  active: z.string().transform(val => val?.toLowerCase() === 'true' || val?.toLowerCase() === 'yes' || val === '1').optional(),
});

type WorkingPatternImportData = z.infer<typeof workingPatternImportSchema>;

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const csvContent = await file.text();
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    if (records.length === 0) {
      return NextResponse.json({ error: "CSV file is empty" }, { status: 400 });
    }

    const results = {
      total: records.length,
      successful: 0,
      failed: 0,
      errors: [] as Array<{ row: number; errors: string[] }>,
      created: [] as Array<{ id: string; name: string }>,
      updated: [] as Array<{ id: string; name: string }>,
    };

    // Process each record
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const rowNumber = i + 2; // +2 because CSV headers are row 1, data starts at row 2

      try {
        // Validate the record
        const validatedData = workingPatternImportSchema.parse(record);
        
        // Check if working pattern already exists
        const existingPattern = await prisma.workingPattern.findFirst({
          where: { 
            name: validatedData.name,
            companyId: session.user.companyId,
          },
        });

        // Create working pattern weeks and days
        const workingPatternWeeks = [];
        const workingPatternDays = [];

        // Create a single week pattern
        const weekId = crypto.randomUUID();
        workingPatternWeeks.push({
          id: weekId,
          workingPatternId: '', // Will be set after pattern creation
          weekNumber: 1,
        });

        // Create days for the week
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const dayHours = {
          monday: validatedData.mondayHours,
          tuesday: validatedData.tuesdayHours,
          wednesday: validatedData.wednesdayHours,
          thursday: validatedData.thursdayHours,
          friday: validatedData.fridayHours,
          saturday: validatedData.saturdayHours,
          sunday: validatedData.sundayHours,
        };

        for (const day of days) {
          const hours = dayHours[day as keyof typeof dayHours];
          if (hours && hours > 0) {
            // Capitalize day name for consistency (Mon, Tue, etc.)
            const capitalizedDay = day.charAt(0).toUpperCase() + day.slice(1, 3);
            workingPatternDays.push({
              id: crypto.randomUUID(),
              workingPatternWeekId: weekId,
              day: capitalizedDay,
              type: hours === 8 ? 'FULL_DAY' : hours === 4 ? 'HALF_DAY_AM' : 'FULL_DAY' as any,
            });
          }
        }

        if (existingPattern) {
          // Update existing working pattern
          const updatedPattern = await prisma.workingPattern.update({
            where: { id: existingPattern.id },
            data: {
              description: validatedData.description || existingPattern.description,
              patternType: validatedData.patternType || existingPattern.patternType,
              contractedHoursPerWeek: validatedData.contractedHoursPerWeek !== undefined ? validatedData.contractedHoursPerWeek : existingPattern.contractedHoursPerWeek,
              active: validatedData.active !== undefined ? validatedData.active : existingPattern.active,
              updatedAt: new Date(),
            },
          });

          // Delete existing weeks (cascade deletes days) and recreate with new schedule
          await prisma.workingPatternWeek.deleteMany({
            where: { workingPatternId: existingPattern.id },
          });

          // Update week ID to reference existing pattern
          workingPatternWeeks[0].workingPatternId = existingPattern.id;

          // Create new working pattern week
          await prisma.workingPatternWeek.create({
            data: workingPatternWeeks[0],
          });

          // Create new working pattern days
          if (workingPatternDays.length > 0) {
            await prisma.workingPatternDay.createMany({
              data: workingPatternDays.map(day => ({
                ...day,
                hoursPerDay: dayHours[day.day.toLowerCase() as keyof typeof dayHours],
              })),
            });
          }

          // Create audit log entry
          await auditLog({
            entityType: "WORKING_PATTERN",
            entityId: updatedPattern.id,
            action: "UPDATED",
            actorId: session.user.id,
            actorType: "USER",
            companyId: session.user.companyId,
            metadata: {
              source: "CSV_IMPORT",
              importBatch: `csv_import_${Date.now()}`,
              rowNumber,
              changes: validatedData,
              dayHours,
            },
          });

          results.successful++;
          results.updated.push({
            id: updatedPattern.id,
            name: updatedPattern.name,
          });
        } else {
          // Create new working pattern
          const workingPattern = await prisma.workingPattern.create({
            data: {
              id: crypto.randomUUID(),
              name: validatedData.name,
              description: validatedData.description || null,
              patternType: validatedData.patternType || 'STANDARD',
              contractedHoursPerWeek: validatedData.contractedHoursPerWeek || null,
              active: validatedData.active !== undefined ? validatedData.active : true,
              companyId: session.user.companyId,
              updatedAt: new Date(),
            },
          });

          // Update week with correct pattern ID
          workingPatternWeeks[0].workingPatternId = workingPattern.id;

          // Create working pattern week
          await prisma.workingPatternWeek.create({
            data: workingPatternWeeks[0],
          });

          // Create working pattern days
          if (workingPatternDays.length > 0) {
            await prisma.workingPatternDay.createMany({
              data: workingPatternDays.map(day => ({
                ...day,
                hoursPerDay: dayHours[day.day.toLowerCase() as keyof typeof dayHours],
              })),
            });
          }

          // Create audit log entry
          await auditLog({
            entityType: "WORKING_PATTERN",
            entityId: workingPattern.id,
            action: "CREATED",
            actorId: session.user.id,
            actorType: "USER",
            companyId: session.user.companyId,
            metadata: {
              source: "CSV_IMPORT",
              importBatch: `csv_import_${Date.now()}`,
              rowNumber,
              createdFields: Object.keys(validatedData),
              dayHours,
            },
          });

          results.successful++;
          results.created.push({
            id: workingPattern.id,
            name: workingPattern.name,
          });
        }

      } catch (error) {
        results.failed++;
        if (error instanceof z.ZodError) {
          results.errors.push({
            row: rowNumber,
            errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
          });
        } else {
          results.errors.push({
            row: rowNumber,
            errors: [error instanceof Error ? error.message : "Unknown error"],
          });
        }
      }
    }

    // Create audit log for the entire import
    await auditLog({
      entityType: "CSV_IMPORT",
      entityId: `batch_${Date.now()}`,
      action: "COMPLETED",
      actorId: session.user.id,
      actorType: "USER",
      companyId: session.user.companyId,
      metadata: {
        importType: "WORKING_PATTERNS",
        totalRecords: results.total,
        successful: results.successful,
        failed: results.failed,
        fileName: file.name,
        errors: results.errors,
      },
    });

    return NextResponse.json({
      message: "Working patterns import completed",
      results,
    });

  } catch (error) {
    console.error("CSV import error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Template generation endpoint
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Create template CSV content
    const headers = [
      "name",
      "description",
      "patternType",
      "mondayHours",
      "tuesdayHours",
      "wednesdayHours",
      "thursdayHours",
      "fridayHours",
      "saturdayHours",
      "sundayHours",
      "active",
    ];

    const sampleData = [
      [
        "Standard Full Time",
        "Monday to Friday, 8 hours per day",
        "STANDARD",
        "8",
        "8",
        "8",
        "8",
        "8",
        "0",
        "0",
        "true",
      ],
      [
        "Part Time",
        "Monday to Friday, 4 hours per day",
        "PART_TIME",
        "4",
        "4",
        "4",
        "4",
        "4",
        "0",
        "0",
        "true",
      ],
      [
        "Shift Work",
        "Rotating shifts including weekends",
        "SHIFT",
        "8",
        "8",
        "0",
        "0",
        "8",
        "8",
        "8",
        "true",
      ],
    ];

    const csvContent = [
      headers.join(","),
      ...sampleData.map(row => row.map(cell => `"${cell}"`).join(",")),
    ].join("\n");

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=working_patterns_import_template.csv",
      },
    });

  } catch (error) {
    console.error("Template generation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
