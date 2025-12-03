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

