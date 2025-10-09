# AI Assistant - Chart Generation 📊

## Overview
The AI Assistant can generate **beautiful, interactive charts** when you explicitly ask for visualization. Charts appear **only when you request them** - you have full control!

## How It Works

### Opt-In Chart Generation
Charts only appear when you explicitly ask for them using keywords:
- **"chart"** - "show me a chart of..."
- **"graph"** - "create a graph of..."
- **"visualize"** - "visualize the gender split"
- **"plot"** - "plot the department breakdown"

The AI then selects the best chart type based on your data.

### Supported Chart Types

#### 1. **Pie Charts** 🥧
Best for showing proportions and distributions.

**Triggers:**
- "split"
- "distribution"  
- "breakdown"
- Small datasets (≤ 6 categories)

**Examples:**
- "Show me a **pie chart** of the gender split"
- "Create a **pie chart** for department distribution"
- "Visualize employment type breakdown"

#### 2. **Bar Charts** 📊
Best for comparing categories side-by-side.

**Triggers:**
- Larger datasets (7-20 categories)
- Comparison queries
- Default for grouped data

**Examples:**
- "Show me a **bar chart** of employees by department"
- "Create a **graph** of leave balances by team"
- "Visualize employee count by job role"

#### 3. **Line Charts** 📈
Best for showing trends over time.

**Triggers:**
- "trend"
- "over time"
- Time-series data

**Examples:**
- "Show me a **line chart** of hiring trends"
- "Create a **graph** of leave usage over time"
- "Visualize headcount growth trend"

## Features

### Interactive Charts
- **Hover tooltips**: See exact values
- **Responsive**: Works on all screen sizes
- **Dark mode**: Adapts to your theme
- **Smooth animations**: Professional look and feel

### Multiple Display Modes
Charts are shown alongside:
- **Raw data table**: See the numbers
- **Text explanation**: AI describes what the chart shows
- **Export options**: Download as CSV/JSON

## Usage Examples

### Example 1: Gender Demographics (With Chart)
```
You: "Show me a chart of the gender split"

AI Response:
📊 [Beautiful Pie Chart]
- Male: 45 (60%)
- Female: 30 (40%)

Plus detailed text explanation and data table
```

### Example 1b: Gender Demographics (Without Chart)
```
You: "What's the gender split in the company?"

AI Response:
✅ Data table only:
- Male: 45 (60%)
- Female: 30 (40%)

No chart unless you ask for one!
```

### Example 2: Department Headcount (With Chart)
```
You: "Show me a bar chart of people in each department"

AI Response:
📊 [Bar Chart showing all departments]
- Engineering: 25
- Sales: 18  
- HR: 8
- Marketing: 12
- Finance: 7

Interactive chart + exportable data
```

### Example 3: Requesting Specific Chart Types
```
You: "Create a pie chart of contract types"

AI Response:
🥧 [Pie Chart as requested]
- Permanent: 52 (69%)
- Fixed-term: 18 (24%)
- Contractor: 5 (7%)
```

### Example 4: No Chart (Default Behavior)
```
You: "Show me distribution by contract type"

AI Response:
✅ Data table (no chart):
- Permanent: 52 (69%)
- Fixed-term: 18 (24%)
- Contractor: 5 (7%)

Want a chart? Just ask: "show me a chart of contract types"
```

## Technical Details

### Chart Generation Logic

#### When Charts Are Generated:
```typescript
✅ User explicitly asks: "chart", "graph", "visualize", "plot"
✅ Data has 2-20 results (readable range)
✅ Data is suitable for visualization
```

#### When Charts Are NOT Generated:
```typescript
❌ User doesn't ask for a chart (default behavior)
❌ Single row results
❌ More than 20 categories (too crowded)
❌ List queries (showing people)
❌ Text-only data
```

#### Keywords That Trigger Charts:
- "chart" - "show me a chart of..."
- "graph" - "create a graph of..."
- "visualize" / "visualise" - "visualize the data"
- "plot" - "plot the breakdown"
- Plus specific types: "pie chart", "bar chart", "line chart"

### Data Format
Charts work with data in this format:
```json
[
  { "gender": "Male", "count": 45, "percentage": "60.0" },
  { "gender": "Female", "count": 30, "percentage": "40.0" }
]
```

### Chart Configuration
The AI automatically creates:
```typescript
{
  type: "pie" | "bar" | "line",
  data: [...],
  title: "Gender Split",
  description: "Visual breakdown of 2 categories",
  labelKey: "gender",
  valueKey: "count"
}
```

## Customization

### Chart Colors
Default palette (auto-applied):
- Blue (#3b82f6)
- Pink (#ec4899)
- Green (#10b981)
- Amber (#f59e0b)
- Violet (#8b5cf6)
- Cyan (#06b6d4)
- Orange (#f97316)
- Teal (#14b8a6)

### Theme Support
Charts automatically match your theme:
- ✅ Light mode
- ✅ Dark mode
- ✅ Custom themes

## Advanced Queries

### Multi-Dimensional Analysis
```
"Show me gender distribution by department"
```
Future enhancement: Will show multiple charts or grouped bars

### Comparative Queries
```
"Compare leave usage across teams"
```
Generates bar chart perfect for side-by-side comparison

### Aggregate Metrics
```
"What's the total salary and average by department?"
```
Shows multiple metrics in a single bar chart

## Integration Points

### Files Modified:
1. **`app/lib/ai/query-generator.ts`**
   - Added `generateChartConfig()` function
   - Detects visualizable data patterns
   - Returns chart configuration with data

2. **`app/components/ai/DataVisualization.tsx`** (NEW)
   - React component using Recharts
   - Renders Bar, Pie, and Line charts
   - Responsive and accessible

3. **`app/(withSidebar)/assistant/page.tsx`**
   - Updated Message interface to include `chartConfig`
   - Renders charts in conversation flow
   - Seamless integration with existing UI

### Dependencies:
- **Recharts** (v3.2.1) - Already installed ✅
- No additional packages needed!

## API Response Structure

When charts are generated, the API returns:
```json
{
  "success": true,
  "data": [...],
  "explanation": "Found 2 gender categories",
  "chartConfig": {
    "type": "pie",
    "data": [
      { "name": "Male", "value": 45 },
      { "name": "Female", "value": 30 }
    ],
    "title": "Gender split in the org",
    "description": "Visual breakdown of 2 categories",
    "labelKey": "name",
    "valueKey": "value"
  }
}
```

## Benefits

### For Users:
- 🎨 **Visual insights** at a glance
- 📊 **No manual charting** needed
- 💬 **Natural language** queries
- 📱 **Works everywhere** (responsive)
- 🌓 **Beautiful in any theme**

### For Admins:
- 📈 **Better data storytelling**
- ⚡ **Instant visualizations**
- 🔄 **Automatic updates** with new data
- 💾 **Export-friendly** (CSV/JSON)

## Limitations & Future Enhancements

### Current Limitations:
- Max 20 categories per chart (for clarity)
- Single chart per query (no multi-chart layouts yet)
- No user-selectable chart types (AI decides)

### Planned Enhancements:
- [ ] Multi-chart dashboards
- [ ] User preference for chart type
- [ ] More chart types (scatter, area, radar)
- [ ] Chart annotations and highlights
- [ ] Time-range filters for line charts
- [ ] Drill-down capabilities

## Testing

### Test Queries:

**With Charts (explicit request):**
```
✅ "Show me a chart of the gender split"
✅ "Create a graph of department breakdown"  
✅ "Visualize employees by location"
✅ "Plot the contract type distribution"
✅ "Make a pie chart of employment types"
```

**Without Charts (default):**
```
✅ "What is the gender split?" → Data table only
✅ "Show department breakdown" → Data table only
✅ "How many in each location?" → Data table only
```

### Expected Behavior:
1. AI generates appropriate chart
2. Chart renders below the text response
3. Data table still available
4. Export functionality works
5. Chart is interactive (hover tooltips)

## Troubleshooting

### Chart Not Showing?
**Possible reasons:**
- Query returns < 2 or > 20 categories
- Data doesn't have countable fields
- Query is asking for a list of people (use table instead)

### Chart Looks Wrong?
- Check the data format
- Verify the groupBy logic worked correctly
- May need to adjust chart type detection keywords

### Performance Issues?
- Charts are optimized for < 100 data points
- Large datasets may cause slow rendering
- Consider aggregating data server-side

## Accessibility

Charts are built with accessibility in mind:
- ✅ Semantic HTML structure
- ✅ ARIA labels on interactive elements
- ✅ Keyboard navigable
- ✅ High contrast colors
- ✅ Screen reader friendly tooltips

## Examples Gallery

### Gender Demographics
![Gender pie chart showing 60% Male, 40% Female]

### Department Headcount
![Bar chart showing employee counts across 8 departments]

### Leave Type Distribution
![Pie chart showing Annual (45%), Sick (30%), Other (25%)]

### Contract Status Over Time
![Line chart showing contract renewals trend]

## Summary

With chart generation, the AI Assistant becomes a **powerful data visualization tool** that makes insights instantly clear. Just ask your question naturally - the AI handles the rest! 📊✨

---

**Version:** 1.0  
**Last Updated:** 2025  
**Dependencies:** Recharts 3.2.1  
**Compatibility:** All modern browsers

