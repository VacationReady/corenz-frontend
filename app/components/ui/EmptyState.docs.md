# EmptyState component

Use the `EmptyState` component for any dashboard or settings surface that needs to explain why no data is available yet. The component keeps messaging consistent across products and supports regional guidance when paired with tenant metadata.

## Usage

```tsx
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";

export function PermissionProfilesEmptyState() {
  const router = useRouter();

  return (
    <EmptyState
      tone="brand"
      title="No permission profiles yet"
      description="Create tailored access so managers only see what they need."
      guidance={[
        "Start with the NZ Payroll Manager template to share pay data safely.",
        "Limit approvals to people who understand your local legislation.",
      ]}
      action={{
        label: "Create profile",
        onClick: () => router.push("/settings/permissions/new"),
      }}
    />
  );
}
```

### Props

| Prop | Type | Description |
| ---- | ---- | ----------- |
| `icon` | `LucideIcon` | Optional icon displayed in a coloured circle. Hidden when `illustration` is supplied. |
| `illustration` | `React.ReactNode` | Render an inline SVG or branded illustration instead of the default icon container. |
| `title` | `string` | Concise heading explaining the empty state. |
| `description` | `React.ReactNode` | Optional supporting copy. Supports inline formatting (links, emphasis). |
| `guidance` | `Array<React.ReactNode \| { title?: string; description: React.ReactNode }>` | Optional multi-line guidance. Each entry renders with a marker and is ideal for regional tips or next steps. |
| `tone` | `'default' \| 'brand' \| 'success' \| 'warning' \| 'danger'` | Controls the accent colour of the icon, markers, and background tint. |
| `action` | `{ label: string; onClick: () => void; variant?: 'primary' \| 'secondary' \| 'outline' }` | Optional button shown underneath the guidance. |
| `className` | `string` | Pass custom classes to tweak spacing when embedding inside cards or tiles. |

### Implementation tips

- Pair `guidance` with `useTenantRegion` to surface NZ payroll or AU award-specific next steps without duplicating copy.
- Use `illustration` for richer layouts (e.g. marketing pages) and keep icons for compact widgets.
- Keep `title` short and let `guidance` share the “what next” steps so the message stays scannable.
