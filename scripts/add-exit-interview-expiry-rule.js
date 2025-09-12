const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function addExitInterviewExpiryRule() {
  try {
    console.log("Adding Exit Interview Forms expiry rule...");

    const expiryRule = await prisma.expiryRule.upsert({
      where: { category: "Exit Interview Forms" },
      update: {
        daysBefore: 0, // Send on the same day
        notifyAdmin: true,
        notifyManager: false, // Exit interviews are typically sent directly to employees
        notifyEmployee: true,
      },
      create: {
        category: "Exit Interview Forms",
        daysBefore: 0, // Send on the same day
        notifyAdmin: true,
        notifyManager: false,
        notifyEmployee: true,
      },
    });

    console.log("✅ Exit Interview Forms expiry rule added:", expiryRule);
  } catch (error) {
    console.error("❌ Error adding expiry rule:", error);
  } finally {
    await prisma.$disconnect();
  }
}

addExitInterviewExpiryRule();
