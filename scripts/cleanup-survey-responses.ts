import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const COMPANY_ID = "3c193286-d6e2-48a3-8e62-f8742d7e3876";
const SURVEY_ID = "f766affb-626b-44ab-80ed-df569abd6f4e";

/**
 * Clean up existing survey responses and reset recipients
 * Run with: npx tsx scripts/cleanup-survey-responses.ts
 */
async function cleanupSurveyResponses() {
  try {
    console.log("🧹 Cleaning up survey responses...");
    console.log(`Company ID: ${COMPANY_ID}`);
    console.log(`Survey ID: ${SURVEY_ID}`);

    // Delete all survey responses
    const deletedResponses = await prisma.surveyResponse.deleteMany({
      where: {
        surveyId: SURVEY_ID,
      },
    });

    console.log(`✅ Deleted ${deletedResponses.count} survey responses`);

    // Reset all recipients to PENDING status
    const updatedRecipients = await prisma.surveyRecipient.updateMany({
      where: {
        surveyId: SURVEY_ID,
      },
      data: {
        status: "PENDING",
        respondedAt: null,
      },
    });

    console.log(`✅ Reset ${updatedRecipients.count} recipients to PENDING`);

    // Reset action items back to PENDING
    const recipients = await prisma.surveyRecipient.findMany({
      where: {
        surveyId: SURVEY_ID,
        actionItemId: { not: null },
      },
      select: {
        actionItemId: true,
      },
    });

    const actionItemIds = recipients
      .map((r) => r.actionItemId)
      .filter((id): id is string => id !== null);

    if (actionItemIds.length > 0) {
      const updatedActionItems = await prisma.actionItem.updateMany({
        where: {
          id: { in: actionItemIds },
        },
        data: {
          status: "PENDING",
          completedAt: null,
        },
      });

      console.log(`✅ Reset ${updatedActionItems.count} action items to PENDING`);
    }

    // Reset survey statistics
    await prisma.survey.update({
      where: { id: SURVEY_ID },
      data: {
        responses: 0,
        responseRate: 0,
      },
    });

    console.log(`✅ Reset survey statistics`);

    console.log("\n🎉 Cleanup completed successfully!");
  } catch (error) {
    console.error("❌ Error cleaning up survey responses:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup function
cleanupSurveyResponses()
  .then(() => {
    console.log("\n✅ Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Script failed:", error);
    process.exit(1);
  });
