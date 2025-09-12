const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function checkOffboarding() {
  try {
    const offboarding = await prisma.employeeOffboarding.findUnique({
      where: { employeeId: "cmf8cwzvs0001ie04g8rq4wma" },
      include: {
        employee: {
          include: {
            user: true,
            department: true,
            jobRole: true,
          },
        },
        initiatedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (offboarding) {
      console.log("Offboarding record found:", {
        id: offboarding.id,
        employeeId: offboarding.employeeId,
        status: offboarding.status,
        exitInterviewDate: offboarding.exitInterviewDate,
        sendForm: offboarding.sendForm,
        formTiming: offboarding.formTiming,
        employeeName: `${offboarding.employee.user.firstName} ${offboarding.employee.user.lastName}`,
      });
    } else {
      console.log(
        "No offboarding record found for employeeId: cmf8cwzvs0001ie04g8rq4wma",
      );
    }
  } catch (error) {
    console.error("Error checking offboarding:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkOffboarding();
