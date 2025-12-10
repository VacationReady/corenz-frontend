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

## 27. Login Error Handling Fix

Fixed login authentication errors failing silently with no error message. In NextAuth v5, signIn() can return ok:true even for invalid credentials, causing a brief sidebar flash before redirecting back to login. Updated the login flow to always verify the session is valid before redirecting and properly display "Invalid email or password" when authentication fails.

## 28. Employee Hard Delete Foreign Key Constraint Fix

Fixed the employee hard delete functionality failing with a foreign key constraint violation on ClockEntry_employeeId_fkey. Added comprehensive cleanup of all related records including ClockEntry, Timesheet, Shift, SurveyRecipient, SurveyResponse, TransactionalChangeRequest, and other models that reference employees but lack cascade deletes. Increased transaction timeout to accommodate the additional cleanup operations.

## 29. Input Field Icon Overlap Fix

Fixed text field icons overlapping with input text by updating the Input component's padding styles. Changed from using px-4 to explicit pl-4 pr-4 in base styles, allowing tailwind-merge to properly override individual padding sides when pl-10 is passed via className for icon positioning.

## 30. Break Duration Input Field Fix

Fixed the Break Duration (minutes) field in the rota Create Shift modal to allow the initial 0 to be fully cleared and overwritten. The field now accepts an empty value while editing instead of forcing it back to 0, enabling users to type new values without the leading zero persisting.

## 31. Multi-Employee Shift Department Assignment Fix

Fixed an issue where creating shifts for multiple employees with different departments resulted in all shifts showing as "Unassigned" in the Department Breakdown. Each shift now correctly inherits the department and location from its assigned employee, and the UI displays "Multiple departments (Dept1, Dept2)" with a helpful note that each shift uses the employee's own department.

## 32. Rota Modals UI Modernization

Modernized the entire rota modal system with a cohesive dark theme featuring gradient backgrounds, rounded corners, and improved visual hierarchy. Fixed the delete shift modal z-index issue so it appears above the shift details dialog, removed the white box around shift details by making the dialog transparent, and updated all modals (Create, Edit, Delete, Shift Swap, View Full Day) with consistent slate color schemes, icon containers, and smooth animations.

## 33. Employees Status Column Simplification

Removed the redundant "Active" badge from the employees list status column. Active employees now only show their activation state (Pending/Activated), since inclusion in the non-archived list already indicates they are active. Archived employees continue to show the "Archived" badge along with their activation state.

## 34. Rota Groups UI Modernization

Modernized all rota groups pages (create, listing, members, requirements) with a cohesive blue theme matching the "Create Rota Group" header. Replaced old icons with Lucide React icons throughout, added framer-motion animations for smooth transitions, and implemented modern form sections with collapsible components. The listing page now features animated cards with color bars, the members page includes dual-panel layout with role selection, and the requirements page has collapsible day sections with priority badges.

## 35. News Article Author Display and Avatar Fixes

Fixed corrupt avatar images on news article pages by implementing proper Supabase URL signing for profile images, similar to cover images. Updated author name formatting to display "Michael Dowdle" instead of "michael.dowdle" by combining firstName and lastName fields with proper fallbacks to the name field and email prefix.

## 36. Surveys Automation Quick Start Guide Icon Alignment

Improved the Quick Start Guide buttons on the /surveys/automation page by repositioning icons to the left of the "Create" text. Icons now appear cleanly aligned with proper spacing instead of overlapping the first letter, providing a better user experience and clearer visual hierarchy.

## 37. Surveys Automation Create Page Hero Contrast Fix

Fixed the hero section on the /surveys/automation/new page where text and buttons were nearly invisible due to white-on-white styling. Replaced the glass card wrapper with a dedicated dark gradient container to ensure strong contrast, making the header text and action buttons clearly readable against the background.

## 38. Rota Groups Available Employees List Fix

Fixed the rota groups member management page showing "All employees are already members" for new groups by updating the employee data fetch to use the current API response shape. The page now correctly normalizes the flattened employee data into the expected nested structure, ensuring all active employees appear in the "Available Employees" list for selection.

## 39. Employee Rota Group Assignment for Shift-Based Patterns

Enhanced the Add Employee modal to automatically assign employees to rota groups when a shift-based working pattern is selected. When creating an employee with a "SHIFT_BASED" pattern, a checkbox dropdown appears allowing selection of relevant rota groups for shift scheduling. The selected groups are automatically applied to the employee upon creation, streamlining the onboarding process for shift workers.

## 40. Rota Groups Edit Modal with Member Management

Replaced the 404 edit route with a modern modal-based editor for rota groups. The new edit page features tabbed interface for group details and member management, inline editing of member roles and skills, and uses icon/color picker components for consistent styling. Members can be added with role/skill assignment, and existing members can be edited directly within the modal with save/cancel actions.

## 41. Employee Schedule Swap Restriction for Past Shifts

Fixed the employee schedule page to prevent swap requests for past shifts. The Request Swap button is now hidden for shifts that have already started, aligning the UI with existing backend safeguards and ensuring employees can only request swaps for upcoming shifts.

## 42. Live Attendance Names Fix

Updated the live attendance API to display employee first and last names instead of "Unknown" by building the display name from firstName/lastName fields with sensible fallbacks to User.name or email.

## 43. Rota Groups Lucide Icon Integration

Replaced emoji-based icons with Lucide React icons across the rota groups interface. Added searchable icon picker and expanded color palette with 28 theme colors, providing a more professional and consistent visual experience that matches the event-manager styling.

## 44. Individual Member Role and Skill Editing

Enhanced rota group management with granular control over individual member assignments. Added `assignedSkills` field to database schema and updated both the edit modal and dedicated members page to support inline editing of roles and skills for each member, allowing per-member customization beyond group-level defaults.

## 45. Timesheet Display and Alignment Improvements

Fixed timesheet display issues by moving current period timesheets from "Past Timesheets" to the "Current Period" section, ensuring all pending, approved, and declined timesheets appear in their correct period. Also corrected alignment of Total, Regular, and Overtime hours in timesheet cards by standardizing label lengths and adding consistent spacing.

## 46. Clock Out Timeout Fix

Resolved clock-out timeout issues on first attempts by ensuring Prisma database connections are established before heavy operations and making timesheet auto-submission fire-and-forget. This prevents connection delays and workflow creation from blocking the clock-out response.

## 47. Timesheet Approval Modal Enhancement

Enabled timesheet approvals directly from the dashboard action items widget and action-items page with a beautiful, modern modal. The modal displays employee details, hours breakdown, cost estimates, and individual time entries with scheduled shift comparisons, eliminating the need to navigate to the timesheet hub for approvals. Fixed employee name display to use firstName/lastName fallback when name field is null, standardized all hours formatting to 2 decimal places for payroll accuracy, and added scheduled shift information for approver context.

## 48. Timesheet Hub Approval UX Improvements

Enhanced the timesheet approval experience with smooth fade-out animations, loading states on approve buttons, and personalized success notifications. Replaced jarring page refreshes with optimistic UI updates that provide immediate visual feedback when approving individual timesheets.

## 49. Dashboard Layout Consistency Improvements

Refactored employee and manager dashboards to achieve a compact, consistent look and feel similar to the admin dashboard. Reorganized the employee dashboard into a two-row layout with Leave Balance, Today's Shift, and Upcoming Leave in the top row, and Action Items and News in the bottom row. Created a compact version of the Today's Shift widget to reduce vertical space and eliminate unnecessary white space. Added user avatars to dashboard headers for a more personalized experience.

## 50. Payroll Export Zod Validation Fix

Fixed payroll export Zod validation errors by normalizing legacy request fields (`startDate`/`endDate` → `payPeriodStart`/`payPeriodEnd`) and uppercase format values (`CSV`/`JSON`/`EXCEL` → lowercase) before schema validation, ensuring existing admin/payroll UI calls succeed without modification.

## 51. Manual Entry Approval Workflow Fix

Fixed manual entry approval workflow to properly trigger re-approval when new entries are added to already-submitted timesheets, preventing mismatched approval status display and ensuring managers receive action items for updated timesheets.

## 52. Timesheet Hub Multiple Entries Indicator

Added multiple entries indicator badge to timesheet hub, displaying "X entries" for timesheets with more than one entry to improve manager visibility and approval workflow clarity.

## 53. Form Builder Mood Icon Picker Enhancement

Enhanced form builder chips/multiselect elements with an intuitive Lucide React icon picker, allowing users to associate mood-based icons (happy, sad, neutral, etc.) with each option for more visual survey and form building.
