# UI Skeletons

The `PageSkeleton` and `SectionSkeleton` components provide reusable shimmering placeholders that match the layout patterns used across the app. Use them inside loading states and Suspense fallbacks instead of generic "Loading" text so that prefetching and navigation feel consistent.

## SectionSkeleton

`SectionSkeleton` is the workhorse placeholder. It can render stacked rows, table-style grids, or card grids depending on the `variant` you pick.

```tsx
import { SectionSkeleton } from "@/components/ui/PageSkeleton";

// Table body loading state inside an existing Card
<CardContent>
  {isLoading ? (
    <SectionSkeleton showContainer={false} variant="table" rows={5} />
  ) : (
    <Table>...</Table>
  )}
</CardContent>
```

Key props:

- `variant`: `"rows" | "grid" | "table"` (defaults to `"rows"`).
- `rows`: number of rows to render for the `rows`/`table` variants.
- `gridItems` / `gridCols`: customise card grids.
- `showContainer`: wrap the skeleton with the standard card chrome. Set to `false` when the parent already provides the card surface.
- `showHeader`, `showAction`, `showToolbar`: opt-in skeletons for common header/toolbars.
- `lineClassName`: override the default row height/width (handy for large content blocks like calendars or editors).

## PageSkeleton

`PageSkeleton` composes multiple `SectionSkeleton` instances and renders a page shell skeleton (title, optional breadcrumbs, header action). It is useful for Suspense fallbacks where no page content has rendered yet.

```tsx
import { PageSkeleton } from "@/components/ui/PageSkeleton";

<Suspense
  fallback={
    <PageSkeleton
      showHeaderAction
      sections={[
        { showHeader: true, variant: "grid", gridItems: 4, gridCols: 2 },
        { showHeader: true, variant: "table", rows: 6, showToolbar: true },
      ]}
    />
  }
>
  <ReportsPreviewClient />
</Suspense>
```

### Usage notes

- Match the structure of the loaded content: prefer a `grid` variant for filter/forms, a `table` variant for tabular data, and tall `lineClassName` overrides for large canvases (e.g. calendars or editors).
- Keep `showContainer={false}` when dropping the skeleton inside an existing `Card` to avoid double borders.
- Skeletons inherit the shimmering effect from the shared `Skeleton` primitive, so no extra animation wiring is needed.
