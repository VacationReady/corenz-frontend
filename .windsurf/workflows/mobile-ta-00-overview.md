---
description: Mobile T&A System - Master Overview and Implementation Order
---

# Mobile Time & Attendance System - Implementation Guide

## Overview

This guide provides step-by-step instructions for implementing a robust, bulletproof, and highly intuitive Time & Attendance (T&A) system for the mobile application. The system includes:

- Dashboard tiles for shifts and clock-in
- Enhanced clock-in/out with manual entry
- Full shift/schedule viewing
- Shift swap functionality
- Timesheet review and submission
- Admin reconciliation for payroll

## Implementation Order

Execute these workflows **in order**. Each builds on the previous:

| Order | Workflow File | Description | Estimated Time |
|-------|---------------|-------------|----------------|
| 1 | `mobile-ta-01-api-services.md` | Create mobile API service layer | 4 hours |
| 2 | `mobile-ta-02-dashboard-tiles.md` | Dashboard shift & clock tiles | 4 hours |
| 3 | `mobile-ta-03-clock-enhancements.md` | Manual entry, break tracking | 6 hours |
| 4 | `mobile-ta-04-shifts-screen.md` | Full shifts/schedule screen | 6 hours |
| 5 | `mobile-ta-05-shift-swaps.md` | Shift swap request & management | 6 hours |
| 6 | `mobile-ta-06-timesheets.md` | Timesheet review & submission | 6 hours |
| 7 | `mobile-ta-07-admin-reconciliation.md` | Admin reconciliation screen | 8 hours |
| 8 | `mobile-ta-08-backend-enhancements.md` | New API endpoints needed | 4 hours |

## Architecture Overview

```
mobile/
├── src/
│   ├── api/
│   │   ├── time-tracking.ts      # Existing - clock APIs
│   │   ├── shifts.ts             # NEW - shift APIs
│   │   ├── swaps.ts              # NEW - swap APIs
│   │   ├── timesheets.ts         # NEW - timesheet APIs
│   │   └── reconciliation.ts     # NEW - admin reconciliation APIs
│   ├── components/
│   │   ├── dashboard/
│   │   │   ├── ShiftsTile.tsx    # NEW
│   │   │   └── ClockTile.tsx     # NEW
│   │   ├── clock/
│   │   │   ├── ManualEntryModal.tsx  # NEW
│   │   │   ├── BreakControls.tsx     # NEW
│   │   │   └── PhotoCapture.tsx      # NEW
│   │   ├── shifts/
│   │   │   ├── WeekView.tsx      # NEW
│   │   │   ├── ShiftCard.tsx     # NEW
│   │   │   └── ShiftDetailsModal.tsx # NEW
│   │   ├── swaps/
│   │   │   ├── SwapRequestModal.tsx  # NEW
│   │   │   ├── SwapCard.tsx          # NEW
│   │   │   └── SwapDecisionModal.tsx # NEW
│   │   ├── timesheets/
│   │   │   ├── WeeklySummary.tsx     # NEW
│   │   │   ├── EntryCard.tsx         # NEW
│   │   │   └── AddNoteModal.tsx      # NEW
│   │   └── reconciliation/
│   │       ├── DayPicker.tsx         # NEW
│   │       ├── EmployeeEntryCard.tsx # NEW
│   │       ├── EditEntryModal.tsx    # NEW
│   │       └── BulkApproveBar.tsx    # NEW
│   ├── screens/
│   │   ├── ClockScreen.tsx       # ENHANCE
│   │   ├── ShiftsScreen.tsx      # NEW (replace ScheduleScreen)
│   │   ├── ShiftSwapsScreen.tsx  # NEW
│   │   ├── TimesheetsScreen.tsx  # ENHANCE
│   │   ├── TimesheetDetailScreen.tsx # NEW
│   │   └── admin/
│   │       └── ReconciliationScreen.tsx # NEW
│   └── services/
│       ├── OfflineClockService.ts    # Existing
│       ├── OfflineStorage.ts         # Existing
│       ├── LocationService.ts        # Existing
│       ├── ShiftService.ts           # NEW
│       ├── SwapService.ts            # NEW
│       ├── TimesheetService.ts       # NEW
│       └── ReconciliationService.ts  # NEW
```

## Existing Backend APIs (Ready to Use)

These endpoints are already implemented and mobile-ready:

### Time Tracking
- `GET /api/time-tracking/status` - Get current clock status
- `POST /api/time-tracking/clock-in` - Clock in (supports mobile session)
- `POST /api/time-tracking/clock-out` - Clock out (supports mobile session)
- `POST /api/time-tracking/sync` - Sync offline actions
- `POST /api/time-tracking/employee-manual-entry` - Manual time entry

### Shifts
- `GET /api/shifts` - List shifts (filter by employeeId, dates)
- `GET /api/shifts/[id]` - Get shift details
- `GET /api/shifts/today` - Get today's shifts

### Shift Swaps
- `GET /api/shift-swaps` - List swap requests
- `POST /api/shift-swaps` - Create swap request
- `POST /api/shift-swaps/[id]/accept` - Accept swap
- `POST /api/shift-swaps/[id]/reject` - Reject swap
- `DELETE /api/shift-swaps/[id]` - Cancel swap

### Timesheets
- `GET /api/timesheets` - List timesheets
- `POST /api/timesheets/[id]/approve` - Approve timesheet

### Reconciliation (Admin)
- `GET /api/reconciliation/stats` - Weekly stats
- `GET /api/reconciliation/day/[date]` - Day's entries
- `POST /api/reconciliation/bulk-approve` - Bulk approve
- `POST /api/reconciliation/edit-clock-entry` - Edit entry
- `POST /api/reconciliation/adjust` - Adjust entry

## Key Design Principles

1. **Offline-First**: All clock actions must work offline and sync later
2. **One-Tap Actions**: Clock in/out should be instant with minimal friction
3. **Visual Feedback**: Use haptics, animations, and clear status indicators
4. **Error Recovery**: Clear error messages with retry options
5. **Tenant Isolation**: All queries must include companyId validation
6. **Audit Logging**: Log all time-sensitive actions for compliance

## Testing Requirements

Each phase must include:
1. Unit tests for new services
2. Component tests for new UI components
3. Integration tests for API calls
4. Offline mode testing
5. Error handling verification

## Dependencies

The mobile app uses:
- React Native with Expo
- React Navigation for routing
- Expo SecureStore for offline storage
- Expo Location for GPS
- React Native Paper for UI components

## Getting Started

1. Read this overview completely
2. Start with `mobile-ta-01-api-services.md`
3. Complete each workflow in order
4. Test thoroughly before moving to next phase
5. Commit after each completed phase
