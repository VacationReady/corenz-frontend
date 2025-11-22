# Backfill Event Category Icons

A script was created to backfill `iconKey` for existing `EventCategory` records based on their names.

**Script Location:** `scripts/backfill-event-category-icons.ts`

**Usage:**
```bash
npx tsx scripts/backfill-event-category-icons.ts
```

**Mappings:**
- "Annual Leave", "Holiday" -> `sun`
- "Sick Leave", "Sickness", "Doctor" -> `stethoscope`
- "Appointment", "TOIL", "Lieu" -> `clock`
- "Dentist" -> `smile`
- "Maternity", "Paternity", "Parental" -> `baby`
- "Bereavement", "Compassionate" -> `heartPulse`
- "Training", "Study" -> `graduationCap`
- "Conference", "Unpaid" -> `briefcase`
- "Working From Home", "Remote" -> `home`

This script is safe to run multiple times; it only updates categories where `iconKey` is currently `null`.




