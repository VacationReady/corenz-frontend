Version 1.1
1. Expiry Alerts Fix

Fixed expiry alert notifications sending daily instead of once at the configured threshold (e.g., 28 days) by changing the query logic to match exact threshold dates and adding notification tracking to prevent duplicates.

2. Document Signature Field Placement Improvements

Improved the signature field placement modal to display documents at full width and enable scrolling through multi-page PDFs, allowing users to view and place signature fields on all pages.

3. Holiday Approval Modal UI Improvements

Fixed the leave request approval modal to remove duplicate close buttons and unnecessary scrollbar. The modal now displays a single close button in the top-right corner for a cleaner, less confusing user interface.

4. Calendar Multi-Day Event Display Fix

Fixed an issue where multi-day leave events on the calendar were only displaying on the first day instead of spanning across all days. Events now correctly show as a continuous bar across all days.

5. Leave Request Delete Functionality

Added the ability to delete leave requests directly from the calendar and employee leave pages. Admins and managers can delete any leave request, while employees can cancel their own pending requests.

6. Event Category Edit Functionality

Added the ability to edit existing event categories in the Event Manager, including changing the colour. A new Edit button and colour indicator are now visible on each category card.

7. Document Rename Functionality

Added the ability for administrators to rename documents from a modernised Edit Document modal with animated permission cards and contextual signature options (employee documents only).

8. Change Request Review Modal UI Improvements

Redesigned the transactional change request review modal with a modern glass morphism UI featuring employee profile cards, gradient accents, and beautiful diff visualisations to match the leave request approval modal styling.

9. Training Report Field Mapping Fix

Fixed Training Reports showing blank data for Course Name, Training Provider, and employee names by correcting field path definitions to properly traverse Prisma relations and ensuring sort fields are anchored to the correct model context.

10. Rota Shift Creation UX Improvements

Improved the shift creation and editing experience with two key changes: (1) Department and location are now automatically populated from the selected employee's profile, removing the need for manual selection since these are fixed employee attributes. (2) Added a "Shift-based workers only" filter (enabled by default) that shows only employees on variable/shift-based working patterns, making it easier to schedule the right staff without scrolling through salaried employees with fixed schedules.

11. Shift Details Employee Name Display Fix

Fixed an issue where shift details showed "Employee" instead of the actual employee's name. The shifts API now includes firstName and lastName fields, and the display logic falls back to combining these when the name field is empty.

12. Calendar Shifts Removed

Removed shifts from the /calendar page to reduce visual clutter. The calendar now focuses on leave events, blackout days, and public holidays, while shifts remain accessible via the dedicated /rota page.

13. Shift-Based Pattern Employee Dropdown Fix

Fixed an issue where employees assigned a shift-based working pattern via their settings page weren't appearing in the rota shift creation dropdown, by updating the employees API to check both the direct WorkingPattern relationship and the EmployeeWorkingPatternAssignment table.

14. View Working Pattern Modal

Added a "View Pattern" button to employee settings that opens a modern modal displaying the full working pattern details. The modal shows a visual weekly calendar grid with colour-coded day types (Full Day, Morning, Afternoon), weekly hour totals, and pattern descriptions, making it easy to understand ambiguous patterns at a glance.

15. Create Working Pattern Modal Redesign

Completely redesigned the Create/Edit Working Pattern modal with a modern, spacious layout featuring collapsible form sections, colour-coded pattern type info cards, and a beautiful card-based day selector grid with animated transitions. The weekly schedule now displays intuitive toggle buttons for each day with checkmark badges, hours display for timed configurations, and copy/paste functionality between weeks.

16. Timed Day Type for Working Patterns

Added support for time-based day types (Morning, Afternoon) in working patterns with a redesigned day selector grid. Users can now specify exact hours for timed days via new time inputs, and the UI displays visual time indicators and calculates weekly totals automatically.

17. Offboarding Datepicker Navigation Fix

Fixed datepicker navigation in Offboarding modal that prevented moving from December 2025 into January 2026. The right arrow now remains enabled and allows navigation to future dates by explicitly setting a wide year range (2000–2100) on the shared Calendar component.

Added a new "Timed" day type option for working patterns that enables precise start/end time configuration with configurable break deductions. Unlike "Full Day" or "Half Day" which use fixed assumptions, Timed days auto-calculate actual hours worked (e.g., 09:00-17:00 with 30min break = 7.5h). This integrates with leave deductions (deducts actual hours), overtime calculations (uses pattern hours as threshold), and leave accrual (calculates day fractions based on hours). Ideal for ad-hoc shifts, variable schedules, and accurate overtime tracking.

18. Employee List Actions Menu Restricted to Admins

Hidden the kebab menu (actions column) on the /employees page for employees and managers. Only admins can now see and use the offboarding, activation email, and delete employee actions.

19. Rota View Full Day Modal

Added a "View day" button to rota calendar day cells that opens a modern modal displaying all shifts for that day. The modal includes quick stats (total shifts, hours, cost, confirmed count), and powerful filtering options to search by employee name/role, filter by location, department, or status. Each shift card shows time, employee, role, location, department, and cost with quick access to view details or edit.

20. Permission Profile Employee Access Fix

Fixed permission profiles not granting access to employee profiles. Users with "employees" permission or any granular employee screen permission (e.g., "Employee Employment Checks") can now access employee profiles, with the navigation menu filtered to show only the tabs they have permission for.

21. Reports Preview Save Button UX Fix

Fixed duplicate report creation when using the report builder. Previously, reports were saved when entering preview, but a "Save Report" button still appeared and created duplicates when clicked. Now the Save button only appears for unsaved previews (e.g., from templates), and an unsaved changes warning dialog prompts users before leaving an unsaved report preview.

22. Shift-Timesheet Reconciliation System

Implemented a comprehensive reconciliation system that automatically matches clock entries and timesheets to scheduled shifts, enabling managers to identify discrepancies (early/late clock-ins, overtime, undertime) and reconcile hours before payroll. The system includes a dedicated Reconciliation Hub page, enhanced rota day view with reconciliation tab, variance indicators, and bulk approval workflows to mitigate payroll errors and wasted money.

23. Avatar Display Fix for Reconciliation and Rota Pages

Fixed corrupted avatar images on the reconciliation and rota pages by replacing raw <img> tags with the Avatar component that includes proper error handling. When profile images fail to load (due to expired signed URLs, corrupted files, or network issues), the component now gracefully falls back to displaying employee initials instead of showing broken image placeholders.

24. Auto-Generate Timesheet Entries on Clock-Out

Automatically creates timesheet entries when employees clock out, eliminating the manual "Generate Timesheet" step and ensuring accurate reconciliation status. Clock entries now automatically generate timesheet entries with proper overtime calculations, shift matching, and reconciliation linking. A backfill script is provided to migrate historical clock data that was created before this feature.

25. Leave Entitlement Report Data Display Fix

Fixed reports showing empty data for employee fields (First Name, Last Name, Gender) and leave entitlement fields (Total Leave Days, Used Leave Days) when selecting default identity fields together with leave entitlement data. Added proper field anchoring for LeaveEntitlement as a primary model and implemented data transformation to map nested Prisma query results back to the original field paths expected by the frontend. The system now correctly joins Employee and User data through LeaveEntitlement relationships and handles null numeric values by defaulting to 0.

26. Shift Conflict Blocking UI

Enhanced the shift creation and editing modals with a prominent blocking UI that prevents users from creating or saving shifts with HIGH or CRITICAL conflicts (e.g., insufficient rest periods between shifts). When conflicts are detected, a large red blocker panel appears with clear explanations, and the submit/save button is disabled with a "Blocked - Resolve Conflicts" message, making it impossible to accidentally create invalid shifts that wouldn't appear on employee dashboards.

27. Shift Deletion with Employee Notification

Added the ability to delete shifts (both published and draft) from the rota page with a dedicated delete modal. For published shifts, managers must provide a reason for deletion and can optionally notify the assigned employee via email. The notification email includes shift details (date, time, location, department) and the cancellation reason, ensuring employees are properly informed when their scheduled shifts are cancelled.

28. Login Error Handling Fix

Fixed login authentication errors failing silently with no error message. In NextAuth v5, signIn() can return ok:true even for invalid credentials, causing a brief sidebar flash before redirecting back to login. Updated the login flow to always verify the session is valid before redirecting and properly display "Invalid email or password" when authentication fails.

29. Employee Hard Delete Foreign Key Constraint Fix

Fixed the employee hard delete functionality failing with a foreign key constraint violation on ClockEntry_employeeId_fkey. Added comprehensive cleanup of all related records including ClockEntry, Timesheet, Shift, SurveyRecipient, SurveyResponse, TransactionalChangeRequest, and other models that reference employees but lack cascade deletes. Increased transaction timeout to accommodate the additional cleanup operations.

30. Input Field Icon Overlap Fix

Fixed text field icons overlapping with input text by updating the Input component's padding styles. Changed from using px-4 to explicit pl-4 pr-4 in base styles, allowing tailwind-merge to properly override individual padding sides when pl-10 is passed via className for icon positioning.

31. Break Duration Input Field Fix

Fixed the Break Duration (minutes) field in the rota Create Shift modal to allow the initial 0 to be fully cleared and overwritten. The field now accepts an empty value while editing instead of forcing it back to 0, enabling users to type new values without the leading zero persisting.

32. Multi-Employee Shift Department Assignment Fix

Fixed an issue where creating shifts for multiple employees with different departments resulted in all shifts showing as "Unassigned" in the Department Breakdown. Each shift now correctly inherits the department and location from its assigned employee, and the UI displays "Multiple departments (Dept1, Dept2)" with a helpful note that each shift uses the employee's own department.

33. Rota Modals UI Modernisation

Modernised the entire rota modal system with a cohesive dark theme featuring gradient backgrounds, rounded corners, and improved visual hierarchy. Fixed the delete shift modal z-index issue so it appears above the shift details dialogue, removed the white box around shift details by making the dialogue transparent, and updated all modals (Create, Edit, Delete, Shift Swap, View Full Day) with consistent slate colour schemes, icon containers, and smooth animations.

34. Employees Status Column Simplification

Removed the redundant "Active" badge from the employees list status column. Active employees now only show their activation state (Pending/Activated), since inclusion in the non-archived list already indicates they are active. Archived employees continue to show the "Archived" badge along with their activation state.

35. Rota Groups UI Modernisation

Modernised all rota groups pages (create, listing, members, requirements) with a cohesive blue theme matching the "Create Rota Group" header. Replaced old icons with Lucide React icons throughout, added framer-motion animations for smooth transitions, and implemented modern form sections with collapsible components. The listing page now features animated cards with colour bars, the members page includes dual-panel layout with role selection, and the requirements page has collapsible day sections with priority badges.

36. News Article Author Display and Avatar Fixes

Fixed corrupt avatar images on news article pages by implementing proper Supabase URL signing for profile images, similar to cover images. Updated author name formatting to display "Michael Dowdle" instead of "michael.dowdle" by combining firstName and lastName fields with proper fallbacks to the name field and email prefix.

37. Surveys Automation Quick Start Guide Icon Alignment

Improved the Quick Start Guide buttons on the /surveys/automation page by repositioning icons to the left of the "Create" text. Icons now appear cleanly aligned with proper spacing instead of overlapping the first letter, providing a better user experience and clearer visual hierarchy.

38. Surveys Automation Create Page Hero Contrast Fix

Fixed the hero section on the /surveys/automation/new page where text and buttons were nearly invisible due to white-on-white styling. Replaced the glass card wrapper with a dedicated dark gradient container to ensure strong contrast, making the header text and action buttons clearly readable against the background.

39. Rota Groups Available Employees List Fix

Fixed the rota groups member management page showing "All employees are already members" for new groups by updating the employee data fetch to use the current API response shape. The page now correctly normalises the flattened employee data into the expected nested structure, ensuring all active employees appear in the "Available Employees" list for selection.

40. Employee Rota Group Assignment for Shift-Based Patterns

Enhanced the Add Employee modal to automatically assign employees to rota groups when a shift-based working pattern is selected. When creating an employee with a "SHIFT_BASED" pattern, a checkbox dropdown appears allowing selection of relevant rota groups for shift scheduling. The selected groups are automatically applied to the employee upon creation, streamlining the onboarding process for shift workers.

41. Rota Groups Edit Modal with Member Management

Replaced the 404 edit route with a modern modal-based editor for rota groups. The new edit page features tabbed interface for group details and member management, inline editing of member roles and skills, and uses icon/colour picker components for consistent styling. Members can be added with role/skill assignment, and existing members can be edited directly within the modal with save/cancel actions.

42. Employee Schedule Swap Restriction for Past Shifts

Fixed the employee schedule page to prevent swap requests for past shifts. The Request Swap button is now hidden for shifts that have already started, aligning the UI with existing backend safeguards and ensuring employees can only request swaps for upcoming shifts.

43. Live Attendance Names Fix

Updated the live attendance API to display employee first and last names instead of "Unknown" by building the display name from firstName/lastName fields with sensible fallbacks to User.name or email.

44. Rota Groups Lucide Icon Integration

Replaced emoji-based icons with Lucide React icons across the rota groups interface. Added searchable icon picker and expanded colour palette with 28 theme colours, providing a more professional and consistent visual experience that matches the event-manager styling.

45. Individual Member Role and Skill Editing

Enhanced rota group management with granular control over individual member assignments. Added assignedSkills field to database schema and updated both the edit modal and dedicated members page to support inline editing of roles and skills for each member, allowing per-member customisation beyond group-level defaults.

46. Timesheet Display and Alignment Improvements

Fixed timesheet display issues by moving current period timesheets from "Past Timesheets" to the "Current Period" section, ensuring all pending, approved, and declined timesheets appear in their correct period. Also corrected alignment of Total, Regular, and Overtime hours in timesheet cards by standardising label lengths and adding consistent spacing.

47. Clock Out Timeout Fix

Resolved clock-out timeout issues on first attempts by ensuring Prisma database connections are established before heavy operations and making timesheet auto-submission fire-and-forget. This prevents connection delays and workflow creation from blocking the clock-out response.

48. Timesheet Approval Modal Enhancement

Enabled timesheet approvals directly from the dashboard action items widget and action-items page with a beautiful, modern modal. The modal displays employee details, hours breakdown, cost estimates, and individual time entries with scheduled shift comparisons, eliminating the need to navigate to the timesheet hub for approvals. Fixed employee name display to use firstName/lastName fallback when name field is null, standardised all hours formatting to 2 decimal places for payroll accuracy, and added scheduled shift information for approver context.

49. Timesheet Hub Approval UX Improvements

Enhanced the timesheet approval experience with smooth fade-out animations, loading states on approve buttons, and personalised success notifications. Replaced jarring page refreshes with optimistic UI updates that provide immediate visual feedback when approving individual timesheets.

50. Dashboard Layout Consistency Improvements

Refactored employee and manager dashboards to achieve a compact, consistent look and feel similar to the admin dashboard. Reorganised the employee dashboard into a two-row layout with Leave Balance, Today's Shift, and Upcoming Leave in the top row, and Action Items and News in the bottom row. Created a compact version of the Today's Shift widget to reduce vertical space and eliminate unnecessary white space. Added user avatars to dashboard headers for a more personalised experience.

51. Payroll Export Zod Validation Fix

Fixed payroll export Zod validation errors by normalising legacy request fields (startDate/endDate → payPeriodStart/payPeriodEnd) and uppercase format values (CSV/JSON/EXCEL → lowercase) before schema validation, ensuring existing admin/payroll UI calls succeed without modification.

52. Manual Entry Approval Workflow Fix

Fixed manual entry approval workflow to properly trigger re-approval when new entries are added to already-submitted timesheets, preventing mismatched approval status display and ensuring managers receive action items for updated timesheets.

53. Timesheet Hub Multiple Entries Indicator

Added multiple entries indicator badge to timesheet hub, displaying "X entries" for timesheets with more than one entry to improve manager visibility and approval workflow clarity.

54. Form Builder Mood Icon Picker Enhancement

Enhanced form builder chips/multiselect elements with an intuitive Lucide React icon picker, allowing users to associate mood-based icons (happy, sad, neutral, etc.) with each option for more visual survey and form building.

55. Bulk Actions Card Recommendation

Reviewed the existing bulk actions module and recommended adding a sixth card, "Issue Policies & Documents," to enable targeted document assignment and acknowledgement tracking for specific employees, complementing the current five cards and completing the 3×2 layout.

56. Reconciliation Status Fix and Link to Shift Feature

Fixed reconciliation page showing "No Show" and "Pending" for approved timesheet entries by updating the approval API to set TimesheetEntry.reconciliationStatus and enhancing shift-matcher to find unlinked entries by employee. Added a "Link to Shift" dialogue with tooltip for manually linking time entries to scheduled shifts when auto-match fails due to large time variance.

57. Reconciliation Cards Blue Colour Standardisation

Standardised all reconciliation stat cards to use the same blue colour scheme as the "Total Shifts" card for a cohesive visual appearance across the Shift Reconciliation dashboard. Updated all card colours (Pending, Approved, Flagged, No Shows, Avg Variance, Scheduled Hours, Actual Hours) to use the blue theme instead of their previous varied colours (amber, emerald, rose, violet).

58. Rota Group Selection Null Safety Fix

Fixed a TypeError when selecting rota groups in the shift creation modal by making the employee filtering logic null-safe. The error occurred because group member data could contain null name/email/department values, which were being passed to toLowerCase(). Added null checks and fallbacks to ensure string methods are only called on valid values, preventing the "Something went wrong" error and allowing smooth group-based employee selection.

59. Reconciliation Bulk Selection UX Improvements

Improved the bulk selection interface on the reconciliation page by adding visible checkboxes to all entries with actual time data (clock or timesheet), not just those with timesheet entries. Checkboxes now appear on the left side of each entry with clear visual states for approved vs pending entries. The bulk approve button shows the count of approvable entries and is disabled when none can be approved, providing better user feedback and preventing confusion about which entries can be bulk approved.

60. Rota Employee Selection Chip Name Display Fix

Fixed an issue where selecting employees from a rota group in the shift creation modal displayed selected chips as just "x" icons instead of employee names. The multi-select component now uses the same display name logic for selected chips as the dropdown (name → email → "Unknown"), ensuring employee names are always visible after selection.

61. Rota Day Click Auto-Set Date in Create Shift Modal

Improved the rota calendar shift creation workflow by automatically setting the clicked day’s date in the create shift modal. When a user clicks on a day in the rota calendar, the modal now pre-fills the start and end datetime fields with that date at 09:00–17:00, so the user only needs to adjust the time rather than re-selecting the date.

62. Form Builder Canvas Drag-and-Drop Upward Reordering Fix

Fixed the form builder canvas drag-and-drop logic to allow moving elements upward within sections. The collision detection now distinguishes between palette drags (which still prefer section containers) and existing field drags (which use per-field collision), enabling reordering both up and down while preserving the existing behaviour for adding new fields.

63. Form Visibility Filtering Bug Fixes

Fixed critical bugs preventing data screens from appearing in employee profiles by correcting the visibility filtering logic. Fixed job role matching to use IDs instead of names, updated queries to check both Employee and User models for department/job role assignments, and standardised the visibility filter to use AND logic between criteria across all endpoints.

64. Form Builder Multi-Select Dropdowns

Enhanced the form builder with multi-select functionality for dropdown fields, allowing users to enable multiple selections on standard select elements. Added a toggle in the field editor, updated preview rendering to show multi-select behaviour, and wired the feature through both standard and enhanced form renderers for consistent behaviour across forms and surveys.

65. GPS Location Non-Blocking Clock-In/Out

Fixed GPS location requirements blocking employee clock-in/out operations across all APIs. Updated clock-in, clock-out, and sync routes to gracefully handle GPS failures by flagging entries for manager review instead of blocking time recording. Modified frontend components to continue with clock operations when location is unavailable, ensuring employees can always record their work hours regardless of GPS status.

66. Reconciliation Production Readiness Fixes

Fixed three critical production readiness issues in the reconciliation system: (1) Custom adjustments can write NaN hours by adding breakMinutes to the select clause and validating time ranges, (2) Reconciliation day endpoint now uses company timezone instead of hardcoded NZ and filters unmatched entries server-side with pagination, (3) Payroll calculation now checks reconciliationStatus before including entries, skipping unreconciled timesheets with detailed reporting.

67. Rota Groups API Authorisation Hardening

Implemented comprehensive role-based authorisation and audit logging across all /api/rota-groups endpoints to prevent unauthorised schedule manipulation and data exposure. Only ADMIN or MANAGER roles can create, update, or delete rota groups and their members/requirements, while non-admin users are restricted to viewing groups they are active members of. Added audit logging for all create/update/delete operations with detailed metadata for compliance tracking.

68. Onboarding and Employees Security Hardening

Tightened security across employee onboarding and activation flows following a production readiness audit. Activation emails can now only be sent by ADMIN or SUPER_ADMIN users, and activation token generation uses an explicit randomUUID import from Node's crypto module for consistent, environment-safe behaviour.

Removed client-controlled company headers from employee list fetches so tenancy is always derived server-side from the authenticated session, preventing cross-tenant header manipulation. The onboarding dashboard now uses a secure internal base URL helper, forwards authentication cookies on server-side fetches, and handles 401 responses with proper redirects to protect onboarding telemetry data.

69. Public Holiday Leave Booking Prevention

Implemented a comprehensive system to prevent employees from booking leave on public holidays, with an employee-level override option for contractors. Added a new canBookPublicHolidays field to the Employee model (defaults to false), integrated public holiday validation into the leave request workflow, and updated the Add Employee modal with a toggle to enable this setting for contractors who don't receive public holidays as paid time off.

70. Unified Auth Token Refresh Endpoint

Implemented a dedicated /api/auth/refresh endpoint that safely refreshes NextAuth JWT session tokens for both web and mobile clients. The endpoint validates the existing token, confirms the user is still active, and issues a new token with an extended expiry, returning it as a secure httpOnly cookie for web clients and as a sessionToken value in the JSON response for mobile clients.

71. Calendar Leave Booking Manager Scope and Employee Loading

Updated the employees API and calendar Book Leave flow so managers can only book leave for their own direct reports (via a scope=direct mode) and the Quick Leave Booking modal now uses paginated employee fetching that correctly handles the new { data, pagination } response format for large teams.

72. Orphaned Manager Reference Validation

Fixed a data consistency issue where deleted employees could still appear as managers on profile pages. The employee overview page and employment-details API now validate that a manager's User record has an associated active Employee before displaying their name. This prevents orphaned managerId references (from hard-deleted users) from showing stale manager names while the employment details page showed "No Manager".

73. Offboarding Access Revocation and Email Notification

Implemented immediate access revocation for offboarded employees with proper login blocking and optional email notification. The auth system now checks for revoked access and displays a specific error message at login, while the offboarding modal includes a conditional toggle to send employees an email informing them their access has been removed and to contact HR for documentation.

74. Onboarding Template Simulation and Live Preview Form Rendering

Fixed onboarding template builder Simulation Mode and Live Preview to render the actual selected form fields for "fill-form" steps instead of placeholder fields. Added a dedicated FormSchemaPreview component that fetches the selected form schema and renders real fields, supporting both legacy and v2 form schemas. Checklist-style steps now display their configured metadata items rather than generic placeholders.

75. Onboarding Template Builder Dropdown Menu Actions Fix

Fixed dropdown menu actions (Delete, Duplicate, Advanced settings) not working in the onboarding template builder. The issue was caused by HeadlessUI's Portal conflicting with Radix Dialog's event handling. Removed the Portal implementation and switched to inline absolute positioning with proper event propagation handling, ensuring menu items fire correctly when clicked.

76. Quick Report Builder Template Toggle Deselect

Updated the Quick Report Builder in /reports/builder-new so clicking an already-selected quick-start template toggles it off. When deselected, the builder restores the user's previous field selection and removes the fields that were auto-applied by the template (while keeping required fields).

77. Automation Rules Employee Searchable Recipient Dropdown

Replaced the generic "email recipient" dropdown in automation rules with a searchable employee list. The dropdown now renders an alphabetically sorted list of active employees with an in-dropdown search bar, while preserving existing role-based recipient options (Manager, HR Team, Buddy, All Employees).

78. Leave Request Approval Centralised Authorisation

Refactored /api/leave-request/[id] to use a centralised permission system instead of hardcoded role checks. Extended the permission model with "approve" action for leave requests and replaced ["ADMIN","MANAGER"].includes() checks with hasPermission() calls, ensuring consistent authorisation across all endpoints.

79. Employee Document Signature Disclaimer Update

Updated the electronic signature disclaimer text on the employee document signing UI to use clearer, more comprehensive language while preserving the existing blue outlined styling and layout.

80. Form Builder Calculation Security Fix

Fixed a critical security vulnerability in form field calculations by replacing the unsafe eval() function with the secure mathjs.evaluate() method. The existing sanitisation layer remains as additional protection, and all output formatting (currency, percentage, number) is preserved while eliminating the code injection risk.

81. Leave Booking Transaction Race Condition Fix

Fixed critical race condition bug in AI action executor and leave-requests API where leave requests were created outside transactions. Wrapped the entire booking operation (entitlement check → request creation → balance deduction → approval) in a single $transaction to prevent orphaned records if any step fails.

82. Annual Leave Balances Report Fixes

Fixed Annual Leave Balances template report to filter only Annual Leave categories instead of showing all leave types. Added floating point precision rounding (2 decimal places) to resolve display issues like "4.200000000000001". Department and job role display now works correctly since only properly populated Annual Leave entitlements are returned.

83. E-Signature Field Drag-and-Drop Positioning Fix

Fixed e-signature field placement to use exact drop location instead of defaulting to top-left position. Implemented proper drag-and-drop from palette to document with position calculation based on drop coordinates, ensuring fields appear where users drop them.

84. E-Signature Field Delete and Size Fixes

Enabled field deletion by fixing the X button click handler with proper event propagation and pointer-events. Reduced default field size from 25%×10% to 15%×4% for a more compact, proportional appearance that better fits document layouts.

85. E-Signature Timestamp Overlap Fix

Fixed signature timestamp positioning in PDF stamping to render below the signature instead of overlapping. Updated PDF coordinate calculation to place timestamp with proper padding beneath the signature area for both drawn and typed signatures.

86. Shifts API Cross-Tenant Security Hardening

Fixed cross-tenant data exposure vulnerability in /api/shifts/[id] by replacing findUnique({ where: { id } }) queries with tenant-scoped findFirst({ where: { id, companyId } }) across all handlers. This prevents attackers from discovering shift existence through timing attacks and eliminates cross-tenant data leakage while maintaining existing permission checks.

87. Org Chart UX Refactor for Enhanced Visibility

Refactored the org chart page to dramatically improve visibility and reduce scrolling. Implemented compact inline stats, collapsible filters, smaller node cards (200×140px), lower default zoom (60%), and a fit-to-screen button, allowing users to see significantly more employees at once without excessive scrolling.

88. NextAuth v5 Cookie Name Migration

Fixed silent login/logout/session inconsistencies by updating custom auth endpoints to use NextAuth v5 cookie names (authjs.session-token) instead of legacy v4 names. Created centralised cookie utilities that read from both v5 and v4 names for backward compatibility while always writing v5 names, ensuring complete session cleanup on signout.

89. Employees API Cross-Tenant Security Hardening

Fixed cross-tenant manager linking vulnerability in /api/employees by replacing findUnique({ where: { id } }) manager lookups with tenant-scoped findFirst({ where: { id, companyId } }). Added comprehensive tenant validation for all foreign keys (departmentId, jobRoleId, locationId, workingPatternId) and created extensive cross-tenant security tests.

90. Document Status API Tenant Isolation Fix

Fixed a critical security vulnerability in document status queries where acknowledgements and signatures could be accessed across tenant boundaries. Updated the queries to use tenant-filtered document IDs from the documents query instead of raw request IDs, ensuring proper multi-tenant isolation for document acknowledgements and signatures.

91. Document Status Cache Key Collision Fix

Fixed a cache key collision bug that could leak user-specific document status data between employees by including the employee ID in the cache key generation, preventing employees from the same company from accessing each other's cached acknowledgement and signature status.

92. Leave Days Decimal Precision Fix

Fixed floating-point precision artefacts in leave day calculations and reporting. Updated the reporting API (/api/reports/query) to round numeric leave fields (days/hours/balance/rate) to 2 decimal places before returning data. Applied the same 2dp rounding to computed entitlement fields (_computed.remainingEntitlement) and leave balance endpoints (/api/leave-request?scope=balances) to ensure consistent display across reports, dashboards, and leave management screens.

93. Rota Week Navigation Data Fetching Fix

Fixed an issue where navigating to previous weeks in the rota calendar showed no shifts even though shifts existed. The dateRange state was static and never updated when navigating weeks, so the API always fetched current week data. Added an onDateRangeChange callback to RotaCalendar and connected it to the parent page’s setDateRange to re-fetch shifts for the selected week/month.
94. Report Template Icons Modernisation

Updated the report library template icons to use semantic Lucide React icons instead of emojis, ensuring visual consistency with the rest of the reports section. Each template now displays an icon that meaningfully represents its purpose (e.g., Palmtree for annual leave, Shield for right-to-work expiries, BarChart for headcount reports).

95. Employees List Pagination Alphabetical Order Fix

Fixed the employees list pagination to maintain alphabetical order when loading more employees. Changed from cursor-based pagination to offset-based pagination with proper database ordering by firstName, lastName, then id. The API now supports both pagination methods for backward compatibility, ensuring "Load More Employees" correctly appends the next alphabetically sorted batch instead of showing random employees at the top.

96. Calendar Card Colour Standardisation

Standardised the "THIS PERIOD", "PEOPLE", and "BLACKOUTS" stat cards on the /calendar page to use the same blue gradient colour scheme as the "OFF TODAY" card for a cohesive visual appearance across the calendar dashboard.

97. Annual Leave Report Total Count and Pagination Fix

Fixed the Annual Leave Balances report showing "50 records" instead of the actual total count (77) by updating the report definition to return total count alongside paginated data. Added a prominent "Show all data" banner that appears when there are more rows than displayed, with a button to expand view (up to 500 rows) and clear messaging about total records available.

98. Report Template Icons Modernisation

Updated the report library template icons to use semantic Lucide React icons instead of emojis, ensuring visual consistency with the rest of the reports section. Each template now displays an icon that meaningfully represents its purpose (e.g., Palmtree for annual leave, Shield for right-to-work expiries, BarChart for headcount reports).

Fixed an issue where navigating to previous weeks in the rota calendar showed no shifts even though shifts existed. The dateRange state was static and never updated when navigating weeks, so the API always fetched current week data. Added onDateRangeChange callback to RotaCalendar and connected it to the parent page's setDateRange to re-fetch shifts for the selected week/month.

99. PeopleCore Logo and Branding Updates

Updated the PeopleCore logo styling across the application to match the website branding. The login page now displays "peoplecore" in lowercase bold text instead of the previous logo image/pill styling. All sidebar components (Admin, Manager, Employee) were updated to remove the logo icon and display "PeopleCore" as text only for a cleaner, consistent branding experience.

100. Notifications Employee Recipient Dropdown Fix

Fixed the advanced recipient configuration in transactional notifications where selecting "Employee(s)" incorrectly rendered a "All job roles" dropdown instead of an employee list. The employee picker now shows an alphabetical, searchable dropdown of all active employees without any "All …" pseudo-options. Updated the shared MultiSelect component to make the built-in "All …" option opt-in, preventing similar issues in other pickers.

101. Teams Warehouse Icon Fix

Updated the Teams list in the Rota Groups / Teams panel to render the proper Lucide React Warehouse icon when a rota group's icon is set to "warehouse" instead of displaying the literal text. Added an icon mapping helper that preserves existing emoji support while rendering known icon keys as components.

102. Admin Dashboard Calendar Widget Leave Details Popover

Replaced navigation to /calendar with a popover showing leave details when clicking upcoming leave events in the admin dashboard calendar widget. Added employee avatar, department, category badge, date range, reason, and View Leave/Profile buttons matching the calendar page design.

103. Automation Rules Workflow Validation UI Sync and Import Safety

Fixed workflow node validation UI becoming stale after edits by syncing nodeValidation errors into node.data.validationErrors whenever validation changes, ensuring red error rings always match the "Test workflow" validation. Also hardened the import workflow feature with Zod schema validation and comprehensive sanitisation to prevent invalid/duplicate node IDs or dangling edges from breaking ReactFlow.

104. Analytics KPI Cards Alignment and Colour Standardisation

Standardised all analytics dashboard KPI cards to use the same blue gradient theme as the "Avg Tenure" card for visual consistency. Fixed card alignment issues by reserving space for the change indicator and adding proper grid stretching, ensuring all cards align neatly in rows regardless of content length.

105. NZ Sick Leave Ledger Refactor (Anniversary Grants)

Refactored New Zealand sick leave to a production-grade, Holidays Act compliant ledger-based model with 6-month eligibility, 10-day anniversary grants, and 20-day cap enforcement. Added booking and approval guards to prevent pre-eligibility sick leave requests, plus a safe, idempotent migration script (with dry-run reporting) to backfill opening balances. Included comprehensive tests, documentation, and CI enforcement to prevent any future direct `sickLeaveBalance` writes outside the ledger helpers.

106. NZ Sick Leave Booking UX, Permissions, and Calendar Support

Integrated the NZ sick leave model into the leave booking experience with a first-class sick leave flow, clear eligibility/balance messaging, and sick leave badges/filters across leave views. Added a structured sickness reason dropdown and enforced server-side validation for sick leave requests. Updated access rules so only admins (and managers for direct reports) can register sick leave, including from the calendar booking modal, while employees cannot self-toggle sick leave.

107. Annual Leave Balance Card Sizing and Filtering

Updated the employee overview page's "Leave Balances" card to match the height of neighbouring cards and renamed it to "Annual Leave Balance". The card now stretches to full height using the same h-full/flex structure as other QuickInfoCards, ensuring consistent visual alignment. Added an optional eventCategoryNameAllowList prop to LeaveBalancePanel that filters entitlements by category name (case-insensitive) both initially and after refresh. The overview page now only displays Annual Leave entitlements, preventing other leave categories from appearing on the dashboard while preserving full functionality elsewhere in the application.

108. Bulk Actions Currency Formatting Correction

Corrected the currency formatting issue in the bulk actions "Adjust Compensation" section where salaries were incorrectly displayed in GBP (£) instead of NZD ($). Updated the formatCurrency function to use the en-NZ locale with NZD currency code, and changed the input label from "(£)" to "($)" for consistency with the New Zealand context. Ensured system-wide consistency by verifying no other GBP currency references exist in the codebase.

109. Default View Mode Changes to List/Table

Updated the default view mode across reports, documents, and employee table screens to display list/table view instead of card/grid view. Modified five components: reports page, documents page, training records, driver licences, and employment checks. Users now see data in a more compact, scannable format by default, with the option to switch to card view if preferred. This change improves data density and readability for users managing larger datasets.

110. Employee Overview Layout Reorganisation and Colour Standardisation

Reorganised the employee overview page layout for improved visual hierarchy and user experience. Moved Emergency Contacts to sit alongside Bank & Payroll for better logical grouping of employee administrative information. Arranged Absence & Sick Leave and Annual Leave Balance cards side by side to create a more intuitive leave management section. Standardised colour scheme by changing the orange colours in the Absence & Sick Leave section to match the consistent blue theme used throughout the application. Enhanced the Annual Leave Balance card with proper height matching and flexible layout structure for consistent visual alignment across all cards.

111. Employment Details Date Handling and Display Improvements

Resolved a Prisma validation error when updating employee start dates by normalising date-only strings (YYYY-MM-DD) to proper ISO DateTime objects before database persistence. The API now returns a clear 400 error for invalid date formats instead of a 500 crash. Updated the Employment Details UI to display dates in DD-MM-YYYY format beneath the native date picker, providing localised readability while retaining browser-native calendar functionality.

112. Bulk Actions Currency Formatting and Compensation Export

Corrected the currency formatting issue in the bulk actions "Adjust Compensation" section where salaries were incorrectly displayed in GBP (£) instead of NZD ($). Updated the formatCurrency function to use the en-NZ locale with NZD currency code and changed the input label from "(£)" to "($)" for consistency with the New Zealand context. Added CSV export functionality for compensation bulk actions, allowing administrators to download a detailed breakdown of current versus proposed salaries with calculated differences for audit purposes and record keeping.

113. Employment Details Client Async Operation Cleanup

Resolved a memory leak in EmploymentDetailsClient.tsx by adding proper cleanup for async operations in the employment details fetching effect. The component now guards against state updates after unmount by using an isActive flag and threading it through the reloadOptions function. This prevents React warnings about state updates on unmounted components and ensures safe async behaviour when the component unmounts before API calls complete.

114. Employee Overview Sick Leave Eligibility Date Clarity

Improved the user experience on the employee overview page by displaying a clear explanatory message when sick leave eligibility cannot be calculated due to a missing employee start date. Previously, the "Eligible from" field would appear blank when no eligibility date was available, causing confusion. The interface now shows "Eligible from: Not available (start date missing)" to provide users with a precise explanation for why the date is absent, helping administrators understand that adding an employee start date will enable eligibility calculation.

115. Manager Dashboard New Starters Calculation Fix

Corrected the team metrics calculation in the manager dashboard to use employee startDate instead of createdAt when counting "new starters this month". The previous implementation incorrectly counted employees based on when their records were created in the system rather than when they actually commenced employment. Updated the filtering logic to reference the employment start date with proper validation to ensure accurate monthly starter counts and prevent inclusion of invalid dates.

116. Bank Payroll Auto-Calculation Infinite Loop Prevention

Resolved a subtle infinite loop risk in BankPayrollClient.tsx where two useEffect hooks for auto-calculating salary from hourly rate and vice versa could trigger each other when the working pattern changed. Added an auto-calculation guard ref to prevent circular updates and tightened the effects to only run when the appropriate source field was edited. Improved the working pattern change handler to intelligently reselect a source field when only one compensation value is populated, ensuring calculations continue to work after pattern changes without flickering or unnecessary re-renders.