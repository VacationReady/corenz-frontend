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

## 13. Shift-Based Pattern Employee Dropdown Fix

Fixed an issue where employees assigned a shift-based working pattern via their settings page weren't appearing in the rota shift creation dropdown, by updating the employees API to check both the direct WorkingPattern relationship and the EmployeeWorkingPatternAssignment table.

## 14. View Working Pattern Modal

Added a "View Pattern" button to employee settings that opens a modern modal displaying the full working pattern details. The modal shows a visual weekly calendar grid with color-coded day types (Full Day, Morning, Afternoon), weekly hour totals, and pattern descriptions, making it easy to understand ambiguous patterns at a glance.

## 15. Create Working Pattern Modal Redesign

Completely redesigned the Create/Edit Working Pattern modal with a modern, spacious layout featuring collapsible form sections, color-coded pattern type info cards, and a beautiful card-based day selector grid with animated transitions. The weekly schedule now displays intuitive toggle buttons for each day with checkmark badges, hours display for timed configurations, and copy/paste functionality between weeks.

## 16. Timed Day Type for Working Patterns

Added a new "Timed" day type option for working patterns that enables precise start/end time configuration with configurable break deductions. Unlike "Full Day" or "Half Day" which use fixed assumptions, Timed days auto-calculate actual hours worked (e.g., 09:00-17:00 with 30min break = 7.5h). This integrates with leave deductions (deducts actual hours), overtime calculations (uses pattern hours as threshold), and leave accrual (calculates day fractions based on hours). Ideal for ad-hoc shifts, variable schedules, and accurate overtime tracking.

## 17. Employee List Actions Menu Restricted to Admins

Hidden the kebab menu (actions column) on the /employees page for employees and managers. Only admins can now see and use the offboarding, activation email, and delete employee actions.

## 18. Rota View Full Day Modal

Added a "View day" button to rota calendar day cells that opens a modern modal displaying all shifts for that day. The modal includes quick stats (total shifts, hours, cost, confirmed count), and powerful filtering options to search by employee name/role, filter by location, department, or status. Each shift card shows time, employee, role, location, department, and cost with quick access to view details or edit.

## 19. Permission Profile Employee Access Fix

Fixed permission profiles not granting access to employee profiles. Users with "employees" permission or any granular employee screen permission (e.g., "Employee Employment Checks") can now access employee profiles, with the navigation menu filtered to show only the tabs they have permission for.

## 20. Reports Preview Save Button UX Fix

Fixed duplicate report creation when using the report builder. Previously, reports were saved when entering preview, but a "Save Report" button still appeared and created duplicates when clicked. Now the Save button only appears for unsaved previews (e.g., from templates), and an unsaved changes warning dialog prompts users before leaving an unsaved report preview.

## 21. Shift-Timesheet Reconciliation System

Implemented a comprehensive reconciliation system that automatically matches clock entries and timesheets to scheduled shifts, enabling managers to identify discrepancies (early/late clock-ins, overtime, undertime) and reconcile hours before payroll. The system includes a dedicated Reconciliation Hub page, enhanced rota day view with reconciliation tab, variance indicators, and bulk approval workflows to mitigate payroll errors and wasted money.

## 22. Avatar Display Fix for Reconciliation and Rota Pages

Fixed corrupted avatar images on the reconciliation and rota pages by replacing raw `<img>` tags with the Avatar component that includes proper error handling. When profile images fail to load (due to expired signed URLs, corrupted files, or network issues), the component now gracefully falls back to displaying employee initials instead of showing broken image placeholders.

## 23. Auto-Generate Timesheet Entries on Clock-Out

Automatically creates timesheet entries when employees clock out, eliminating the manual "Generate Timesheet" step and ensuring accurate reconciliation status. Clock entries now automatically generate timesheet entries with proper overtime calculations, shift matching, and reconciliation linking. A backfill script is provided to migrate historical clock data that was created before this feature.

## 24. Leave Entitlement Report Data Display Fix

Fixed reports showing empty data for employee fields (First Name, Last Name, Gender) and leave entitlement fields (Total Leave Days, Used Leave Days) when selecting default identity fields together with leave entitlement data. Added proper field anchoring for LeaveEntitlement as a primary model and implemented data transformation to map nested Prisma query results back to the original field paths expected by the frontend. The system now correctly joins Employee and User data through LeaveEntitlement relationships and handles null numeric values by defaulting to 0.

## 25. Shift Conflict Blocking UI

Enhanced the shift creation and editing modals with a prominent blocking UI that prevents users from creating or saving shifts with HIGH or CRITICAL conflicts (e.g., insufficient rest periods between shifts). When conflicts are detected, a large red blocker panel appears with clear explanations, and the submit/save button is disabled with a "Blocked - Resolve Conflicts" message, making it impossible to accidentally create invalid shifts that wouldn't appear on employee dashboards.

## 26. Shift Deletion with Employee Notification

Added the ability to delete shifts (both published and draft) from the rota page with a dedicated delete modal. For published shifts, managers must provide a reason for deletion and can optionally notify the assigned employee via email. The notification email includes shift details (date, time, location, department) and the cancellation reason, ensuring employees are properly informed when their scheduled shifts are cancelled.
