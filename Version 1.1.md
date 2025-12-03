# Version 1.1

## 1. Expiry Alerts Fix

Fixed expiry alert notifications sending daily instead of once at the configured threshold (e.g., 28 days) by changing the query logic to match exact threshold dates and adding notification tracking to prevent duplicates.

## 2. Document Signature Field Placement Improvements

Improved the signature field placement modal to display documents at full width and enable scrolling through multi-page PDFs, allowing users to view and place signature fields on all pages.

## 3. Holiday Approval Modal UI Improvements

Fixed the leave request approval modal to remove duplicate close buttons and unnecessary scrollbar. The modal now displays a single close button in the top-right corner for a cleaner, less confusing user interface.

## 4. Calendar Multi-Day Event Display Fix

Fixed an issue where multi-day leave events on the calendar were only displaying on the first day instead of spanning across all days. For example, a 4-day leave request (Dec 15-18) now correctly shows as a continuous bar across all four days.

**Changes:**
- Removed CSS `position: relative` declarations from day cells that were constraining event harnesses to individual cells
- Updated blackout day styling to use CSS `outline` instead of pseudo-elements
- Fixed API date formatting to prevent timezone-related date shifts
- Ensured proper overflow handling so spanning events are not clipped at cell boundaries

## 5. Leave Request Delete Functionality

Added the ability to delete leave requests directly from the calendar and employee leave pages. Admins and managers can now remove leave entries with a single click using the new trash icon.

**Features:**
- Delete button (bin icon) on calendar leave event popovers
- Delete button on Day Inspector sheet for each leave entry
- Delete button on employee leave page cards (appears on hover)
- Cancel button for pending requests in Leave History component
- Full audit logging for compliance and traceability

**Permissions:**
- Admins/Managers: Can delete any leave request (including approved)
- Employees: Can only cancel their own pending requests

**Technical:**
- New DELETE endpoint at `/api/leave-request/[id]`
- Automatically returns leave days to entitlement balance when approved leave is deleted
- Cancels associated approval action items
- Added `LEAVE_REQUEST` to `AuditEntityType` enum for audit trail

## 6. Event Category Edit Functionality

Added the ability to edit existing event categories in the Event Manager, including changing the color. Previously, categories could only be archived but not modified.

**Features:**
- New Edit button on each event category card
- Edit modal with full category customization options
- Color palette picker with 25 curated colors
- Visual color indicator bar on each category card showing current color
- System-defined categories can now have their icon and color changed

**Changes:**
- Added `EditCategoryModal` component matching the existing design language
- Updated PATCH API to support `color` field updates
- Updated POST API to properly save `color` on category creation
- System-defined categories now allow icon and color editing while protecting other properties

