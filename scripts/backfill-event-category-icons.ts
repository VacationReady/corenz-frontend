import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const MAPPINGS: Record<string, string> = {
  "Annual Leave": "sun",
  "Holiday": "sun",
  "Sick Leave": "stethoscope",
  "Sickness": "stethoscope",
  "Appointment": "clock",
  "Doctor": "stethoscope",
  "Dentist": "smile",
  "Maternity": "baby",
  "Paternity": "baby",
  "Parental": "baby",
  "Bereavement": "heartPulse",
  "Compassionate": "heartPulse",
  "Training": "graduationCap",
  "Conference": "briefcase",
  "Study": "graduationCap",
  "Unpaid": "briefcase",
  "TOIL": "clock",
  "Lieu": "clock",
  "Working From Home": "home",
  "Remote": "home",
};

async function main() {
  console.log("Starting backfill of EventCategory icons...");

  const categories = await prisma.eventCategory.findMany({
    where: {
      iconKey: null,
    },
  });

  console.log(`Found ${categories.length} categories without icons.`);

  let updatedCount = 0;

  for (const category of categories) {
    // Simple fuzzy matching or exact matching
    let match: string | null = null;
    
    // Try exact match
    if (MAPPINGS[category.name]) {
      match = MAPPINGS[category.name];
    } else {
      // Try partial match
      const lowerName = category.name.toLowerCase();
      for (const [key, icon] of Object.entries(MAPPINGS)) {
        if (lowerName.includes(key.toLowerCase())) {
          match = icon;
          break;
        }
      }
    }

    if (match) {
      await prisma.eventCategory.update({
        where: { id: category.id },
        data: { iconKey: match },
      });
      console.log(`Updated "${category.name}" -> ${match}`);
      updatedCount++;
    }
  }

  console.log(`Backfill complete. Updated ${updatedCount} categories.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });




