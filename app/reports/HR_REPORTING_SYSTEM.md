# HR Reporting System

## Overview

The HR Reporting System is a complete redesign of the reporting area specifically tailored for HR users. It provides an intuitive, clutter-free interface with field selection segmented by HR business areas.

## Key Features

### 🎯 HR-Focused Field Organization
- Fields are organized into logical HR categories:
  - **People & Demographics**: Personal information, contact details
  - **Employment Details**: Job roles, departments, working patterns
  - **Time Off & Leave**: Leave requests, entitlements, balances
  - **Documents & Compliance**: Employment checks, training records
  - **Performance & Training**: Training completion, development tracking

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
│   │   └── page.tsx              # New HR-focused report builder
│   └── page.tsx                  # Updated reports listing page
└── api/
    ├── fields/
    │   └── route.ts              # HR-curated fields API
    └── reports/
        ├── fields/
        │   └── route.ts          # Report fields API
        └── query/
            └── route.ts          # Updated query API
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
- Manager Information

### Time Off & Leave
- Leave Start/End Dates
- Leave Types (Annual, Sick, etc.)
- Leave Balances and Usage
- Carryover Days

### Documents & Compliance
- Employment Check Types and Expiry
- Driver License Information
- Training Records and Certificates

### Performance & Training
- Training Completion Dates
- Course Names and Providers
- Training Expiry Tracking

## Report Templates

### Pre-Built Templates
1. **Employee Directory**: Complete employee listing with contact info
2. **Leave Summary Report**: Leave balances and usage overview
3. **Compliance Tracker**: Document expiry and compliance tracking
4. **Training Report**: Training completion and renewal tracking
5. **Department Overview**: Departmental employee breakdown

## API Endpoints

### `/api/fields`
Returns HR-curated fields grouped by category:
```json
{
  "categories": [...],
  "fields": {...},
  "allFields": [...]
}
```

### `/api/reports/fields`
Returns the complete list of HR report fields with metadata.

### `/api/reports/query`
Processes report queries with HR field validation and filtering.

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

## Technical Implementation

### Field Metadata System
Each field includes:
- `model`: Data model name
- `field`: Field identifier
- `label`: Human-readable name
- `type`: Data type for smart filtering
- `category`: HR business area
- `filterable`: Whether field can be filtered
- `sortable`: Whether field can be sorted
- `isPII`: Personal information flag

### Filter System
Type-aware operators automatically adapt based on field types:
- String fields get text-based operators
- Date fields get temporal operators
- Number fields get numerical operators
- Boolean fields get true/false options

### Responsive Design
- Mobile-first approach
- Touch-friendly controls
- Collapsible sections for small screens
- Progressive enhancement

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
