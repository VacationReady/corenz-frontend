# Mobile Clock In/Out - Architecture Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      MOBILE APP (React Native)               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │           HOME SCREEN (Landing Page)                │    │
│  │                                                      │    │
│  │  ┌────────────────────────────────────────────┐   │    │
│  │  │         CLOCK WIDGET                       │   │    │
│  │  │  ┌──────────────────────────────────┐     │   │    │
│  │  │  │  [Icon]  Clock In         [→]   │     │   │    │
│  │  │  │          Tap to Start            │     │   │    │
│  │  │  │          Your Shift              │     │   │    │
│  │  │  └──────────────────────────────────┘     │   │    │
│  │  │         (Blue Gradient)                    │   │    │
│  │  │                                            │   │    │
│  │  │  OR when clocked in:                      │   │    │
│  │  │                                            │   │    │
│  │  │  ┌──────────────────────────────────┐     │   │    │
│  │  │  │  [✓]  Clocked In          [→]   │     │   │    │
│  │  │  │       ⏱ 02:34:15                │     │   │    │
│  │  │  │       Tap to Clock Out           │     │   │    │
│  │  │  └──────────────────────────────────┘     │   │    │
│  │  │         (Green Gradient)                   │   │    │
│  │  └────────────────────────────────────────────┘   │    │
│  │                                                      │    │
│  │  [Stats Grid]  [Quick Actions]  [Pending Items]    │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │        BOTTOM NAVIGATION                            │    │
│  │  [Home]  [Clock]  [Leave]  [Team]  [More]         │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       │ HTTPS/REST API
                       │
┌──────────────────────▼───────────────────────────────────────┐
│                   API LAYER (Next.js)                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  GET  /api/time-tracking/status                             │
│       → Returns: { isClockedIn, activeEntry, duration }     │
│                                                              │
│  POST /api/time-tracking/clock-in                           │
│       ← Body: { location, photoUrl, notes }                 │
│       → Returns: { success, clockEntry }                    │
│                                                              │
│  POST /api/time-tracking/clock-out                          │
│       ← Body: { location, photoUrl, notes }                 │
│       → Returns: { success, clockEntry, hoursWorked }       │
│                                                              │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       │ Prisma ORM
                       │
┌──────────────────────▼───────────────────────────────────────┐
│                   DATABASE (PostgreSQL)                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  TABLE: ClockEntry                                           │
│  ┌────────────────────────────────────────────────────┐    │
│  │ id                  String   @id                   │    │
│  │ employeeId          String                         │    │
│  │ companyId           String                         │    │
│  │ clockInTime         DateTime                       │    │
│  │ clockOutTime        DateTime?                      │    │
│  │ clockInLocation     Json?                          │    │
│  │ clockOutLocation    Json?                          │    │
│  │ status              String   (ACTIVE/COMPLETED)    │    │
│  │ ipAddress           String?                        │    │
│  │ deviceInfo          Json?                          │    │
│  │ notes               String?                        │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       │ Real-time Query
                       │
┌──────────────────────▼───────────────────────────────────────┐
│                DESKTOP APP (Next.js Web)                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  /timesheets Page                                            │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Employee Timesheets                               │    │
│  │  ┌──────────────────────────────────────────────┐ │    │
│  │  │ Date       Clock In   Clock Out   Hours      │ │    │
│  │  │ Nov 17     09:00 AM   05:30 PM    8.5h      │ │    │
│  │  │ Nov 17     09:00 AM   ACTIVE      2h 34m    │ │    │
│  │  │            ↑ From Mobile App                 │ │    │
│  │  └──────────────────────────────────────────────┘ │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Component Architecture

```
ClockWidget.tsx
├── State Management
│   ├── status (isClockedIn, activeEntry, duration)
│   ├── loading (initial load)
│   ├── actionLoading (clock in/out action)
│   └── liveTime (real-time timer)
│
├── Effects
│   ├── loadStatus() - Fetch current status every 30s
│   └── updateLiveTime() - Update timer every 1s
│
├── Handlers
│   ├── handleClockIn()
│   │   ├── Request location permission
│   │   ├── Call clockInOffline()
│   │   ├── Show success/error alert
│   │   └── Refresh status
│   │
│   └── handleClockOut()
│       ├── Call clockOutOffline()
│       ├── Show success with duration
│       └── Refresh status
│
└── UI Rendering
    ├── Loading state (spinner)
    ├── Gradient button (blue/green)
    ├── Status text
    ├── Live timer (if clocked in)
    └── Action text
```

## Data Flow Diagram

```
┌─────────────┐
│   Mobile    │
│   Device    │
└──────┬──────┘
       │
       │ 1. User taps "Clock In"
       │
       ▼
┌─────────────────────────┐
│  ClockWidget Component  │
│  - handleClockIn()      │
└──────┬──────────────────┘
       │
       │ 2. Request GPS location
       │
       ▼
┌─────────────────────────┐
│  LocationService        │
│  - getCurrentLocation() │
└──────┬──────────────────┘
       │
       │ 3. Location data
       │
       ▼
┌─────────────────────────┐
│  OfflineClockService    │
│  - clockInOffline()     │
└──────┬──────────────────┘
       │
       │ 4. Check online status
       │
       ├─── Online ────────────────┐
       │                            │
       │ 5. POST request            ▼
       │                    ┌───────────────┐
       │                    │  API Client   │
       │                    │  - post()     │
       │                    └───────┬───────┘
       │                            │
       │                            │ 6. HTTP POST
       │                            │
       │                            ▼
       │                    ┌───────────────────────┐
       │                    │  /api/time-tracking/  │
       │                    │  clock-in/route.ts    │
       │                    └───────┬───────────────┘
       │                            │
       │                            │ 7. Validate & create
       │                            │
       │                            ▼
       │                    ┌───────────────────────┐
       │                    │  Prisma Client        │
       │                    │  ClockEntry.create()  │
       │                    └───────┬───────────────┘
       │                            │
       │                            │ 8. INSERT INTO
       │                            │
       │                            ▼
       │                    ┌───────────────────────┐
       │                    │  PostgreSQL Database  │
       │                    │  ClockEntry table     │
       │                    └───────┬───────────────┘
       │                            │
       │ 9. Success response        │
       │ ◄──────────────────────────┘
       │
       ▼
┌─────────────────────────┐
│  ClockWidget            │
│  - Update UI            │
│  - Start live timer     │
└─────────────────────────┘
       │
       │ 10. Timer updates every 1s
       │
       ▼
┌─────────────────────────┐
│  Display: 00:00:01      │
│           00:00:02      │
│           00:00:03      │
│           ...           │
└─────────────────────────┘

Meanwhile...

┌─────────────────────────┐
│  Desktop App            │
│  /timesheets page       │
└──────┬──────────────────┘
       │
       │ 11. Query database
       │
       ▼
┌─────────────────────────┐
│  PostgreSQL Database    │
│  SELECT * FROM          │
│  ClockEntry             │
└──────┬──────────────────┘
       │
       │ 12. Return entries
       │
       ▼
┌─────────────────────────┐
│  Desktop UI             │
│  Shows mobile entry     │
│  in real-time           │
└─────────────────────────┘
```

## Offline Flow

```
┌─────────────┐
│   Mobile    │
│   (Offline) │
└──────┬──────┘
       │
       │ 1. User taps "Clock In"
       │
       ▼
┌─────────────────────────┐
│  OfflineClockService    │
│  - Detects offline      │
└──────┬──────────────────┘
       │
       │ 2. Queue action
       │
       ▼
┌─────────────────────────┐
│  OfflineStorage         │
│  - AsyncStorage         │
│  - Save pending action  │
└──────┬──────────────────┘
       │
       │ 3. Show offline indicator
       │
       ▼
┌─────────────────────────┐
│  ClockWidget            │
│  "Clocked In (Offline)" │
└─────────────────────────┘
       │
       │ ... Time passes ...
       │
       │ 4. Connection restored
       │
       ▼
┌─────────────────────────┐
│  OfflineClockService    │
│  - autoSync()           │
└──────┬──────────────────┘
       │
       │ 5. Retrieve pending actions
       │
       ▼
┌─────────────────────────┐
│  OfflineStorage         │
│  - getPendingActions()  │
└──────┬──────────────────┘
       │
       │ 6. Sync each action
       │
       ▼
┌─────────────────────────┐
│  API Client             │
│  POST /clock-in         │
└──────┬──────────────────┘
       │
       │ 7. Success
       │
       ▼
┌─────────────────────────┐
│  OfflineStorage         │
│  - markActionSynced()   │
│  - Remove from queue    │
└─────────────────────────┘
```

## Security Flow

```
┌─────────────┐
│   Mobile    │
│   App       │
└──────┬──────┘
       │
       │ 1. User logs in
       │
       ▼
┌─────────────────────────┐
│  Auth Service           │
│  - Credentials auth     │
└──────┬──────────────────┘
       │
       │ 2. Session token
       │
       ▼
┌─────────────────────────┐
│  SecureStore            │
│  - Save token securely  │
└──────┬──────────────────┘
       │
       │ 3. Clock in request
       │
       ▼
┌─────────────────────────┐
│  API Client             │
│  - Attach token         │
│  - Add to Cookie header │
└──────┬──────────────────┘
       │
       │ 4. HTTPS request
       │
       ▼
┌─────────────────────────┐
│  API Route              │
│  - Verify session       │
│  - Check permissions    │
└──────┬──────────────────┘
       │
       │ 5. Get employee ID
       │
       ▼
┌─────────────────────────┐
│  Database               │
│  - Scope by companyId   │
│  - Validate employeeId  │
└──────┬──────────────────┘
       │
       │ 6. Create entry
       │
       ▼
┌─────────────────────────┐
│  ClockEntry             │
│  - Encrypted location   │
│  - Audit trail          │
└─────────────────────────┘
```

## Performance Optimization

```
┌─────────────────────────┐
│  Widget Load Time       │
│  < 100ms                │
└─────────────────────────┘
       │
       ├── Initial render (instant)
       │   └── Show loading state
       │
       ├── API call (< 500ms)
       │   └── Fetch clock status
       │
       └── Update UI (instant)
           └── Show current status

┌─────────────────────────┐
│  Live Timer Updates     │
│  Every 1 second         │
└─────────────────────────┘
       │
       ├── Calculate duration
       │   └── (now - clockInTime)
       │
       ├── Format time
       │   └── HH:MM:SS
       │
       └── Update display
           └── Minimal re-render

┌─────────────────────────┐
│  Status Refresh         │
│  Every 30 seconds       │
└─────────────────────────┘
       │
       ├── Background fetch
       │   └── Don't block UI
       │
       └── Update if changed
           └── Prevent unnecessary renders
```

## Multi-Tenant Architecture

```
┌─────────────────────────────────────────────────┐
│              Company A                          │
│  ┌─────────────┐  ┌─────────────┐             │
│  │ Employee 1  │  │ Employee 2  │             │
│  │ Mobile App  │  │ Mobile App  │             │
│  └──────┬──────┘  └──────┬──────┘             │
│         │                 │                     │
│         └────────┬────────┘                     │
│                  │                              │
└──────────────────┼──────────────────────────────┘
                   │
                   │ companyId: "company-a"
                   │
┌──────────────────▼──────────────────────────────┐
│              API Layer                          │
│  - Extract companyId from session               │
│  - Scope all queries by companyId               │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│              Database                           │
│  ClockEntry WHERE companyId = "company-a"       │
└─────────────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│         Company A Desktop App                   │
│  - Only sees Company A data                     │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│              Company B                          │
│  (Completely isolated)                          │
└─────────────────────────────────────────────────┘
```

## Summary

This architecture provides:
- ✅ **Real-time sync** between mobile and desktop
- ✅ **Offline support** with automatic sync
- ✅ **Security** through session-based auth
- ✅ **Multi-tenancy** with company isolation
- ✅ **Performance** with optimized updates
- ✅ **Scalability** through REST API design
- ✅ **Reliability** with error handling
- ✅ **User experience** with live updates
