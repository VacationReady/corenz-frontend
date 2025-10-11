# Reporting Enhancements – Date Preset Rollout

## Summary
- Added reusable date presets (today, tomorrow, yesterday, this/last/next week, month, quarter, year) to the HR reporting experience.
- Introduced relative ranges (before X days, after X days, within last/next X days) with inline validation.
- Presets respect employee locale/timezone preferences with tenant defaults as fallback.
- Updated preview table dropdowns and the report builder to surface the new options while keeping manual date entry.
- Extended backend query handling to interpret the new `date_preset` operator efficiently.
- Initial rollout prioritises the **Core Workforce** and **Headcount Change** templates before global availability.

## User Impact
- HR analysts can apply precise, timezone-aware date filters in a single click.
- Consistent preset language between saved reports, ad-hoc previews, and scheduled exports.
- Tooltips describe the exact window being applied, reducing ambiguity for distributed teams.

## Rollout Notes
- Core Workforce and Headcount Change templates updated immediately; other saved reports adopt presets after verification.
- Existing reports using legacy date operators continue to function without migration.
- Documentation and training materials refreshed to highlight the new presets and relative ranges.

