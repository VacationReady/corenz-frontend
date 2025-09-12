const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function testExitInterview() {
  try {
    // Get an existing employee for testing
    const employees = await prisma.employee.findMany({
      where: { isActive: true },
      include: { user: true },
      take: 2,
    });

    if (employees.length < 2) {
      console.log("❌ Need at least 2 active employees for testing");
      return;
    }

    const employee = employees[0];
    const interviewer = employees[1];

    console.log("Testing exit interview setup...");
    console.log("Employee:", employee.user.firstName, employee.user.lastName);
    console.log(
      "Interviewer:",
      interviewer.user.firstName,
      interviewer.user.lastName,
    );
    console.log("Interviewer User ID:", interviewer.user.id);

    // Check if interviewer user exists
    const interviewerUser = await prisma.user.findUnique({
      where: { id: interviewer.user.id },
    });

    if (!interviewerUser) {
      console.log("❌ Interviewer user not found!");
      return;
    }

    console.log("✅ Interviewer user exists");

    // Test the validation logic
    const testData = {
      scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      interviewerId: interviewer.user.id,
      location: "Test Room",
      notes: "Test interview notes",
      sendForm: true,
      formTemplateId: null,
      formTiming: "NOW",
    };

    console.log("Test data:", testData);

    // Simulate the validation logic from the API
    let validInterviewerId = null;
    if (testData.interviewerId) {
      try {
        const interviewerCheck = await prisma.user.findUnique({
          where: { id: testData.interviewerId },
          select: { id: true },
        });
        if (interviewerCheck) {
          validInterviewerId = testData.interviewerId;
          console.log("✅ Interviewer validation passed");
        } else {
          console.log("❌ Interviewer validation failed - user not found");
        }
      } catch (error) {
        console.log("❌ Interviewer validation error:", error.message);
      }
    }

    console.log("✅ Exit interview test completed successfully");
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testExitInterview();
