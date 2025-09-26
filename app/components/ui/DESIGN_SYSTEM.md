# Corenz Design System - Flagship Glassmorphic Refresh

## Overview

The Corenz Design System represents a flagship-grade glassmorphic refresh that elevates every surface, navigation element, table, and state experience while maintaining full compatibility with the existing tenant-driven color scheme.

## Core Principles

### 1. **Tenant-Aware Theming**
- All components respect CSS custom properties set via `TenantThemeProvider`
- Color values flow through HSL-based CSS variables
- Maintains compatibility with existing tenant configurations

### 2. **Glassmorphic Hierarchy**
- **Subtle**: Low opacity (0.5) for backgrounds and overlays
- **Medium**: Standard opacity (0.7) for most surfaces
- **Strong**: High opacity (0.85) for important elements
- **Ultra**: Maximum opacity (0.95) for critical surfaces

### 3. **Depth & Elevation**
- 5-level shadow system (`shadow-depth-1` through `shadow-depth-5`)
- Consistent lift effects on hover (`hover-lift`)
- Premium transitions with `transition-premium` (400ms)

## Component Library

### Glass Surfaces

```tsx
import { GlassSurface, GlassCard, GlassPanel } from '@/components/ui/GlassSurface';

// Basic usage
<GlassSurface intensity="medium" size="lg">
  Content
</GlassSurface>

// Card variant
<GlassCard>
  Card content with enhanced glass effects
</GlassCard>

// Panel variant
<GlassPanel>
  Panel content for sections
</GlassPanel>
```

### Buttons

```tsx
import Button from '@/components/ui/Button';

// Variants
<Button variant="primary">Primary Action</Button>
<Button variant="glass">Glass Button</Button>
<Button variant="secondary">Secondary</Button>

// With icons
<Button icon={<IconComponent />}>With Icon</Button>

// States
<Button loading>Loading...</Button>
<Button glow>Glow Effect</Button>
<Button pill>Pill Shape</Button>
```

### Input Fields

```tsx
import { Input, SearchInput, PasswordInput } from '@/components/ui/Input';

// Glass input (default)
<Input placeholder="Enter text" />

// Variants
<Input variant="filled" />
<Input variant="outline" />

// Specialized inputs
<SearchInput placeholder="Search..." />
<PasswordInput placeholder="Password" />

// With icons
<Input icon={<Icon />} iconPosition="start" />
```

### Cards

```tsx
import { Card, MetricCard, FeatureCard } from '@/components/ui/Card';

// Basic card
<Card 
  title="Card Title"
  icon={<Icon />}
  variant="elevated"
  hoverable
>
  Card content
</Card>

// Metric card
<MetricCard
  title="Total Users"
  value="12,345"
  change="+12.5%"
  trend="up"
  icon={<UsersIcon />}
/>

// Feature card
<FeatureCard
  title="Feature Name"
  description="Feature description"
  icon={<Icon />}
  onClick={handleClick}
/>
```

### Loading States

```tsx
import { LoadingSpinner, GlassSpinner, OrbitalSpinner, PageLoader } from '@/components/ui/LoadingSpinner';

// Standard spinner
<LoadingSpinner size="md" variant="primary" />

// Glass spinner
<GlassSpinner size="lg" />

// Orbital spinner (premium)
<OrbitalSpinner size="xl" />

// Full page loader
<PageLoader text="Loading dashboard..." />
```

## Design Tokens

### Colors
- **Primary**: Tenant-specific via `--primary`
- **Glass backgrounds**: RGBA with variable opacity
- **Sunset palette**: `--sunset-1`, `--sunset-2`, `--sunset-3`
- **Editorial colors**: Purple, blue, teal, pink, orange, yellow

### Spacing
- Consistent padding scale: `p-3` (sm), `p-4` (md), `p-6` (lg), `p-8` (xl)
- Border radius: `rounded-xl` to `rounded-[2rem]`

### Effects
- **Backdrop blur**: `backdrop-blur-sm` to `backdrop-blur-max`
- **Shadows**: Glass-specific shadows with inset highlights
- **Animations**: Smooth transitions with cubic-bezier easing

## Utility Classes

### Glass Effects
```css
.glass           /* Standard glass effect */
.glass-strong    /* High opacity glass */
.glass-subtle    /* Low opacity glass */
.glass-ultra     /* Maximum opacity glass */
.glass-card      /* Card-specific glass gradient */
```

### Hover Effects
```css
.hover-lift      /* Lifts element on hover */
.hover-scale     /* Scales element on hover */
.hover-glow      /* Adds glow effect on hover */
.hover-glass     /* Enhances glass effect on hover */
```

### Transitions
```css
.transition-smooth   /* 200ms transition */
.transition-glass    /* 300ms transition */
.transition-premium  /* 400ms transition */
```

### Focus States
```css
.focus-ring         /* Standard focus ring */
.focus-ring-subtle  /* Subtle focus ring */
```

## Background System

The app uses a layered background system for depth:

1. **Base gradient**: `bg-gradient-landscape` with morph animation
2. **Aurora overlay**: Animated color gradient
3. **Noise texture**: Subtle texture for depth
4. **Vignette**: Radial gradient for focus
5. **Top light**: Primary color accent

## Responsive Design

- **Mobile-first approach**: Components adapt to screen size
- **Breakpoints**: `sm` (640px), `md` (768px), `lg` (1024px), `xl` (1280px)
- **Touch targets**: Minimum 44px for mobile interactions
- **Safe areas**: Proper padding for mobile devices

## Accessibility

- **Focus indicators**: Visible focus rings on all interactive elements
- **ARIA labels**: Proper labeling for screen readers
- **Color contrast**: Meets WCAG AA standards
- **Keyboard navigation**: Full keyboard support

## Performance

- **CSS-based effects**: Hardware-accelerated transforms
- **Lazy animations**: Only animate on interaction
- **Reduced motion**: Respects `prefers-reduced-motion`
- **Optimized shadows**: Limited shadow layers for performance

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers: iOS Safari 14+, Chrome Mobile

## Migration Guide

### From Old Components

```tsx
// Old Button
<button className="bg-primary text-white px-4 py-2 rounded">
  Click me
</button>

// New Button
<Button variant="primary">
  Click me
</Button>
```

```tsx
// Old Card
<div className="bg-white rounded-lg shadow p-6">
  Content
</div>

// New Card
<Card variant="elevated" hoverable>
  Content
</Card>
```

## Component Showcase

Visit `/showcase` to see all components in action with interactive examples.

## Future Enhancements

- [ ] Advanced data table with glass effects
- [ ] Modal and dialog system refresh
- [ ] Enhanced skeleton loaders
- [ ] Animated sidebar transitions
- [ ] Advanced form components
- [ ] Chart components with glass styling

## Contributing

When adding new components:
1. Use existing glass utilities
2. Maintain tenant theme compatibility
3. Include hover/focus states
4. Test in light/dark modes
5. Ensure accessibility
6. Add to component showcase

## Support

For questions or issues, contact the platform team or refer to the component showcase at `/showcase`.
