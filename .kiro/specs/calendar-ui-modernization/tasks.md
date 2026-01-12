# Implementation Plan: Calendar UI Modernization

## Overview

This implementation plan covers the CSS and component updates needed to modernize the calendar UI with muted colors and refined event chip styling.

## Tasks

- [x] 1. Update CSS color palette for event categories
  - Update `.cz-chip-modern--*` classes with muted colors
  - Remove gradient backgrounds, use solid muted colors
  - Update dark mode variants
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. Implement new event chip styling
  - [x] 2.1 Create new `.cz-event-chip` class with left-border accent pattern
    - White/light background with 3px colored left border
    - Dark text color (gray-700)
    - Subtle hover elevation
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - [x] 2.2 Update event chip rendering in calendar page
    - Apply new styling classes to event content
    - Update popover styling to match
    - _Requirements: 2.1, 2.2, 2.5_

- [x] 3. Update status indicator styling
  - [x] 3.1 Update `getStatusColorConfig` function with muted colors
    - Pending: muted amber border
    - Approved: category color border
    - Declined: muted rose border
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 4. Update calendar grid styling
  - [x] 4.1 Update day cell CSS classes
    - Lighter borders (gray-100)
    - Softer today highlight
    - Subtle weekend differentiation
    - _Requirements: 4.1, 4.3, 4.4_
  - [x] 4.2 Update heat map opacity levels
    - Reduce opacity values for all heat levels
    - _Requirements: 4.5_

- [x] 5. Update legend component styling
  - [x] 5.1 Update CalendarLegend component
    - Use muted color swatches
    - Remove any gradient backgrounds
    - Add subtle borders
    - _Requirements: 3.1, 3.2, 3.3_

- [x] 6. Update blackout and holiday styling
  - [x] 6.1 Update blackout day CSS
    - Use muted red tones in striped pattern
    - _Requirements: 6.1_
  - [x] 6.2 Update public holiday styling
    - Use soft emerald tint
    - _Requirements: 6.2_

- [x] 7. Accessibility and responsive updates
  - [x] 7.1 Add prefers-reduced-motion support
    - Disable hover animations when reduced motion preferred
    - _Requirements: 7.4_
  - [x] 7.2 Verify focus states are visible
    - Ensure keyboard navigation works
    - _Requirements: 7.3_

- [x] 8. Checkpoint - Visual verification
  - Ensure all tests pass, ask the user if questions arise.
  - Verify calendar looks professional and refined
  - Check dark mode appearance

## Notes

- All changes are CSS/styling only - no data model changes
- Maintain backward compatibility with existing class names
- Test in both light and dark modes
