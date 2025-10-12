# Time Tracking System - Dependencies Checklist

## 📦 NPM Packages

### Already Installed ✅
- `date-fns` (v4.1.0) - Date manipulation
- `papaparse` (v5.5.3) - CSV parsing
- `react-big-calendar` - Not needed (we'll use custom calendar)
- `react-day-picker` (v9.8.1) - Already installed

### Need to Install 📥
```bash
npm install xlsx
```

**xlsx** - Excel file generation for payroll exports
- Version: ^0.18.5
- Used in: `lib/payroll-export.ts`
- Purpose: Generate `.xlsx` files for payroll data

### Optional for Enhanced Features (Future)
```bash
# PDF generation for timesheet PDFs
npm install jspdf

# For mobile app (already in mobile/ directory if using Expo)
npx expo install expo-location expo-camera expo-image-picker
```

## 🗄️ Database

### Prisma
```bash
# Apply migration
npx prisma migrate dev --name add_time_tracking_system

# Generate Prisma Client
npx prisma generate
```

### Database Version Requirements
- PostgreSQL 12+ (for JSONB support)
- Existing enums will be extended

## 🔧 Environment Variables

No new environment variables required. System uses existing:
- `DATABASE_URL` - PostgreSQL connection
- `NEXTAUTH_SECRET` - Session authentication
- `NEXTAUTH_URL` - App URL

### Optional for Photo/File Storage
If implementing photo upload to cloud storage:
```env
# AWS S3
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=
AWS_REGION=

# OR Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=

# OR Vercel Blob
BLOB_READ_WRITE_TOKEN=
```

## 📱 Mobile App Dependencies

If building React Native mobile app in `mobile/` directory:

```bash
cd mobile

# Location services
npx expo install expo-location

# Camera
npx expo install expo-camera

# Image picker (alternative to camera)
npx expo install expo-image-picker

# Background tasks (for auto clock-out)
npx expo install expo-background-fetch expo-task-manager

# Push notifications (for shift reminders)
npx expo install expo-notifications
```

## 🎨 UI Dependencies

All UI components use existing dependencies:
- **Tailwind CSS** - Already configured
- **Lucide React** - Icons (already installed)
- **React Hook Form** - Forms (if needed, already used in codebase)
- **Zod** - Validation (already used)

### Optional UI Enhancements
```bash
# Drag and drop for rota calendar
npm install @dnd-kit/core @dnd-kit/sortable

# Charts for analytics
npm install recharts

# Date range picker
npm install react-date-range
```

## 🔐 Authentication

Uses existing **NextAuth.js** setup:
- No additional configuration needed
- Leverages existing session management
- Role-based access via existing `User.role`

## 🧪 Testing Dependencies

### Unit Testing
```bash
# If not already installed
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom
```

### E2E Testing
```bash
# If not already installed  
npm install --save-dev @playwright/test
```

## 📊 TypeScript

No additional TypeScript dependencies needed. System uses:
- Prisma generated types
- Existing tsconfig.json
- Zod for runtime validation

## 🚀 Build & Deploy

### Production Build
```bash
npm run build
```

### Environment-Specific Notes

#### Vercel
- ✅ No changes needed
- Auto-detects Prisma
- Handles migrations via `prisma generate` in build

#### Docker
Add to Dockerfile (if using):
```dockerfile
# Install OpenSSL for Prisma
RUN apt-get update && apt-get install -y openssl

# Generate Prisma Client
RUN npx prisma generate
```

#### Self-Hosted
Ensure server has:
- Node.js 18+
- PostgreSQL 12+
- Sufficient memory for Prisma queries

## 🔍 Compatibility Check

Run this to verify all dependencies:

```bash
# Check Node version (need 18+)
node --version

# Check if Prisma is installed
npx prisma --version

# Check if required packages are installed
npm list date-fns papaparse

# Install missing packages
npm install
```

## 📝 Package.json Scripts

Add these helpful scripts to `package.json`:

```json
{
  "scripts": {
    "db:migrate": "prisma migrate dev",
    "db:generate": "prisma generate",
    "db:studio": "prisma studio",
    "db:seed:timetracking": "tsx scripts/initialize-time-tracking-settings.ts",
    "test:timetracking": "vitest run lib/timesheet-calculations.test.ts"
  }
}
```

## ⚠️ Breaking Changes

None! This implementation:
- ✅ Doesn't modify existing tables
- ✅ Doesn't change existing APIs
- ✅ Adds new enums without conflicts
- ✅ Maintains backward compatibility

## 🎯 Quick Install Commands

### Complete Setup
```bash
# 1. Install new dependency
npm install xlsx

# 2. Apply database migration
npx prisma migrate dev --name add_time_tracking_system

# 3. Generate Prisma Client
npx prisma generate

# 4. Initialize settings for existing companies
npx tsx scripts/initialize-time-tracking-settings.ts

# 5. Verify installation
npm run dev
```

### Development Only
```bash
# Install dev dependencies for testing
npm install --save-dev @testing-library/react vitest
```

---

**Status:** All core dependencies met. Only `xlsx` package needs installation.
