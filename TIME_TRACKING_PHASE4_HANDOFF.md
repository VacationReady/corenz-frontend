# Time Tracking System - Phase 4 Implementation Handoff

## 🎯 Mission
Implement Phase 4 (Settings, Payroll Export, Admin Hub & Geofencing) for the enterprise-grade time tracking & scheduling system in Corenz (Next.js 15 + React 19 + Prisma HR platform). Phases 1-3 are **COMPLETE**.

---

## ✅ COMPLETED PHASES

### Phase 1: Timesheet Approval System ✅
- Timesheet CRUD, submission, approval workflows
- Multi-stage approval (SEQUENTIAL, UNANIMOUS, FIRST_RESPONDER)
- Email notifications and audit logging
- Employee timesheet hub page

### Phase 2: Rota/Shift Management ✅
- Shift CRUD operations (create, edit, delete, publish)
- Bulk shift creation from templates
- Conflict detection (double-booking, rest periods, overtime, skills)
- Manager rota calendar interface
- Labor cost tracking and reporting

### Phase 3: Shift Swaps & Availability ✅
- Shift swap requests (targeted + open swaps)
- Accept/reject/approve workflows with manager approval
- Email notifications for all swap events
- Weekly availability pattern management
- One-time availability exceptions
- Team availability grid for managers
- Conflict detection integration
- Employee schedule hub page

---

## 🎯 PHASE 4 OBJECTIVES

### 1. Time Tracking Settings Page
Central configuration hub for all time tracking features with beautiful UI.

### 2. Payroll Export System
Export timesheet data in multiple formats for payroll processing.

### 3. Admin Timesheet Hub
Bulk approval interface for managers to process multiple timesheets efficiently.

### 4. Geofence Management
Visual map interface for managing clock-in/out location boundaries.

---

## 📊 DATABASE SCHEMA

### Existing Tables to Use

#### `TimeTrackingSettings` (already exists)
```prisma
model TimeTrackingSettings {
  id                      String   @id @default(cuid())
  companyId               String   @unique
  company                 Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  // Timesheet settings
  defaultApprovalWorkflow ApprovalWorkflowType @default(SEQUENTIAL)
  requirePhotos           Boolean  @default(false)
  enableGPSTracking       Boolean  @default(false)
  allowManualEntry        Boolean  @default(true)
  
  // Shift settings
  minimumRestHours        Int      @default(11)
  overtimeThreshold       Int      @default(40)
  requireShiftConfirmation Boolean @default(false)
  managerApprovalSwaps    Boolean  @default(true)
  
  // Clock in/out settings
  enableGeofencing        Boolean  @default(false)
  geofenceRadius          Int      @default(100) // meters
  requireBreaks           Boolean  @default(true)
  minBreakDuration        Int      @default(30) // minutes
  
  // Export settings
  payrollExportFormat     String   @default("CSV") // CSV, EXCEL, JSON
  includeBreaks           Boolean  @default(true)
  includeNotes            Boolean  @default(true)
  
  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt
}
```

#### `Location` (already exists - use for geofences)
```prisma
model Location {
  id              String   @id @default(cuid())
  companyId       String
  company         Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  name            String
  address         String?
  latitude        Float?
  longitude       Float?
  geofenceRadius  Int?     // Override company default
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  Shift           Shift[]
  TimeEntry       TimeEntry[]
}
```

**No new tables needed!** All required fields already exist in the schema.

---

## 🛠️ IMPLEMENTATION TASKS

## Task 1: Time Tracking Settings Page

### API Route
**File:** `app/api/settings/time-tracking/route.ts`

**Endpoints:**
- `GET` - Fetch current settings
- `PUT` - Update settings

**Features:**
- Company-scoped settings
- Validation with Zod schemas
- Audit logging for changes
- Default creation if not exists

**Validation Schema:**
```typescript
const settingsUpdateSchema = z.object({
  // Timesheet settings
  defaultApprovalWorkflow: z.enum(['SEQUENTIAL', 'UNANIMOUS', 'FIRST_RESPONDER']).optional(),
  requirePhotos: z.boolean().optional(),
  enableGPSTracking: z.boolean().optional(),
  allowManualEntry: z.boolean().optional(),
  
  // Shift settings
  minimumRestHours: z.number().int().min(0).max(24).optional(),
  overtimeThreshold: z.number().int().min(20).max(80).optional(),
  requireShiftConfirmation: z.boolean().optional(),
  managerApprovalSwaps: z.boolean().optional(),
  
  // Clock in/out settings
  enableGeofencing: z.boolean().optional(),
  geofenceRadius: z.number().int().min(50).max(5000).optional(),
  requireBreaks: z.boolean().optional(),
  minBreakDuration: z.number().int().min(0).max(120).optional(),
  
  // Export settings
  payrollExportFormat: z.enum(['CSV', 'EXCEL', 'JSON']).optional(),
  includeBreaks: z.boolean().optional(),
  includeNotes: z.boolean().optional(),
});
```

**Permissions:**
- ADMIN only
- Company scoping enforced

---

### UI Component
**File:** `app/(withSidebar)/admin/settings/time-tracking/page.tsx`

**Sections:**

1. **Timesheet Settings**
   - Default approval workflow selector
   - Photo requirement toggle
   - GPS tracking toggle
   - Manual entry toggle

2. **Shift Management Settings**
   - Minimum rest hours slider (0-24)
   - Overtime threshold slider (20-80)
   - Shift confirmation requirement toggle
   - Manager swap approval toggle

3. **Clock In/Out Settings**
   - Geofencing enable/disable
   - Geofence radius slider (50m-5km)
   - Break requirement toggle
   - Minimum break duration slider

4. **Payroll Export Settings**
   - Export format selector (CSV/Excel/JSON)
   - Include breaks toggle
   - Include notes toggle

**Features:**
- Tabbed interface for organization
- Live preview of changes
- Save/Cancel buttons
- Success/error notifications
- Help tooltips for each setting
- Reset to defaults option

**Design:**
- Glassmorphism cards
- Toggle switches with animations
- Sliders with value display
- Gradient save button
- Info icons with popovers

---

## Task 2: Payroll Export System

### API Route
**File:** `app/api/payroll/export/route.ts`

**Endpoint:** `POST /api/payroll/export`

**Request Body:**
```typescript
{
  startDate: string; // ISO date
  endDate: string; // ISO date
  format: 'CSV' | 'EXCEL' | 'JSON';
  departmentId?: string; // Optional filter
  employeeIds?: string[]; // Optional filter
  includeBreaks?: boolean;
  includeNotes?: boolean;
}
```

**Response:**
- CSV: Stream file download
- Excel: Stream .xlsx file download
- JSON: Return structured data

**Data Structure:**

**CSV/Excel Columns:**
```
Employee ID
Employee Name
Department
Date
Clock In
Clock Out
Break Duration (mins)
Total Hours
Overtime Hours
Hourly Rate
Total Cost
Location
Notes
Status
Approved By
Approved At
```

**JSON Structure:**
```json
{
  "exportDate": "2025-10-12T17:30:00Z",
  "periodStart": "2025-10-01",
  "periodEnd": "2025-10-31",
  "totalEmployees": 45,
  "totalHours": 7200,
  "totalCost": 180000,
  "employees": [
    {
      "employeeId": "emp_123",
      "name": "John Doe",
      "email": "john@company.com",
      "department": "Engineering",
      "entries": [
        {
          "date": "2025-10-01",
          "clockIn": "09:00:00",
          "clockOut": "17:30:00",
          "breakDuration": 30,
          "totalHours": 8.0,
          "overtimeHours": 0,
          "hourlyRate": 25.00,
          "totalCost": 200.00,
          "location": "Main Office",
          "notes": "Regular shift",
          "status": "APPROVED",
          "approvedBy": "Manager Name",
          "approvedAt": "2025-10-05T10:00:00Z"
        }
      ],
      "summary": {
        "totalHours": 160,
        "overtimeHours": 8,
        "totalCost": 4200
      }
    }
  ]
}
```

**Features:**
- Date range validation
- Department/employee filtering
- Rate calculation from employee records
- Overtime calculation (hours over threshold)
- Status filtering (only approved timesheets)
- Streaming for large datasets
- Audit logging of exports

**Permissions:**
- ADMIN only
- Company scoping enforced

---

### Helper Library
**File:** `lib/payroll-export.ts`

**Functions:**

1. `generateCSV(data, options)` - Generate CSV string
2. `generateExcel(data, options)` - Generate .xlsx buffer
3. `generateJSON(data, options)` - Generate structured JSON
4. `calculateOvertimeHours(hours, threshold)` - Calculate overtime
5. `aggregateEmployeeData(entries)` - Aggregate by employee
6. `formatPayrollData(timeEntries, employees)` - Transform data

**Dependencies:**
- `csv-stringify` for CSV generation
- `exceljs` for Excel generation
- `date-fns` for date handling

---

### UI Component
**File:** `app/(withSidebar)/admin/payroll/page.tsx`

**Features:**

1. **Export Configuration Panel**
   - Date range picker (start/end)
   - Format selector (CSV/Excel/JSON)
   - Department filter (dropdown)
   - Employee multi-select (optional)
   - Include breaks toggle
   - Include notes toggle

2. **Preview Section**
   - Summary statistics:
     - Total employees
     - Total hours
     - Overtime hours
     - Total cost
   - Sample data table (first 10 rows)

3. **Export Actions**
   - "Generate Preview" button
   - "Download Export" button
   - "Email to Payroll" button (optional)

4. **Recent Exports List**
   - Export history with:
     - Date range
     - Format
     - Generated by
     - Download link
     - Row count

**Design:**
- Glassmorphism cards
- Calendar date picker with range selection
- Multi-select dropdown with search
- Download button with loading state
- Table with sortable columns
- Empty state for no data

---

## Task 3: Admin Timesheet Hub

### API Routes

#### 3.1 Bulk Fetch Pending Timesheets
**File:** `app/api/timesheets/pending/route.ts`

**Endpoint:** `GET /api/timesheets/pending`

**Query Params:**
- `departmentId` (optional)
- `startDate` (optional)
- `endDate` (optional)
- `limit` (default: 50)
- `offset` (default: 0)

**Response:**
```json
{
  "timesheets": [...],
  "total": 125,
  "hasMore": true
}
```

**Features:**
- Only return timesheets awaiting current user's approval
- Include employee, department, and manager info
- Sort by oldest submission first
- Pagination support

---

#### 3.2 Bulk Approve Timesheets
**File:** `app/api/timesheets/bulk-approve/route.ts`

**Endpoint:** `POST /api/timesheets/bulk-approve`

**Request Body:**
```typescript
{
  timesheetIds: string[];
  comment?: string;
}
```

**Features:**
- Validate all timesheets exist
- Verify user has approval permission for each
- Process approvals in transaction
- Send email notifications
- Create audit logs
- Return success/failure for each

**Response:**
```json
{
  "succeeded": ["ts_1", "ts_2"],
  "failed": [
    {
      "timesheetId": "ts_3",
      "error": "Already approved"
    }
  ],
  "summary": {
    "total": 10,
    "succeeded": 8,
    "failed": 2
  }
}
```

---

#### 3.3 Bulk Reject Timesheets
**File:** `app/api/timesheets/bulk-reject/route.ts`

**Endpoint:** `POST /api/timesheets/bulk-reject`

**Request Body:**
```typescript
{
  timesheetIds: string[];
  reason: string; // Required for bulk rejection
}
```

**Features:**
- Require rejection reason
- Same validation as bulk approve
- Transaction processing
- Email notifications
- Audit logging

---

### UI Component
**File:** `app/(withSidebar)/admin/timesheets/hub/page.tsx`

**Features:**

1. **Filter Bar**
   - Department selector
   - Date range picker
   - Status filter (Pending/All)
   - Employee search

2. **Bulk Actions Toolbar**
   - Select all checkbox
   - Selected count display
   - "Approve Selected" button
   - "Reject Selected" button
   - "Clear Selection" button

3. **Timesheet Table**
   - Checkbox column for selection
   - Employee name + avatar
   - Department
   - Date range
   - Total hours
   - Status badge
   - Submitted date
   - Individual approve/reject buttons
   - "View Details" link

4. **Quick Preview Panel** (Slide-over)
   - Employee details
   - Full timesheet breakdown
   - Notes/comments
   - Approval history
   - Quick approve/reject buttons

5. **Statistics Cards**
   - Total pending count
   - Average hours per employee
   - Total hours pending approval
   - Oldest pending submission

**Design:**
- Data table with sticky header
- Checkbox with indeterminate state
- Bulk action bar fixed at top when items selected
- Row hover effects
- Status badges with colors
- Avatar with fallback initials
- Slide-over panel with backdrop blur
- Infinite scroll or pagination

**Interactions:**
- Click row to open quick preview
- Shift+click for range selection
- Keyboard shortcuts (Ctrl+A, Escape)
- Confirmation modal for bulk rejection

---

## Task 4: Geofence Management

### API Routes

#### 4.1 Location CRUD with Geofencing
**File:** `app/api/locations/route.ts` (Enhance existing)

**Add to existing GET:**
- Include geofence data (latitude, longitude, radius)
- Filter active locations only

**Add to existing POST:**
- Validate geofence coordinates
- Set default radius from settings

**Features:**
- Geofence radius validation (50m - 5km)
- Coordinate validation (-90 to 90 lat, -180 to 180 lng)
- Company scoping

---

#### 4.2 Geofence Validation Endpoint
**File:** `app/api/locations/validate-geofence/route.ts`

**Endpoint:** `POST /api/locations/validate-geofence`

**Request Body:**
```typescript
{
  locationId: string;
  latitude: number;
  longitude: number;
}
```

**Response:**
```json
{
  "isWithinGeofence": true,
  "distance": 45.2, // meters
  "location": {
    "name": "Main Office",
    "address": "123 Main St"
  }
}
```

**Features:**
- Haversine distance calculation
- Compare against location's geofence radius
- Return distance in meters
- Used for clock in/out validation

---

### Helper Library
**File:** `lib/geofence.ts`

**Functions:**

1. `calculateDistance(lat1, lon1, lat2, lon2)` - Haversine formula
   ```typescript
   // Returns distance in meters
   export function calculateDistance(
     lat1: number,
     lon1: number,
     lat2: number,
     lon2: number
   ): number {
     const R = 6371e3; // Earth radius in meters
     const φ1 = (lat1 * Math.PI) / 180;
     const φ2 = (lat2 * Math.PI) / 180;
     const Δφ = ((lat2 - lat1) * Math.PI) / 180;
     const Δλ = ((lon2 - lon1) * Math.PI) / 180;

     const a =
       Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
       Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
     const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

     return R * c;
   }
   ```

2. `isWithinGeofence(userLat, userLon, locationId)` - Check if inside fence

3. `validateCoordinates(lat, lng)` - Validate coordinate ranges

4. `getNearestLocation(lat, lng, locations)` - Find closest location

---

### UI Component
**File:** `app/(withSidebar)/admin/locations/page.tsx`

**Features:**

1. **Interactive Map** (using Leaflet or Mapbox)
   - Display all locations as markers
   - Show geofence circles
   - Click marker to view/edit
   - Drag marker to change position
   - Resize circle to adjust radius
   - Current user location indicator

2. **Location List Sidebar**
   - Search/filter locations
   - Location cards with:
     - Name
     - Address
     - Geofence radius
     - Active status toggle
     - Edit button
     - Delete button
   - "Add Location" button

3. **Location Form Modal**
   - Name input (required)
   - Address input with autocomplete (Google Places API)
   - Coordinates (auto-fill from address, or manual)
   - Geofence radius slider (50m - 5km)
   - Active toggle
   - Map preview showing location + geofence
   - Save/Cancel buttons

4. **Geofence Settings Panel**
   - Enable/disable geofencing globally
   - Default geofence radius
   - Geofence enforcement level:
     - Warning only
     - Block clock in/out
   - Link to time tracking settings

**Design:**
- Full-width map with sidebar overlay
- Leaflet.js or Mapbox GL JS for map
- Custom map markers with company branding
- Geofence circles with transparency
- Distance ruler tool
- Satellite/street view toggle
- Zoom controls
- Current location button

**Interactions:**
- Click map to add new location
- Drag markers to reposition
- Drag circle edge to resize geofence
- Click marker to show popup with details
- Double-click to edit
- Right-click for context menu

---

## 🎨 DESIGN SYSTEM

### Color Palette
- **Primary:** Blue gradient (#3B82F6 → #8B5CF6)
- **Success:** Green (#10B981)
- **Warning:** Amber (#F59E0B)
- **Danger:** Red (#EF4444)
- **Glassmorphism:** `bg-white/10 backdrop-blur-md border border-white/20`

### Components to Use
- Shadcn UI components (already in project)
- Data tables with sorting/filtering
- Modal dialogs
- Slide-over panels
- Toggle switches
- Sliders with tooltips
- Calendar/date pickers
- Multi-select dropdowns
- Interactive maps (Leaflet/Mapbox)

---

## 📦 DEPENDENCIES TO INSTALL

```bash
npm install exceljs csv-stringify leaflet react-leaflet @types/leaflet
```

**Optional:**
```bash
npm install mapbox-gl @mapbox/mapbox-gl-geocoder # If using Mapbox
```

---

## 🔒 SECURITY & PERMISSIONS

### Permission Matrix

| Feature | Employee | Manager | Admin |
|---------|----------|---------|-------|
| View Settings | ❌ | ❌ | ✅ |
| Update Settings | ❌ | ❌ | ✅ |
| Export Payroll | ❌ | Own Dept | All |
| Bulk Approve | ❌ | Own Dept | All |
| Manage Geofences | ❌ | View Only | ✅ |

### Validation Rules
1. All API routes check `getServerSession`
2. Company scoping on all queries
3. Role validation for admin operations
4. Department scoping for managers
5. Audit logging for all settings changes
6. Rate limiting on export endpoints

---

## 🧪 TESTING CHECKLIST

### Settings Page
- [ ] Load current settings successfully
- [ ] Update each setting individually
- [ ] Update multiple settings at once
- [ ] Validate minimum/maximum values
- [ ] Prevent unauthorized access
- [ ] Show success notification on save
- [ ] Handle API errors gracefully
- [ ] Reset to defaults works

### Payroll Export
- [ ] Export CSV format
- [ ] Export Excel format
- [ ] Export JSON format
- [ ] Filter by date range
- [ ] Filter by department
- [ ] Filter by employees
- [ ] Calculate overtime correctly
- [ ] Include/exclude breaks
- [ ] Include/exclude notes
- [ ] Handle large datasets (1000+ entries)
- [ ] Audit log created for exports

### Admin Timesheet Hub
- [ ] Load pending timesheets
- [ ] Filter by department
- [ ] Filter by date range
- [ ] Select individual timesheets
- [ ] Select all timesheets
- [ ] Bulk approve 10+ timesheets
- [ ] Bulk reject with reason
- [ ] Send email notifications
- [ ] Quick preview opens
- [ ] Pagination works
- [ ] Statistics accurate

### Geofence Management
- [ ] Map loads locations
- [ ] Geofence circles display
- [ ] Add new location
- [ ] Edit existing location
- [ ] Delete location
- [ ] Address autocomplete works
- [ ] Drag marker updates coordinates
- [ ] Resize geofence circle
- [ ] Validate geofence API works
- [ ] Distance calculation accurate
- [ ] Current location detection

---

## 🎯 SUCCESS CRITERIA

Phase 4 is complete when:

1. ✅ **Settings Page:** Admin can view and update all time tracking settings with validation
2. ✅ **Payroll Export:** System can export timesheet data in CSV, Excel, and JSON formats with filters
3. ✅ **Admin Hub:** Managers can bulk approve/reject timesheets with proper notifications
4. ✅ **Geofences:** Admin can manage location geofences with visual map interface
5. ✅ **Validation:** Geofence validation works for clock in/out operations
6. ✅ **Security:** All endpoints have proper authentication and authorization
7. ✅ **Audit:** All admin actions are logged for compliance
8. ✅ **UX:** All UI components follow glassmorphism design system
9. ✅ **Mobile:** All pages are responsive and mobile-friendly
10. ✅ **Testing:** All features tested with edge cases

---

## 📊 ESTIMATED EFFORT

- **Settings Page:** 4-6 hours
- **Payroll Export:** 6-8 hours
- **Admin Timesheet Hub:** 8-10 hours
- **Geofence Management:** 10-12 hours
- **Testing & Polish:** 4-6 hours

**Total:** ~32-42 hours

---

## 🚀 IMPLEMENTATION ORDER

1. **Start:** Time Tracking Settings (easiest, foundational)
2. **Next:** Payroll Export (medium complexity, high value)
3. **Then:** Admin Timesheet Hub (builds on existing timesheet system)
4. **Finally:** Geofence Management (most complex, requires map integration)

---

## 📝 NOTES

### Integration Points
- Settings affect behavior across all time tracking features
- Payroll export uses approved timesheets from Phase 1
- Admin hub uses approval workflows from Phase 1
- Geofences integrate with future mobile clock in/out (Phase 5)

### Best Practices
- Use React Query for data fetching and caching
- Implement optimistic updates for better UX
- Add loading skeletons for all data tables
- Use debouncing for search/filter inputs
- Implement virtual scrolling for large lists
- Cache map tiles for offline support
- Add keyboard shortcuts for power users

### Future Enhancements (Post-Phase 4)
- Automated payroll sync with external systems
- Advanced analytics dashboard
- Bulk schedule templates
- Shift trading marketplace
- Mobile app geofence integration
- Real-time location tracking (optional)

---

## 🎉 READY TO BUILD

Phase 4 will complete the **admin and configuration layer** of the time tracking system, providing:
- ✅ Full system configuration control
- ✅ Payroll integration capabilities
- ✅ Efficient bulk operations
- ✅ Advanced location management

**After Phase 4, only Phase 5 (Mobile App) remains to complete the entire time tracking system!**

---

**Status:** 📋 READY FOR IMPLEMENTATION  
**Priority:** 🔥 HIGH  
**Complexity:** ⭐⭐⭐⭐ (4/5)  
**Dependencies:** Phases 1-3 Complete ✅
