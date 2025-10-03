# Form Builder: Multiple Record Table Fields

## Overview

The form builder now has **full support for multiple-record table fields** that allow users to add multiple entries into a table-style UI. This is perfect for collecting structured, repeatable data like:

- 📚 **Training records** (Course Name, Date, Provider, Hours, Status)
- 💰 **Commission records** (Month, Amount, Type, Rate, Status)
- 📞 **Emergency contacts** (Name, Relationship, Phone, Email)
- 💼 **Work experience** (Company, Role, Start Date, End Date, Responsibilities)
- 🎓 **Education history** (Institution, Degree, Field, Year)
- 🏆 **Certifications** (Name, Provider, Date Obtained, Expiry Date)

## Features

### ✨ What You Can Do

1. **Add unlimited columns** with descriptive labels
2. **Multiple column types**:
   - Text (single line)
   - Number (with validation)
   - Date (date picker)
   - Dropdown (with custom options)
3. **Mark columns as required** with visual indicators
4. **Set max rows** to limit entries (default: 50)
5. **Live preview** shows exactly how the table will look
6. **Full drag-and-drop** support in form builder

## How to Use

### Step 1: Add a Table Field

1. Open the **Form Builder** (e.g., `/forms/create` or edit an existing form)
2. From the **Field Palette** on the left, find "Table" under the **Collections** section
3. **Drag and drop** the Table field onto your canvas

### Step 2: Configure Table Columns

When you select the table field, you'll see the editor on the right with a **📊 Table Columns** section:

1. Click **"+ Add Column"** to create a new column
2. For each column, configure:
   - **Column Label**: The header text (e.g., "Course Name")
   - **Column Type**: Choose from Text, Number, Date, or Dropdown
   - **Required**: Check if this column must be filled
   - **Dropdown Options**: If type is Dropdown, add your options

3. Click the **X button** to remove a column you don't need

### Step 3: Set Maximum Rows (Optional)

At the bottom of the Table Columns section:
- Set **Maximum Rows** to limit how many entries users can add
- Default is 50, but you can set from 1 to 1000

### Step 4: Configure Basic Settings

Switch to the **Basics** tab to set:
- **Label**: The table field name (e.g., "Training Records")
- **Help text**: Instructions for users
- **Required**: Whether the table itself is required
- **Width**: Full, Half, Third, or Auto

### Step 5: Preview & Save

- Check the **Preview** panel on the right to see how your table looks
- Click **Save Form** when done

## Example Use Cases

### Training Records Table

**Columns:**
- Course Name (Text, Required)
- Date Completed (Date, Required)
- Training Provider (Dropdown: Internal, External, Online)
- Hours (Number, Required)
- Certificate Number (Text)
- Status (Dropdown: Completed, In Progress, Expired)

**Max Rows:** 20

### Commission Tracking

**Columns:**
- Month (Date, Required)
- Deal Name (Text)
- Amount (Number, Required)
- Commission Rate (Number)
- Calculated Commission (Number)
- Status (Dropdown: Pending, Paid, Disputed)

**Max Rows:** 12

### Emergency Contacts

**Columns:**
- Full Name (Text, Required)
- Relationship (Dropdown: Spouse, Parent, Sibling, Friend, Other)
- Phone Number (Text, Required)
- Email (Text)
- Primary Contact (Dropdown: Yes, No)

**Max Rows:** 5

## How It Works for End Users

When filling out a form with a table field:

1. They see an **empty table** with column headers
2. Click **"+ Add Row"** to add a new entry
3. Fill in each column with appropriate data
4. Click the **trash icon** to delete a row
5. Add multiple rows until they've entered all their data
6. The data is saved as a **structured array** when they submit

## Data Structure

The table data is saved as an array of objects:

```json
{
  "trainingRecords": [
    {
      "col_courseName": "Safety Training",
      "col_dateCompleted": "2024-01-15",
      "col_provider": "Internal",
      "col_hours": 8,
      "col_status": "Completed"
    },
    {
      "col_courseName": "Leadership Development",
      "col_dateCompleted": "2024-02-20",
      "col_provider": "External",
      "col_hours": 16,
      "col_status": "Completed"
    }
  ]
}
```

## Technical Details

### Files Modified

1. **`app/components/forms/FormBuilder/FieldEditor.tsx`**
   - Added table column configuration UI
   - Column editor with type selector, label input, required checkbox
   - Dropdown options editor for select-type columns
   - Max entries configuration

2. **`app/components/forms/FormBuilder/FormPreview.tsx`**
   - Added table field preview rendering
   - Shows configured columns and sample row
   - Displays "Add Row" button

3. **Existing (No Changes Needed)**
   - `app/components/forms/EnhancedFormRenderer.tsx` - Already has TableField component
   - `app/api/forms/[id]/types.ts` - Already has TableColumn type definition
   - `app/components/forms/FormBuilder/FieldPalette.tsx` - Already includes table in palette

### Type Definitions

```typescript
interface TableColumn {
  id: string;
  label: string;
  type: "text" | "number" | "date" | "select";
  options?: string[]; // For select columns
  required?: boolean;
  width?: FieldWidth;
  min?: number;
  max?: number;
}

interface FormField {
  // ... other properties
  tableColumns?: TableColumn[];
  maxEntries?: number;
}
```

## Tips & Best Practices

1. **Keep it simple**: Don't add too many columns (5-8 is ideal)
2. **Use dropdowns**: For consistency, use dropdowns for status/category fields
3. **Set max rows**: Prevents users from adding excessive data
4. **Clear labels**: Use descriptive column names users will understand
5. **Mark required**: Only mark truly essential columns as required
6. **Test it**: Always preview the table before saving the form

## Future Enhancements (Ideas)

- Column reordering (drag & drop)
- Column validation rules (min/max for numbers, regex for text)
- Column width customization
- Row duplication button
- Import from CSV
- Export table data to Excel
- Conditional columns (show/hide based on other fields)
- Calculated columns within the table
- Column sorting in the UI

## Need Help?

If you encounter any issues or have questions about table fields:
1. Check the **Preview** panel to see how it will render
2. Ensure at least one column is configured
3. Make sure dropdown columns have at least 2 options
4. Verify the form saves without errors

---

**Last Updated:** October 3, 2025
**Feature Status:** ✅ Complete and Ready to Use

