import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const COMPANY_ID = "3c193286-d6e2-48a3-8e62-f8742d7e3876";
const SURVEY_ID = "f766affb-626b-44ab-80ed-df569abd6f4e";

/**
 * Seed survey responses for demo site
 * Run with: npx tsx scripts/seed-survey-responses.ts
 */
async function seedSurveyResponses() {
  try {
    console.log("📊 Starting survey response seeding...");
    console.log(`Company ID: ${COMPANY_ID}`);
    console.log(`Survey ID: ${SURVEY_ID}`);

    // Verify survey exists
    const survey = await prisma.survey.findFirst({
      where: {
        id: SURVEY_ID,
        companyId: COMPANY_ID,
      },
      include: {
        Form: true,
      },
    });

    if (!survey) {
      throw new Error("Survey not found");
    }

    console.log(`\n✅ Found survey: ${survey.name}`);
    console.log(`Form ID: ${survey.formId}`);

    // Get form schema to understand questions
    const formSchema = survey.Form.schema as any;
    console.log(`\n📋 Form schema:`, JSON.stringify(formSchema, null, 2));

    // Get all recipients
    const recipients = await prisma.surveyRecipient.findMany({
      where: {
        surveyId: SURVEY_ID,
      },
      include: {
        Employee: {
          include: {
            User: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    console.log(`\n👥 Found ${recipients.length} recipients`);

    if (recipients.length === 0) {
      throw new Error("No recipients found for this survey");
    }

    // Generate varied responses
    let completedCount = 0;
    let skippedCount = 0;

    for (const recipient of recipients) {
      // Check if already responded
      const existingResponse = await prisma.surveyResponse.findUnique({
        where: {
          surveyId_employeeId: {
            surveyId: SURVEY_ID,
            employeeId: recipient.employeeId,
          },
        },
      });

      if (existingResponse) {
        console.log(
          `⏭️  Skipping ${recipient.Employee.User.firstName} ${recipient.Employee.User.lastName} - already responded`
        );
        skippedCount++;
        continue;
      }

      // Generate response data based on form schema
      const responseData = generateResponseData(formSchema);

      // Create survey response
      await prisma.surveyResponse.create({
        data: {
          id: crypto.randomUUID(),
          surveyId: SURVEY_ID,
          employeeId: recipient.employeeId,
          responseData,
          submittedAt: new Date(
            Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
          ), // Random time within last 7 days
        },
      });

      // Update recipient status
      await prisma.surveyRecipient.update({
        where: { id: recipient.id },
        data: {
          status: "RESPONDED",
          respondedAt: new Date(
            Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
          ),
        },
      });

      // Mark action item as completed if exists
      if (recipient.actionItemId) {
        await prisma.actionItem.update({
          where: { id: recipient.actionItemId },
          data: {
            status: "COMPLETED",
            completedAt: new Date(),
          },
        });
      }

      completedCount++;
      console.log(
        `✅ Created response for ${recipient.Employee.User.firstName} ${recipient.Employee.User.lastName}`
      );
    }

    // Update survey statistics
    const totalResponses = await prisma.surveyResponse.count({
      where: { surveyId: SURVEY_ID },
    });

    const responseRate =
      recipients.length > 0 ? (totalResponses / recipients.length) * 100 : 0;

    await prisma.survey.update({
      where: { id: SURVEY_ID },
      data: {
        responses: totalResponses,
        responseRate,
      },
    });

    console.log(`\n🎉 Survey response seeding completed!`);
    console.log(`✅ Created: ${completedCount} responses`);
    console.log(`⏭️  Skipped: ${skippedCount} (already responded)`);
    console.log(`📊 Total responses: ${totalResponses}/${recipients.length}`);
    console.log(`📈 Response rate: ${responseRate.toFixed(1)}%`);
  } catch (error) {
    console.error("❌ Error seeding survey responses:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Generate varied response data based on form schema
 */
function generateResponseData(formSchema: any): Record<string, any> {
  const responseData: Record<string, any> = {};

  // Handle different form schema structures (sections, pages, or direct fields)
  const sections = formSchema.sections || formSchema.pages || [formSchema];

  for (const section of sections) {
    const fields = section.fields || section.elements || [];

    for (const field of fields) {
      const fieldId = field.id || field.name;
      if (!fieldId) continue;

      switch (field.type) {
        case "rating":
        case "scale":
          // Generate rating 1-5 or 1-10 with normal distribution (weighted towards middle-high)
          const maxRating = field.max || field.rateMax || 5;
          responseData[fieldId] = generateRating(maxRating);
          break;

        case "select":
        case "radio":
        case "radiogroup":
        case "dropdown":
          // Select random option
          if (field.choices || field.options) {
            const options = field.choices || field.options;
            responseData[fieldId] =
              options[Math.floor(Math.random() * options.length)];
          }
          break;

        case "checkbox":
        case "checkboxgroup":
          // Select 1-3 random options
          if (field.choices || field.options) {
            const options = field.choices || field.options;
            const numSelections = Math.floor(Math.random() * 3) + 1;
            const selected = [];
            for (let i = 0; i < numSelections && i < options.length; i++) {
              const option =
                options[Math.floor(Math.random() * options.length)];
              if (!selected.includes(option)) {
                selected.push(option);
              }
            }
            responseData[fieldId] = selected;
          }
          break;

        case "text":
        case "comment":
        case "textarea":
          // Generate varied text responses
          responseData[fieldId] = generateTextResponse(field);
          break;

        case "boolean":
        case "yesno":
          responseData[fieldId] = Math.random() > 0.3; // 70% yes, 30% no
          break;

        case "nps":
          // Net Promoter Score: 0-10
          responseData[fieldId] = generateNPSScore();
          break;

        default:
          // For unknown types, try to provide a reasonable default
          if (field.inputType === "number") {
            responseData[fieldId] = Math.floor(Math.random() * 100);
          } else if (field.inputType === "date") {
            responseData[fieldId] = new Date().toISOString();
          }
      }
    }
  }

  return responseData;
}

/**
 * Generate rating with normal distribution weighted towards middle-high values
 */
function generateRating(max: number): number {
  // Use Box-Muller transform for normal distribution
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

  // Scale to rating range with mean at 70% of max
  const mean = max * 0.7;
  const stdDev = max * 0.15;
  let rating = Math.round(mean + z0 * stdDev);

  // Clamp to valid range
  rating = Math.max(1, Math.min(max, rating));

  return rating;
}

/**
 * Generate NPS score (0-10) with realistic distribution
 */
function generateNPSScore(): number {
  const rand = Math.random();

  // Realistic NPS distribution:
  // 60% Promoters (9-10)
  // 25% Passives (7-8)
  // 15% Detractors (0-6)

  if (rand < 0.6) {
    // Promoters
    return Math.random() < 0.5 ? 9 : 10;
  } else if (rand < 0.85) {
    // Passives
    return Math.random() < 0.5 ? 7 : 8;
  } else {
    // Detractors
    return Math.floor(Math.random() * 7); // 0-6
  }
}

/**
 * Generate varied text responses
 */
function generateTextResponse(field: any): string {
  const positiveResponses = [
    "Great experience overall, very satisfied with the support and resources provided.",
    "Really appreciate the team culture and collaborative environment.",
    "Good work-life balance and flexible working arrangements.",
    "Excellent leadership and clear communication from management.",
    "Love the opportunities for professional development and growth.",
    "The company values align well with my personal values.",
    "Strong sense of community and belonging within the team.",
    "Appreciate the recognition and feedback I receive regularly.",
  ];

  const neutralResponses = [
    "Things are going well overall, some areas could be improved.",
    "Generally satisfied, though there's room for improvement in some areas.",
    "The role meets my expectations for the most part.",
    "Decent work environment with some challenges to navigate.",
    "It's okay, nothing particularly stands out as exceptional or problematic.",
    "Average experience, some good aspects and some areas needing attention.",
  ];

  const constructiveResponses = [
    "Would benefit from more clarity on career progression paths.",
    "Communication could be improved, especially around strategic decisions.",
    "More resources and tools would help us be more effective.",
    "Would appreciate more frequent feedback and check-ins.",
    "Some processes could be streamlined for better efficiency.",
    "More training opportunities would be valuable for skill development.",
    "Better work distribution across the team would help with workload.",
  ];

  const mixedResponses = [
    "Overall positive, though communication could be clearer at times. The team is supportive and collaborative.",
    "Good culture and values, but would like to see more investment in professional development opportunities.",
    "Appreciate the flexibility, though sometimes priorities shift too quickly making it hard to plan.",
    "Strong team dynamics, but workload can be challenging during peak periods.",
    "Like the innovative approach, though more structure in some processes would be helpful.",
  ];

  // Weighted random selection
  const rand = Math.random();

  if (rand < 0.5) {
    // 50% positive
    return positiveResponses[
      Math.floor(Math.random() * positiveResponses.length)
    ];
  } else if (rand < 0.75) {
    // 25% mixed
    return mixedResponses[Math.floor(Math.random() * mixedResponses.length)];
  } else if (rand < 0.9) {
    // 15% neutral
    return neutralResponses[Math.floor(Math.random() * neutralResponses.length)];
  } else {
    // 10% constructive
    return constructiveResponses[
      Math.floor(Math.random() * constructiveResponses.length)
    ];
  }
}

// Run the seed function
seedSurveyResponses()
  .then(() => {
    console.log("\n✅ Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Script failed:", error);
    process.exit(1);
  });
