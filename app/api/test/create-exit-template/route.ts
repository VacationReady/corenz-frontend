import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    // Create a sample exit interview form template
    const template = await prisma.exitInterviewFormTemplate.create({
      data: {
        name: "Standard Exit Interview",
        description: "Standard exit interview form for departing employees",
        schemaJson: {
          fields: [
            {
              id: "reason_for_leaving",
              type: "select",
              label: "What is your primary reason for leaving?",
              required: true,
              options: [
                "Career advancement",
                "Better compensation",
                "Work-life balance",
                "Company culture",
                "Management issues",
                "Personal reasons",
                "Other",
              ],
            },
            {
              id: "satisfaction_rating",
              type: "radio",
              label:
                "How would you rate your overall satisfaction with your role?",
              required: true,
              options: [
                "Very satisfied",
                "Satisfied",
                "Neutral",
                "Dissatisfied",
                "Very dissatisfied",
              ],
            },
            {
              id: "work_environment",
              type: "textarea",
              label:
                "How would you describe the work environment and company culture?",
              required: false,
              placeholder:
                "Please share your thoughts on the work environment...",
            },
            {
              id: "management_feedback",
              type: "textarea",
              label:
                "What feedback would you give to your manager or the company?",
              required: false,
              placeholder: "Any suggestions for improvement...",
            },
            {
              id: "would_recommend",
              type: "radio",
              label: "Would you recommend this company to others?",
              required: true,
              options: [
                "Yes, definitely",
                "Yes, probably",
                "Maybe",
                "No, probably not",
                "No, definitely not",
              ],
            },
          ],
        },
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      template: {
        id: template.id,
        name: template.name,
        description: template.description,
      },
    });
  } catch (error) {
    console.error("Error creating test template:", error);
    return NextResponse.json(
      {
        error: "Failed to create test template",
      },
      { status: 500 },
    );
  }
}

