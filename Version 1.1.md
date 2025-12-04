# Version 1.1

## 1. Expiry Alerts Fix

Fixed expiry alert notifications sending daily instead of once at the configured threshold (e.g., 28 days) by changing the query logic to match exact threshold dates and adding notification tracking to prevent duplicates.

## 2. Document Signature Field Placement Improvements

Improved the signature field placement modal to display documents at full width and enable scrolling through multi-page PDFs, allowing users to view and place signature fields on all pages.

## 3. Holiday Approval Modal UI Improvements

Fixed the leave request approval modal to remove duplicate close buttons and unnecessary scrollbar. The modal now displays a single close button in the top-right corner for a cleaner, less confusing user interface.

## 4. Calendar Multi-Day Event Display Fix

Fixed an issue where multi-day leave events on the calendar were only displaying on the first day instead of spanning across all days. Events now correctly show as a continuous bar across all days.

## 5. Leave Request Delete Functionality

Added the ability to delete leave requests directly from the calendar and employee leave pages. Admins and managers can delete any leave request, while employees can cancel their own pending requests.

## 6. Event Category Edit Functionality

Added the ability to edit existing event categories in the Event Manager, including changing the color. A new Edit button and color indicator are now visible on each category card.

## 7. Document Rename Functionality

Added the ability for administrators to rename documents from a modernized Edit Document modal with animated permission cards and contextual signature options (employee documents only).

## 8. Change Request Review Modal UI Improvements

Redesigned the transactional change request review modal with a modern glass morphism UI featuring employee profile cards, gradient accents, and beautiful diff visualizations to match the leave request approval modal styling.

## 9. Training Report Field Mapping Fix

Fixed Training Reports showing blank data for Course Name, Training Provider, and Employee names by correcting field path definitions to properly traverse Prisma relations and ensuring sort fields are anchored to the correct model context.

## 10. Rota Shift Creation UX Improvements

Improved the shift creation and editing experience with two key changes: (1) Department and location are now automatically populated from the selected employee's profile, removing the need for manual selection since these are fixed employee attributes. (2) Added a "Shift-based workers only" filter (enabled by default) that shows only employees on variable/shift-based working patterns, making it easier to schedule the right staff without scrolling through salaried employees with fixed schedules.

## 11. Shift Details Employee Name Display Fix

Fixed an issue where shift details showed "Employee" instead of the actual employee's name. The shifts API now includes firstName and lastName fields, and the display logic falls back to combining these when the name field is empty.

## 12. Calendar Shifts Removed

Removed shifts from the /calendar page to reduce visual clutter. The calendar now focuses on leave events, blackout days, and public holidays, while shifts remain accessible via the dedicated /rota page.
