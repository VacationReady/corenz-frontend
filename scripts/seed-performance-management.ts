import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Seed default performance management templates
 * Run with: npx tsx scripts/seed-performance-management.ts
 */
async function seedPerformanceManagement() {
  try {
    console.log("🎯 Seeding performance management templates...");

    // Get all companies
    const companies = await prisma.company.findMany({
      include: {
        User: {
          where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } },
          take: 1,
        },
      },
    });

    for (const company of companies) {
      if (!company.User[0]) {
        console.log(`⚠️ Skipping ${company.name} - no admin user found`);
        continue;
      }

      const adminUser = company.User[0];
      console.log(`\n📋 Creating templates for ${company.name}...`);

      // 1. Weekly 1-2-1 Template
      const oneToOneTemplate = await prisma.performanceTemplate.create({
        data: {
          id: crypto.randomUUID(),
          companyId: company.id,
          name: "Weekly 1-2-1",
          description: "Standard template for recurring one-on-one meetings",
          type: "ONE_TO_ONE",
          icon: "💬",
          isDefault: true,
          isActive: true,
          tags: ["1-2-1", "recurring", "weekly"],
          visibility: "COMPANY",
          createdBy: adminUser.id,
          sections: {
            create: [
              {
                id: crypto.randomUUID(),
                title: "Check-in & Wellbeing",
                description: "Start with personal connection",
                order: 1,
                isRequired: true,
                questions: {
                  create: [
                    {
                      id: crypto.randomUUID(),
                      question: "How are you feeling this week?",
                      description: "General wellbeing and mood",
                      type: "RATING",
                      order: 1,
                      isRequired: true,
                      options: { min: 1, max: 5, labels: ["Struggling", "Excellent"] },
                    },
                    {
                      id: crypto.randomUUID(),
                      question: "What's on your mind?",
                      type: "TEXTAREA",
                      order: 2,
                      isRequired: false,
                    },
                  ],
                },
              },
              {
                id: crypto.randomUUID(),
                title: "Progress & Wins",
                description: "Celebrate achievements",
                order: 2,
                isRequired: true,
                questions: {
                  create: [
                    {
                      id: crypto.randomUUID(),
                      question: "What went well this week?",
                      type: "TEXTAREA",
                      order: 1,
                      isRequired: false,
                    },
                    {
                      id: crypto.randomUUID(),
                      question: "Any blockers or challenges?",
                      type: "TEXTAREA",
                      order: 2,
                      isRequired: false,
                    },
                  ],
                },
              },
              {
                id: crypto.randomUUID(),
                title: "Goals & Priorities",
                description: "Plan ahead",
                order: 3,
                isRequired: true,
                questions: {
                  create: [
                    {
                      id: crypto.randomUUID(),
                      question: "What are your top 3 priorities for next week?",
                      type: "TEXTAREA",
                      order: 1,
                      isRequired: false,
                    },
                    {
                      id: crypto.randomUUID(),
                      question: "What support do you need from me?",
                      type: "TEXTAREA",
                      order: 2,
                      isRequired: false,
                    },
                  ],
                },
              },
            ],
          },
        },
      });
      console.log(`✅ Created: Weekly 1-2-1 template`);

      // 2. Probation Review Template
      const probationTemplate = await prisma.performanceTemplate.create({
        data: {
          id: crypto.randomUUID(),
          companyId: company.id,
          name: "Probation Review",
          description: "End of probation performance review",
          type: "PROBATION_REVIEW",
          icon: "📝",
          isDefault: true,
          isActive: true,
          tags: ["probation", "review", "onboarding"],
          visibility: "COMPANY",
          createdBy: adminUser.id,
          sections: {
            create: [
              {
                id: crypto.randomUUID(),
                title: "Role Understanding",
                order: 1,
                isRequired: true,
                questions: {
                  create: [
                    {
                      id: crypto.randomUUID(),
                      question:
                        "How well does the employee understand their role and responsibilities?",
                      type: "RATING",
                      order: 1,
                      isRequired: true,
                      options: { min: 1, max: 5 },
                    },
                    {
                      id: crypto.randomUUID(),
                      question: "Comments on role clarity",
                      type: "TEXTAREA",
                      order: 2,
                      isRequired: false,
                    },
                  ],
                },
              },
              {
                id: crypto.randomUUID(),
                title: "Performance & Deliverables",
                order: 2,
                isRequired: true,
                questions: {
                  create: [
                    {
                      id: crypto.randomUUID(),
                      question: "Quality of work delivered",
                      type: "RATING",
                      order: 1,
                      isRequired: true,
                      options: { min: 1, max: 5 },
                    },
                    {
                      id: crypto.randomUUID(),
                      question: "Key achievements during probation",
                      type: "TEXTAREA",
                      order: 2,
                      isRequired: false,
                    },
                  ],
                },
              },
              {
                id: crypto.randomUUID(),
                title: "Team Integration",
                order: 3,
                isRequired: true,
                questions: {
                  create: [
                    {
                      id: crypto.randomUUID(),
                      question: "How well has the employee integrated with the team?",
                      type: "RATING",
                      order: 1,
                      isRequired: true,
                      options: { min: 1, max: 5 },
                    },
                  ],
                },
              },
              {
                id: crypto.randomUUID(),
                title: "Decision & Next Steps",
                order: 4,
                isRequired: true,
                questions: {
                  create: [
                    {
                      id: crypto.randomUUID(),
                      question: "Recommendation",
                      type: "MULTIPLE_CHOICE",
                      order: 1,
                      isRequired: true,
                      options: {
                        choices: [
                          "Pass probation",
                          "Extend probation (specify duration)",
                          "Not suitable for role",
                        ],
                      },
                    },
                    {
                      id: crypto.randomUUID(),
                      question: "Next steps and development goals",
                      type: "TEXTAREA",
                      order: 2,
                      isRequired: false,
                    },
                  ],
                },
              },
            ],
          },
        },
      });
      console.log(`✅ Created: Probation Review template`);

      // 3. Quarterly Review Template
      const quarterlyTemplate = await prisma.performanceTemplate.create({
        data: {
          id: crypto.randomUUID(),
          companyId: company.id,
          name: "Quarterly Performance Review",
          description: "Comprehensive quarterly check-in",
          type: "QUARTERLY_REVIEW",
          icon: "📊",
          isDefault: true,
          isActive: true,
          tags: ["quarterly", "review", "check-in"],
          visibility: "COMPANY",
          createdBy: adminUser.id,
          sections: {
            create: [
              {
                id: crypto.randomUUID(),
                title: "Objectives Review",
                order: 1,
                isRequired: true,
                questions: {
                  create: [
                    {
                      id: crypto.randomUUID(),
                      question: "Review progress on quarterly objectives",
                      type: "TEXTAREA",
                      order: 1,
                      isRequired: true,
                    },
                    {
                      id: crypto.randomUUID(),
                      question: "Overall objective completion rate",
                      type: "RATING",
                      order: 2,
                      isRequired: true,
                      options: { min: 0, max: 100, unit: "%" },
                    },
                  ],
                },
              },
              {
                id: crypto.randomUUID(),
                title: "Strengths & Achievements",
                order: 2,
                isRequired: true,
                questions: {
                  create: [
                    {
                      id: crypto.randomUUID(),
                      question: "Key achievements this quarter",
                      type: "TEXTAREA",
                      order: 1,
                      isRequired: false,
                    },
                    {
                      id: crypto.randomUUID(),
                      question: "Strengths demonstrated",
                      type: "TEXTAREA",
                      order: 2,
                      isRequired: false,
                    },
                  ],
                },
              },
              {
                id: crypto.randomUUID(),
                title: "Development Areas",
                order: 3,
                isRequired: true,
                questions: {
                  create: [
                    {
                      id: crypto.randomUUID(),
                      question: "Areas for improvement",
                      type: "TEXTAREA",
                      order: 1,
                      isRequired: false,
                    },
                    {
                      id: crypto.randomUUID(),
                      question: "Development plan for next quarter",
                      type: "TEXTAREA",
                      order: 2,
                      isRequired: false,
                    },
                  ],
                },
              },
              {
                id: crypto.randomUUID(),
                title: "Goals for Next Quarter",
                order: 4,
                isRequired: true,
                questions: {
                  create: [
                    {
                      id: crypto.randomUUID(),
                      question: "Objectives for next quarter",
                      type: "TEXTAREA",
                      order: 1,
                      isRequired: false,
                    },
                  ],
                },
              },
            ],
          },
        },
      });
      console.log(`✅ Created: Quarterly Review template`);

      // 4. Annual Review Template
      const annualTemplate = await prisma.performanceTemplate.create({
        data: {
          id: crypto.randomUUID(),
          companyId: company.id,
          name: "Annual Performance Review",
          description: "Comprehensive yearly performance review",
          type: "ANNUAL_REVIEW",
          icon: "⭐",
          isDefault: true,
          isActive: true,
          tags: ["annual", "review", "360"],
          visibility: "COMPANY",
          createdBy: adminUser.id,
          sections: {
            create: [
              {
                id: crypto.randomUUID(),
                title: "Year in Review",
                order: 1,
                isRequired: true,
                questions: {
                  create: [
                    {
                      id: crypto.randomUUID(),
                      question: "Summarize the past year's performance",
                      type: "TEXTAREA",
                      order: 1,
                      isRequired: true,
                    },
                    {
                      id: crypto.randomUUID(),
                      question: "Overall performance rating",
                      type: "RATING",
                      order: 2,
                      isRequired: true,
                      options: {
                        min: 1,
                        max: 5,
                        labels: [
                          "Needs Improvement",
                          "Meets Expectations",
                          "Exceeds Expectations",
                          "Outstanding",
                          "Exceptional",
                        ],
                      },
                    },
                  ],
                },
              },
              {
                id: crypto.randomUUID(),
                title: "Core Competencies",
                order: 2,
                isRequired: true,
                questions: {
                  create: [
                    {
                      id: crypto.randomUUID(),
                      question: "Technical skills",
                      type: "RATING",
                      order: 1,
                      isRequired: true,
                      options: { min: 1, max: 5 },
                    },
                    {
                      id: crypto.randomUUID(),
                      question: "Communication & collaboration",
                      type: "RATING",
                      order: 2,
                      isRequired: true,
                      options: { min: 1, max: 5 },
                    },
                    {
                      id: crypto.randomUUID(),
                      question: "Leadership & initiative",
                      type: "RATING",
                      order: 3,
                      isRequired: true,
                      options: { min: 1, max: 5 },
                    },
                    {
                      id: crypto.randomUUID(),
                      question: "Problem solving",
                      type: "RATING",
                      order: 4,
                      isRequired: true,
                      options: { min: 1, max: 5 },
                    },
                  ],
                },
              },
              {
                id: crypto.randomUUID(),
                title: "Career Development",
                order: 3,
                isRequired: true,
                questions: {
                  create: [
                    {
                      id: crypto.randomUUID(),
                      question: "Career aspirations and goals",
                      type: "TEXTAREA",
                      order: 1,
                      isRequired: false,
                    },
                    {
                      id: crypto.randomUUID(),
                      question: "Training and development needs",
                      type: "TEXTAREA",
                      order: 2,
                      isRequired: false,
                    },
                  ],
                },
              },
              {
                id: crypto.randomUUID(),
                title: "Compensation & Promotion",
                order: 4,
                isRequired: false,
                questions: {
                  create: [
                    {
                      id: crypto.randomUUID(),
                      question: "Salary review recommendation",
                      type: "TEXTAREA",
                      order: 1,
                      isRequired: false,
                    },
                    {
                      id: crypto.randomUUID(),
                      question: "Promotion recommendation",
                      type: "YES_NO",
                      order: 2,
                      isRequired: false,
                    },
                  ],
                },
              },
            ],
          },
        },
      });
      console.log(`✅ Created: Annual Review template`);

      console.log(`\n✨ Successfully seeded ${company.name}\n`);
    }

    console.log("🎉 Performance management seeding complete!");
  } catch (error) {
    console.error("❌ Error seeding performance management:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedPerformanceManagement()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
