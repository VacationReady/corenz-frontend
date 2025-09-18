# HR Reporting System

## Overview

The HR Reporting System is a complete redesign of the reporting area specifically tailored for HR users. It provides an intuitive, clutter-free interface with field selection segmented by HR business areas.

## Key Features

### 🎯 HR-Focused Field Organization
- Fields are organized into logical HR categories:
  - **People & Demographics**: Personal information, contact details
  - **Employment Details**: Job roles, departments, working patterns
  - **Compensation & Payroll**: Salary, hourly rate, tax and benefits
  - **Time Off & Leave**: Leave requests, entitlements, balances
  - **Documents & Compliance**: Employment checks, licenses, training certificates
  - **Offboarding**: Exit status, last working date, offboarding reasons
  - **Performance & Training**: Training completion and providers
  - **Forms**: Dynamic fields sourced from tenant-defined Forms

### 🧙‍♂️ Multi-Step Report Wizard
1. **Choose Report Type**: Select from pre-built templates or start from scratch
2. **Select Fields**: Browse categorized fields with search and selection summary
3. **Configure Filters**: Apply type-aware filters with intelligent operators
4. **Preview & Save**: Review configuration and save the report

### 🎛️ Type-Aware Filtering
- **String Fields**: Contains, equals, starts with, etc.
- **Number Fields**: Greater than, less than, between, etc.
- **Date Fields**: Before, after, between, in last/next X days
- **Boolean Fields**: Is true/false, is empty/not empty
- **Enum Fields**: Is one of, is not one of
- Preview table now supports:
  - Column search (strings)
  - Number ranges (min/max)
  - Date ranges (from/to)
  - Boolean dropdown (All/True/False)
  - Exact value multi-select (fallback)

### 🧩 Dynamic Forms Integration
- The system inspects each tenant’s `Form` definitions and creates synthetic reportable fields under the **Forms** category.
- Shape: `FormSubmission.data.{formSlug}.{fieldSlug}` with inferred types (string/number/date/boolean/enum).
- Endpoints reflecting this:
  - `/api/fields`: grouped lists include Forms fields for the current tenant.
  - `/api/reports/fields`: flat list merges HR fields with Forms-derived fields.

### 🔐 Multi-Tenant Safety
- All report queries are scoped to the authenticated `companyId` across supported models.
- Saved report GET/DELETE routes enforce `companyId` checks.

### 🎨 Modern UX Design
- Clean, accessible interface with ARIA labels
- Responsive design for all screen sizes
- Intuitive navigation with progress indicators
- Clear visual hierarchy and HR-centric terminology

## File Structure

```
app/
├── lib/
│   └── hrReportFields.ts          # HR field definitions and categories
├── components/
│   └── reports/
│       ├── ReportWizard.tsx       # Main wizard component
│       ├── FieldSelection.tsx     # Field selection with categories
│       └── FilterConfiguration.tsx # Type-aware filter builder
├── reports/
│   ├── builder-new/
│   │   └── page.tsx               # New HR-focused report builder
│   └── page.tsx                   # Updated reports listing page
└── api/
    ├── fields/
    │   └── route.ts               # HR-curated fields API (with Forms)
    └── reports/
        ├── fields/
        │   └── route.ts           # Report fields API (merged HR + Forms)
        └── query/
            └── route.ts           # Operator-aware, tenant-scoped query API
```

## HR Field Categories

### People & Demographics
- First Name, Last Name
- Email Address, Phone Number
- Date Added to System

### Employment Details
- Employment Status (Active/Inactive)
- Department, Job Role
- Working Pattern
- Start Date, Manager ID

### Compensation & Payroll
- Salary Amount, Hourly Rate
- Tax Code
- KiwiSaver Enrolled, Contribution %

### Time Off & Leave
- Leave Start/End Dates
- Leave Types (Annual, Sick, etc.)
- Leave Balances and Usage
- Carryover Days

### Documents & Compliance
- Employment Check Types and Issue/Expiry
- Driver License Type and Expiry

### Offboarding
- High-level Offboarding Status and Date
- Exit Workflow Status, Last Working Date, Reason
- Exit Interview Required

### Performance & Training
- Training Completion/Expiry Dates
- Course Name, Training Provider

### Forms
- Dynamic per-tenant fields from `Form.schema`
- Addressed by `FormSubmission.data.{formSlug}.{fieldSlug}`

## Report Templates

### Pre-Built Templates
1. **Employee Directory**: Complete employee listing with contact info
2. **Leave Summary Report**: Leave balances and usage overview
3. **Compliance Tracker**: Document expiry and compliance tracking
4. **Training Report**: Training completion and renewal tracking
5. **Department Overview**: Departmental employee breakdown

## API Endpoints

### `/api/fields`
Returns HR-curated fields grouped by category with Forms fields included:
```json
{
  "categories": [...],
  "fields": {"People & Demographics": [...], "Forms": [...]},
  "allFields": [...]
}
```

### `/api/reports/fields`
Returns the complete list of HR report fields with metadata, including Forms-derived fields.

### `/api/reports/query`
Processes report queries with HR field validation and filtering, mapping operators to Prisma conditions and returning a single coherent recordset.

## Usage Examples

### Creating a Simple Employee Report
1. Navigate to `/reports/builder-new`
2. Select "Employee Directory" template
3. Customize fields as needed
4. Apply filters (e.g., "Active Employees Only")
5. Preview and save

### Building a Custom Leave Report
1. Start with "Custom Report"
2. Select fields from "Time Off & Leave" category
3. Add filters for date ranges
4. Configure sorting by department
5. Save with descriptive name

## Security & Privacy

- **PII Protection**: Fields containing personal information are clearly marked
- **Access Control**: Reports respect existing user permissions
- **Data Filtering**: Automatic company-scoped data filtering
- **Field Whitelisting**: Only HR-relevant fields are exposed

## Technical Implementation Notes
- Filters are operator-aware and validated server-side.
- Sorting supports nested keys and produces Prisma-friendly `orderBy` objects.
- CSV export in preview uses a nested-value accessor to correctly serialize relations.

## Future Enhancements

- **Saved Filter Sets**: Reusable filter combinations
- **Report Scheduling**: Automated report generation
- **Export Options**: PDF, Excel, CSV formats
- **Dashboard Integration**: Embed reports in dashboards
- **Advanced Analytics**: Trending and comparison features
- **Collaboration**: Share reports with team members

## Migration Guide

### From Legacy Builder
1. Existing reports remain accessible
2. New reports use the enhanced system
3. Gradual migration path available
4. Both systems can coexist

### Field Mapping
Legacy fields are mapped to new HR categories automatically where possible.

## Support

For questions or issues with the HR Reporting System:
1. Check this documentation
2. Review the component source code
3. Test with the development server
4. Create detailed bug reports with steps to reproduce

---

*Last updated: September 2025*
