# Architecture Overview - Corenz Frontend

**Project**: PeopleCore HR Management System  
**Framework**: Next.js 15.5.4 (App Router)  
**Language**: TypeScript 5.9.2  
**Database**: PostgreSQL via Prisma ORM  
**Authentication**: NextAuth.js v4  

---

## Table of Contents

1. [Project Structure](#project-structure)
2. [Core Modules](#core-modules)
3. [Architecture Patterns](#architecture-patterns)
4. [Data Flow](#data-flow)
5. [Key Technologies](#key-technologies)

---

## Project Structure

```
corenz-frontend/
├── app/                          # Next.js App Router (main application)
│   ├── (withSidebar)/           # Route group with sidebar layout
│   ├── (noSidebar)/             # Route group without sidebar
│   ├── api/                     # API routes (80+ endpoints)
│   ├── components/              # App-specific components
│   └── lib/                     # App-specific utilities
├── components/                   # Shared UI components
├── lib/                         # Shared business logic & utilities
├── prisma/                      # Database schema & migrations (135+)
├── types/                       # Shared TypeScript types
├── hooks/                       # Custom React hooks
├── tests/                       # Test suites (API, component, e2e)
├── scripts/                     # Database & maintenance scripts (52)
├── mobile/                      # React Native mobile app (Expo)
├── docs/                        # Documentation (28+ files)
└── public/                      # Static assets
```

---

## Core Modules

### 1. **`app/` - Application Layer**

#### Root Layout (`app/layout.tsx`)
- Multi-tenant detection via `x-company-id` header
- Tenant-specific theming with `getTenantPalette()`
- Global providers: SessionProvider, TenantThemeProvider, ErrorBoundary
- Inter font family with multiple weights

#### Route Groups

##### **`app/(withSidebar)/`** - Main Application
Contains primary HR features with sidebar navigation:

- **`admin/`** - Admin tools (action items, timesheets hub)
- **`analytics/`** - Data visualization
- **`assistant/`** - AI assistant interface
- **`bulk-actions/`** - Batch operations
- **`calendar/`** - Events and leave calendar
- **`dashboard/`** - Role-based dashboards
- **`documents/`** - Document management
- **`employees/`** - Employee directory (32 items)
- **`news/`** - Internal announcements
- **`onboarding/`** - Employee onboarding
- **`offboarding/`** - Employee offboarding
- **`org-chart/`** - Hierarchy visualization
- **`performance/`** - Objectives and reviews
- **`rota/`** - Shift scheduling
- **`settings/`** - System configuration (79 items)
- **`surveys/`** - Employee feedback
- **`workflows/`** - Automation builder

**Layout**: `app/(withSidebar)/Layout.tsx`
- Client component rendering `AdminSidebar`
- Two-column: 320px sidebar + flexible content
- Desktop only (hidden on mobile)

##### **`app/(noSidebar)/`**
Minimal layout for full-width pages (e.g., certain settings).

##### **`app/api/`** - Backend API (80+ Endpoints)

Major categories:
- **Auth**: `auth/[...nextauth]`, `set-password/`
- **Employees**: `employees/`, `users/`, `departments/`, `job-roles/`
- **Time**: `time-tracking/`, `timesheets/`, `shifts/`, `rota-groups/`
- **Leave**: `leave-request/`, `leave-policies/`, `calendar-events/`
- **Performance**: `performance/`, `objectives/`, `surveys/`
- **Documents**: `documents/`, `forms/`, `document-categories/`
- **Journeys**: `onboarding/`, `offboarding/`, `journeys/`
- **Automation**: `automation-rules/`, `automation-actions/`, `automation-triggers/`
- **AI**: `ai/`, `assistant/`
- **Reports**: `reports/`, `analytics/`, `dashboard/`
- **Payroll**: `payroll/`, `timesheets/`
- **System**: `tenant/`, `settings/`, `notifications/`, `cron/`

##### **`app/components/`** - Application Components

Key components:
- **`Providers.tsx`**: SessionProvider, TenantThemeProvider, TenantBrandingProvider, Toaster, CommandPalette
- **`AppBody.tsx`**: Applies tenant CSS variables, layered background system
- **`AdminSidebar.tsx`**: Main navigation (Core, HR Tools, System sections)
- **Navigation**: `sidebars/` (Admin, Employee, Manager), `navigation/SidebarPrimitives`
- **Features**: `dashboard/`, `documents/`, `employees/`, `forms/`, `onboarding/`, `performance/`
- **UI**: `ui/` (73 primitives), `shared/`

---

### 2. **`components/` - Shared Components**

Feature-specific reusable components:
- **`approvals/`** - HolidayApprovalModal
- **`onboarding/`** - ContextualHelpOverlay, JourneyTemplatePicker, ReminderConfigPanel
- **`rota/`** - AutoScheduleWizard, AvailabilityGrid, CreateShiftModal (9 files)
- **`time-tracking/`** - AddManualEntryDialog, AmendOvertimeDialog, ApprovalTimeline (12 files)
- **`ui/`** - Base UI primitives

---

### 3. **`lib/` - Business Logic**

Core utilities and service modules:

#### Subdirectories:
- **`compliance/`** (7) - compliance-analytics, compliance-audit, compliance-ui-content
- **`csv-import/`** (8) - domains/, types.ts
- **`email/`** (2) - meeting-invites, shift-notifications
- **`onboarding/`** (8) - audit-logger, help-content, insights
- **`payroll/`** (9) - Payroll calculations and exports
- **`storage/`** (1) - File storage (Supabase)

#### Key Files:
- **`auto-scheduler.ts`** (10.5KB) - Shift scheduling algorithm
- **`conflict-detector.ts`** (8.2KB) - Scheduling conflicts
- **`crypto.ts`** (11.7KB) - Encryption utilities
- **`csrf.ts`** (2.8KB) - CSRF protection
- **`geofence.ts`** (3.4KB) - Location verification
- **`gps-verification.ts`** (6.2KB) - GPS validation
- **`overtime-calculator.ts`** (35.6KB) - NZ compliance overtime
- **`overtime-validation.ts`** (10.2KB) - Overtime rules
- **`public-holiday-checker.ts`** (11.2KB) - Holiday detection
- **`push-notifications.ts`** (5.3KB) - Push service
- **`shift-swap-emails.ts`** (22.4KB) - Shift swap notifications
- **`tenant-seed.ts`** (9.4KB) - Tenant initialization
- **`validators.ts`** (7.4KB) - Common validators

---

### 4. **`prisma/` - Database**

#### Schema (`schema.prisma`)
- **Provider**: PostgreSQL
- **Size**: 4005 lines, 100+ models
- **Key Models**: User, Company, Employee, AutomationRule, AutomationExecution, Leave, Shift, Document

#### Migrations
135+ migrations in `prisma/migrations/`:
- `20241118000000_add_collaborative_editing_versioning/`
- `20250103120000_add_survey_system/`
- `20250107000000_add_nz_overtime_system/`

#### Seeding
- `seed.ts` - TypeScript seed
- `seed.js` - Legacy JavaScript seed

---

### 5. **`types/` - Type Definitions**

- `journey-metadata.ts` - Onboarding journey types
- `next-auth.d.ts` - NextAuth extensions
- `nz-payroll-export.ts` - NZ payroll types
- `performance-templates.ts` - Performance review types

---

### 6. **`tests/` - Test Suites**

- **`api/`** (11) - API route tests
- **`automation/`** (2) - Workflow tests
- **`components/`** (7) - Component + accessibility tests
- **`e2e/`** (3) - Cypress end-to-end tests

---

### 7. **`scripts/` - Maintenance**

52 utility scripts:
- Backfill scripts: `backfill-*.ts`
- Diagnostics: `diagnose-*.ts`, `debug-*.ts`
- Initialization: `initialize-default-workflows.ts`
- Testing: `evaluate-finetune.ts`

---

### 8. **`mobile/` - React Native App**

Expo-based mobile app:
```
mobile/
├── src/
│   ├── api/          # API client
│   ├── components/   # Mobile components
│   ├── navigation/   # React Navigation
│   └── screens/      # Screen components
├── assets/           # Images/icons
└── App.tsx           # Entry point
```

Features: Clock in/out, leave requests, timesheets, push notifications

---

## Architecture Patterns

### 1. **Multi-Tenant Architecture**

- **Identification**: `x-company-id` header
- **Isolation**: All models include `companyId` FK
- **Theming**: Per-tenant branding and colors
- **Scoping**: All queries filtered by `companyId`

```typescript
// app/layout.tsx
const tenantId = headerList.get("x-company-id") ?? "default";
const palette = getTenantPalette(tenantId);
```

### 2. **Route Groups**

- **`(withSidebar)`**: Standard layout with navigation
- **`(noSidebar)`**: Full-width layouts

### 3. **Component Architecture**

- **Primitives**: `SidebarPrimitives.tsx` - Base building blocks
- **Feature Components**: Domain-specific in `components/`
- **Composition**: Higher-level components compose primitives

### 4. **API Pattern**

```typescript
// app/api/[resource]/route.ts
export async function GET(request: Request) { }
export async function POST(request: Request) { }
export async function PUT(request: Request) { }
export async function DELETE(request: Request) { }
```

### 5. **Authentication**

- **Provider**: NextAuth.js v4 with Prisma Adapter
- **Sessions**: JWT-based
- **Config**: `app/lib/auth-options.ts`
- **Protection**: Middleware + `useSession()` hook

### 6. **State Management**

- **Server State**: SWR v2.3.4 (data fetching/caching)
- **Client State**: React Context (Theme, Branding)
- **Forms**: React Hook Form v7.61.1
- **Session**: NextAuth SessionProvider

### 7. **Styling**

- **Framework**: TailwindCSS v3.3.2
- **Components**: Radix UI + custom styling
- **Theming**: CSS variables via `AppBody.tsx`
- **Animations**: Framer Motion v12.19.2

### 8. **Error Handling**

- **Boundaries**: `ErrorBoundary.tsx`
- **Chunk Loading**: `ChunkErrorHandler.tsx`
- **Notifications**: Sonner v2.0.5

---

## Data Flow

### Request Flow (Server-Side)

```
Client Request
    ↓
Next.js Middleware (auth)
    ↓
app/layout.tsx (tenant detection, theme)
    ↓
Route Group Layout
    ↓
Page Component (Server Component)
    ↓
API Route
    ↓
lib/ Business Logic
    ↓
Prisma Client
    ↓
PostgreSQL
```

### Client-Side Flow

```
User Interaction
    ↓
Client Component
    ↓
SWR Hook
    ↓
API Route (/api/*)
    ↓
Business Logic (lib/)
    ↓
Database (Prisma)
    ↓
Response → SWR Cache → UI Re-render
```

### Authentication Flow

```
Login → /api/auth/[...nextauth] → NextAuth Handler
    ↓
Credential Validation (Prisma)
    ↓
JWT Token → Session Cookie
    ↓
SessionProvider → useSession() Hook
```

---

## Key Technologies

### Frontend
- **Next.js** 15.5.4, **React** 19.1.1, **TypeScript** 5.9.2
- **TailwindCSS** 3.3.2, **Radix UI**, **Lucide React** 0.513.0
- **Framer Motion** 12.19.2, **React Hook Form** 7.61.1
- **Zod** 3.25.76, **SWR** 2.3.4

### Backend
- **Prisma** 6.13.0, **PostgreSQL**
- **NextAuth.js** 4.24.11
- **OpenAI** 4.104.0, **Resend** 4.6.0, **Supabase** 2.50.3

### Specialized
- **FullCalendar**, **Recharts**, **ReactFlow**, **TipTap**
- **date-fns**, **date-holidays**, **Papa Parse**, **PDF-lib**
- **Leaflet** (maps), **Expo** 54.0.23 (mobile)

---

## Module Relationships

### Dependency Graph

```
app/layout.tsx (Root)
    ↓
├── app/(withSidebar)/Layout.tsx → AdminSidebar
│       ↓
│   Page Routes → Client Components (app/components/)
│       ↓
│   API Routes (app/api/)
│       ↓
├── lib/ (Business Logic)
│   └── Prisma (Database)
```

### Import Path Aliases

```json
{
  "@/*": ["app/*"],
  "@/components/*": ["components/*", "app/components/*"],
  "@/lib/*": ["lib/*", "app/lib/*"],
  "@/types/*": ["types/*", "app/types/*"],
  "@/hooks/*": ["app/hooks/*"]
}
```

### Key Integration Points

1. **Sidebar Navigation**: `Layout.tsx` → `AdminSidebar.tsx` → `SidebarPrimitives.tsx`
2. **Tenant Theming**: `layout.tsx` → `tenant-theme.tsx` → `AppBody.tsx`
3. **Authentication**: `[...nextauth]/route.ts` → `auth-options.ts` → Prisma
4. **AI Assistant**: `assistant/` → `api/ai/` → OpenAI SDK
5. **Automation**: `automation-rules/` → `api/automation/` → `api/cron/`

---

## Configuration

| File | Purpose |
|------|---------|
| `next.config.js` | CSP, CORS, webpack, standalone output |
| `tsconfig.json` | TypeScript config, path aliases |
| `prisma/schema.prisma` | Database schema (4005 lines) |
| `.env.local.example` | Environment variable template |
| `package.json` | Dependencies (148 lines) |

---

## Security

1. **CSP**: Strict Content Security Policy (production)
2. **CSRF**: `lib/csrf.ts` protection
3. **Multi-tenant Isolation**: `companyId` scoping
4. **Auth**: NextAuth JWT
5. **Encryption**: `lib/crypto.ts`
6. **Validation**: Zod schemas
7. **SQL Injection**: Prisma ORM (parameterized)

---

## Performance

1. **Code Splitting**: Webpack vendor chunks
2. **Image Optimization**: Next.js Image
3. **Font Optimization**: Next.js Font (Inter)
4. **SWR Caching**: Client-side data cache
5. **Server Components**: Default in App Router
6. **Lazy Loading**: Dynamic imports

---

## Summary

**Corenz Frontend** is an enterprise HR system with:
- Multi-tenant architecture with per-tenant theming
- Role-based access (Admin, Manager, Employee)
- 80+ API endpoints covering all HR functions
- AI-powered assistant and workflow automation
- Mobile companion app (React Native/Expo)
- Comprehensive test coverage
- PostgreSQL database with 100+ models

**This document should inform all subsequent development work.**
