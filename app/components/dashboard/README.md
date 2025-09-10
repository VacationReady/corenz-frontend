Dashboard Widgets

This directory contains reusable widgets for the dashboards. Widgets should:

- Be client components only when they must use hooks or browser APIs
- Export loading and error states for consistency
- Accept props for configuration (e.g., limit) and avoid hard-coded values
- Use SWR for data fetching with cache-friendly keys and clear loading/error UI
- Be multi-tenant aware by relying on server APIs which enforce `companyId`

Layout

Use `components/ui/DashboardGrid` for consistent responsive grid spacing:

```tsx
import DashboardGrid from "@/components/ui/DashboardGrid";

<DashboardGrid>
  {/* widgets */}
  ...
</DashboardGrid>
```

Data Fetching

Prefer SWR with a lightweight fetcher:

```tsx
const fetcher = (url: string) => fetch(url).then(r => r.json());
const { data, error, isLoading, mutate } = useSWR(key, fetcher);
```

- Use skeletons via `animate-pulse` while loading
- Provide friendly error text and retry affordances where useful

Testing

For each widget:
- Render loading state
- Render with mocked data
- Render error state

Use React Testing Library and `jest.spyOn(global, 'fetch')` to mock API responses.

Accessibility

- Provide semantic headings within widgets (title rendered by `DashboardWidget`)
- Add `aria-label` on inputs and interactive controls
- Ensure keyboard focus visible with Tailwind focus styles

Examples

See `NewsWidget.tsx` for an example of props, loading, and error UI, and `DashboardGrid.tsx` for the layout container.


