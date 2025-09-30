import { prisma } from "@/lib/prisma";
import { defaultWorkflows } from "@/app/(withSidebar)/settings/automation-rules/config/defaultWorkflows";

async function initializeDefaultWorkflows() {
  console.log("🚀 Initializing default workflow templates...");

  for (const workflow of defaultWorkflows) {
    const existing = await prisma.workflowTemplate.findFirst({
      where: { id: workflow.id, isDefault: true },
    });

    if (!existing) {
      await prisma.workflowTemplate.create({
        data: {
          id: workflow.id,
          name: workflow.name,
          description: (workflow as any).description,
          category: (workflow as any).category,
          icon: (workflow as any).icon,
          definition: workflow as any,
          isPublic: true,
          isDefault: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      console.log(`✅ Created template: ${workflow.name}`);
    } else {
      console.log(`⏭️  Template exists: ${workflow.name}`);
    }
  }

  console.log("✨ Default workflows initialized successfully!");
}

initializeDefaultWorkflows()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


