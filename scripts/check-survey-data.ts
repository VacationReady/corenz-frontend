import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkSurveyData() {
  try {
    const survey = await prisma.survey.findUnique({
      where: { id: "f766affb-626b-44ab-80ed-df569abd6f4e" },
      include: {
        SurveyResponses: { take: 2 },
      },
    });

    console.log("Survey metadata:", JSON.stringify(survey?.metadata, null, 2));
    console.log("\nSample response data:", JSON.stringify(survey?.SurveyResponses[0]?.responseData, null, 2));
    
    await prisma.$disconnect();
  } catch (error) {
    console.error("Error:", error);
    await prisma.$disconnect();
  }
}

checkSurveyData();
