# Design Document: Calendar UI Modernization

## Overview

This design document outlines the implementation approach for modernizing the company calendar UI to achieve a refined, professional aesthetic. The changes focus on replacing saturated, bold colors with muted, desaturated tones and updating event chip styling from full background fills to subtle left-border accents.

## Architecture

The calendar UI modernization involves changes to three main areas:

1. **CSS Styling** (`app/globals.css`) - Update color values and styling classes
2. **Calendar Helpers** (`app/lib/calendar/calendar-helpers.ts`) - Update color mapping functions
3. **Calendar Components** - Update inline styles and class usage

### Component Hierarchy

```
CalendarPage
├── CalendarLegend (legend swatches)
├── FullCalendar
│   ├── Day Cells (grid styling, heat map)
│   └── Event Content (event chips)
└── Day Inspector Sheet
```

## Components and Interfaces

### 1. Color Palette System

The new color palette uses muted, desaturated tones:

| Category | Old Color | New Color | CSS Variable |
|----------|-----------|-----------|--------------|
| Annual Leave | `#3b82f6` (bright blue) | `#94a3b8` (slate-400) | `--cal-annual` |
| Sickness | `#f59e0b` (bright amber) | `#d4a574` (muted amber) | `--cal-sick` |
| Training | `#6366f1` (bright indigo) | `#a5b4fc` (indigo-300) | `--cal-training` |
| Parental | `#ec4899` (bright pink) | `#f9a8d4` (pink-300) | `--cal-parental` |
| Compassion | `#a855f7` (bright purple) | `#c4b5fd` (violet-300) | `--cal-compassion` |
| Medical | `#14b8a6` (bright teal) | `#99f6e4` (teal-200) | `--cal-medical` |
| Unpaid | `#64748b` (slate-500) | `#94a3b8` (slate-400) | `--cal-unpaid` |
| TOIL | `#0ea5e9` (bright sky) | `#7dd3fc` (sky-300) | `--cal-toil` |

### 2. Event Chip Styling

**New Design Pattern:**
- White/light gray background (`bg-white` or `bg-gray-50`)
- 3px left border with category color
- Dark text (`text-gray-700`)
- Subtle shadow on hover

```css
.cz-event-chip {
  background: white;
  border-left: 3px solid var(--category-color);
  color: #374151; /* gray-700 */
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.15s ease;
}

.cz-event-chip:hover {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}
```

### 3. Status Indicator Colors

| Status | Border Color | Description |
|--------|--------------|-------------|
| Pending | `#fbbf24` (amber-400) | Subtle amber left border |
| Approved | Category color | Uses the muted category color |
| Declined | `#f87171` (red-400) | Subtle rose left border |

### 4. Calendar Grid Styling

- **Borders**: `border-gray-100` (very light)
- **Today highlight**: Soft primary tint (`bg-primary/5`)
- **Weekend cells**: `bg-gray-50/50` (very subtle)
- **Heat map**: Reduced opacity levels (0.06, 0.10, 0.14, 0.18, 0.22)

### 5. Legend Component Updates

- Small circular swatches (12px)
- No gradient backgrounds
- Subtle border (`border-gray-200`)
- Muted fill colors matching new palette

## Data Models

No data model changes required - this is a purely visual/CSS update.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Color Saturation Constraint
*For any* category or status color in the calendar system, the HSL saturation value should be below 60% to ensure muted, professional appearance.
**Validates: Requirements 1.1, 1.4, 5.4**

### Property 2: WCAG AA Contrast Compliance
*For any* text-background color combination in the calendar, the contrast ratio should be at least 4.5:1 for normal text and 3:1 for large text to meet WCAG AA standards.
**Validates: Requirements 1.5, 7.2**

### Property 3: Heat Map Opacity Bounds
*For any* heat level (1-5) in the calendar heat map, the background opacity should be between 0.04 and 0.25 to ensure events remain visible.
**Validates: Requirements 4.5**

## Error Handling

No error handling changes required - this is a visual update only.

## Testing Strategy

### Unit Tests
- Verify CSS class generation produces expected classes
- Verify color mapping functions return correct values

### Visual Regression Tests (Manual)
- Compare before/after screenshots
- Verify color palette matches design spec
- Verify event chip styling matches design spec
- Verify legend styling matches design spec

### Accessibility Tests
- Run automated contrast checker on new colors
- Verify focus states are visible
- Test with screen reader

### Property-Based Tests
- Test color saturation values across all categories
- Test contrast ratios for text/background combinations
- Test heat map opacity values

## Implementation Notes

1. **Backward Compatibility**: The CSS class names remain the same, only the values change
2. **Dark Mode**: Ensure dark mode variants are also updated with muted colors
3. **Reduced Motion**: Use `prefers-reduced-motion` media query for hover animations
4. **Performance**: No performance impact expected - CSS-only changes
