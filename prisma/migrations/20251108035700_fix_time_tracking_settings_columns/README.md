# Migration: Fix Time Tracking Settings Columns

**Version:** `20251108035700_fix_time_tracking_settings_columns`
**Timestamp:** 2025-11-08T03:57:00Z

## Summary
- Adds canonical boolean columns `allowManualEntry` and `requirePhotos` to `TimeTrackingSettings`.
- Backfills values from legacy fields (`allowMobileClock`, `requirePhoto`) or canonical fields when legacy columns are absent.
- Enforces NOT NULL constraints with safe defaults to align with API/UI contract.
- Includes idempotent logic guarded by column existence checks and runs inside a transaction.
- Provides rollback script that restores legacy column values and drops new columns.

## Production Run Instructions
1. Backup the production database.
2. Deploy the migration:
   ```bash
   npx prisma migrate deploy
   ```
3. Run verification script to confirm data integrity:
   ```bash
   node scripts/verify-time-tracking-settings-migration.ts
   ```
4. Review the verification report and address any discrepancies.

## Rollback Steps
1. Backup current state.
2. Execute rollback script manually:
   ```bash
   psql "$DATABASE_URL" -f prisma/migrations/20251108035700_fix_time_tracking_settings_columns/rollback.sql
   ```
3. Re-run verification script to ensure legacy state was restored successfully.
