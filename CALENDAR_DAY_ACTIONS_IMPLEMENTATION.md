# Calendar Day Actions Implementation

## Overview
Enhanced the calendar day-click functionality to provide admins/managers with two options when clicking on a day:
1. **Book Leave** for an employee
2. **Block Day** (blackout)

## Changes Made

### New Components

#### 1. `DayActionSheet.tsx`
- Bottom sheet that appears when clicking a calendar day
- Displays two large, clear action buttons:
  - **Book Leave**: Opens employee selection and booking flow
  - **Block Day**: Opens blackout management modal
- Modern card-based UI with icons and descriptions

#### 2. `QuickLeaveBookingModal.tsx`
- Quick leave booking modal for admins/managers
- Features:
  - Searchable employee dropdown with avatars
  - Department display for easy identification
  - Leave type selection with icons
  - Pre-filled dates from clicked calendar day
  - Optional reason field
  - Real-time search/filter across 1000+ employees
- Uses Command component for fast employee search

### Updated Components

#### `calendar/page.tsx`
- Added `DayActionSheet` component
- Updated `handleDateClick` to:
  - Show action sheet instead of directly opening blackout modal
  - Respect employee role (employees can't perform admin actions)
- Calendar refresh properly triggered after booking leave

### User Experience Flow

1. **Admin/Manager clicks a day** → Action sheet appears
2. **Choose "Book Leave"**:
   - Search and select employee
   - Select leave type
   - Dates pre-filled (can be adjusted)
   - Add optional reason
   - Click "Book Leave"
   - Calendar refreshes automatically
3. **Choose "Block Day"**:
   - Opens the beautiful blackout management modal
   - Can block all events or specific categories
   - Add to current blackouts list

### Permissions
- Action sheet only appears for ADMIN, SUPER_ADMIN, and MANAGER roles
- Employees cannot access day-click actions
- All actions respect existing RBAC and tenant isolation

### Features
- ✅ Quick employee search (handles 1000+ employees)
- ✅ Avatar display for easy identification
- ✅ Department context in employee list
- ✅ Pre-filled dates from calendar click
- ✅ Icon-based leave type selection
- ✅ Automatic calendar refresh
- ✅ Error handling and validation
- ✅ Loading states
- ✅ Toast notifications
- ✅ Mobile-responsive design

## Technical Details

### API Endpoints Used
- `POST /api/employees/[id]/leave-requests` - Book leave
- `POST /api/blackout-days/create` - Block day
- `GET /api/employees?limit=1000` - Employee list
- `GET /api/event-categories` - Leave types

### State Management
- `dayActionSheetOpen` - Controls action sheet visibility
- `blackoutModalOpen` - Controls blackout modal visibility
- `selectedDate` - Tracks clicked date across components

### Component Dependencies
- Command (searchable dropdown)
- Popover (dropdown positioning)
- Sheet (bottom drawer)
- Dialog (modal dialogs)
- Avatar (employee photos)
- Icons (visual indicators)

## Benefits

1. **Streamlined Workflow**: Admins can book leave directly from calendar view
2. **Maintained Functionality**: Blackout day feature still easily accessible
3. **Better UX**: Clear action choices with visual indicators
4. **Fast Search**: Efficient employee lookup even with large teams
5. **Context Preserved**: Clicked date automatically used
6. **Role-Based**: Only shown to users with appropriate permissions

## Future Enhancements
- Add "Add Public Holiday" option to action sheet
- Bulk booking from calendar view
- Quick view of employee's leave balance before booking
- Drag-and-drop leave booking across multiple days

