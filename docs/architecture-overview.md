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

### Complete Request Flow (Database → API → Frontend)

This section traces how data flows from PostgreSQL through the application layers, using the **Performance Objectives** feature as a concrete example.

---

## 1. Database Layer (PostgreSQL via Prisma)

### Schema Definition (`prisma/schema.prisma`)

```prisma
model User {
  id                String   @id
  email             String
  password          String
  role              Role     @default(EMPLOYEE)
  companyId         String   // Multi-tenant isolation
  homeCompanyId     String?
  firstName         String?
  lastName          String?
  // ... 50+ fields
  
  Company           Company  @relation(fields: [companyId], references: [id])
  Employee          Employee?
  OwnedCompanyObjectives    CompanyObjective[]  @relation("CompanyObjectiveOwner")
  CreatedCompanyObjectives  CompanyObjective[]  @relation("CompanyObjectiveCreator")
  // ... 40+ relations
  
  @@index([companyId])
  @@index([email])
}

model CompanyObjective {
  id          String   @id
  companyId   String   // Tenant isolation
  title       String
  description String?
  status      ObjectiveStatus
  progress    Int      @default(0)
  priority    Priority
  owner       String
  createdBy   String
  dueDate     DateTime?
  
  Company     Company  @relation(fields: [companyId], references: [id])
  Owner       User     @relation("CompanyObjectiveOwner", fields: [owner], references: [id])
  Creator     User     @relation("CompanyObjectiveCreator", fields: [createdBy], references: [id])
  keyResults  ObjectiveKeyResult[]
  updates     ObjectiveUpdate[]
  
  @@index([companyId, status])
  @@index([owner])
}

model Employee {
  id        String  @id
  userId    String  @unique
  companyId String
  // ... employee-specific fields
  
  User      User    @relation(fields: [userId], references: [id])
  Company   Company @relation(fields: [companyId], references: [id])
  
  @@index([companyId])
  @@index([userId])
}
```

**Key Points**:
- Every model includes `companyId` for multi-tenant isolation
- User ↔ Employee: One-to-one relationship via `userId`
- Indexes optimize queries by `companyId` and foreign keys
- Relations enable eager loading with `include`

### Prisma Client Singleton (`app/lib/prisma.ts`)

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.LOG_PRISMA === "true" ? ["query"] : [],
  });

// Prevent multiple instances in development
if (process.env.NODE_ENV !== "production") 
  globalForPrisma.prisma = prisma;
```

**Purpose**: Single Prisma Client instance shared across all API routes.

---

## 2. Authentication Layer (NextAuth.js)

### Auth Configuration (`app/lib/auth-options.ts`)

```typescript
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  
  providers: [
    CredentialsProvider({
      async authorize(credentials) {
        // 1. Query User from database
        const users = await prisma.user.findMany({
          where: { 
            email: { equals: credentials.email, mode: "insensitive" } 
          },
          select: {
            id: true,
            email: true,
            password: true,
            role: true,
            companyId: true,
            firstName: true,
            lastName: true,
          },
        });
        
        // 2. Verify password with bcrypt
        for (const candidate of users) {
          const ok = await bcrypt.compare(credentials.password, candidate.password);
          if (ok) {
            // 3. Return user object (becomes JWT payload)
            return {
              id: candidate.id,
              email: candidate.email,
              role: candidate.role,
              companyId: candidate.companyId, // ✅ Critical for multi-tenancy
            };
          }
        }
        return null;
      },
    }),
  ],
  
  callbacks: {
    // 4. JWT callback: Add custom fields to token
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.companyId = user.companyId; // ✅ Stored in JWT
        token.homeCompanyId = user.companyId;
      }
      return token;
    },
    
    // 5. Session callback: Expose token fields to client
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.companyId = token.companyId; // ✅ Available in session
        session.user.homeCompanyId = token.homeCompanyId;
        session.user.canManageTenants = session.user.role === "SUPER_ADMIN";
      }
      return session;
    },
  },
};
```

**Flow**:
1. User submits credentials → `authorize()` queries database
2. Password verified → User object returned
3. `jwt()` callback adds `companyId` to JWT token
4. `session()` callback exposes fields to client-side session
5. JWT stored in HTTP-only cookie

### Type Extensions (`types/next-auth.d.ts`)

```typescript
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      role: "ADMIN" | "MANAGER" | "EMPLOYEE" | "SUPER_ADMIN";
      companyId: string; // ✅ Always present
      homeCompanyId: string;
      canManageTenants: boolean;
    };
  }
  
  interface User {
    id: string;
    role: string;
    companyId: string; // ✅ Required
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    companyId: string; // ✅ In JWT token
    homeCompanyId?: string;
  }
}
```

---

## 3. API Route Layer (`app/api/`)

### Example: GET Objectives (`app/api/objectives/route.ts`)

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function GET(req: NextRequest) {
  try {
    // 1. ✅ Get session from NextAuth (server-side)
    const session = await getServerSession(authOptions);
    
    // 2. ✅ Verify authentication
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // 3. Extract query parameters
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    
    // 4. ✅ Fetch employee record (User → Employee relationship)
    const employee = await prisma.employee.findUnique({
      where: { userId: session.user.id },
    });
    
    // 5. ✅ Query database with multi-tenant filtering
    const companyObjectives = await prisma.companyObjective.findMany({
      where: {
        companyId: session.user.companyId, // ✅ Tenant isolation
        ...(status && { status: status as any }),
      },
      include: {
        Owner: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        Creator: {
          select: { id: true, firstName: true, lastName: true },
        },
        keyResults: true,
        updates: {
          take: 3,
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    
    // 6. Return JSON response
    return NextResponse.json({ 
      objectives: companyObjectives.map(obj => ({ ...obj, type: "company" }))
    });
    
  } catch (error) {
    console.error("[objectives-get]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

**Key Steps**:
1. **Authentication**: `getServerSession(authOptions)` retrieves JWT-based session
2. **Authorization**: Check `session.user.companyId` exists
3. **User → Employee Lookup**: Find employee record via `userId`
4. **Multi-Tenant Query**: Filter by `companyId` (tenant isolation)
5. **Eager Loading**: Use `include` to fetch related data
6. **Response**: Return JSON with proper status codes

### Example: POST Objective (`app/api/objectives/route.ts`)

```typescript
export async function POST(req: NextRequest) {
  try {
    // 1. Get session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // 2. Parse and validate request body
    const body = await req.json();
    const validated = objectiveSchema.parse(body); // Zod validation
    
    // 3. Authorization check (role-based)
    if (validated.type === "company") {
      const isManagerOrAdmin = 
        session.user.role === "ADMIN" || 
        session.user.role === "MANAGER";
      
      if (!isManagerOrAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    
    // 4. Create objective in database
    const createdObjective = await prisma.companyObjective.create({
      data: {
        id: crypto.randomUUID(),
        companyId: session.user.companyId, // ✅ Tenant scoping
        title: validated.title,
        description: validated.description,
        status: validated.status || "NOT_STARTED",
        priority: validated.priority || "MEDIUM",
        createdBy: session.user.id, // ✅ Audit trail
        owner: validated.owner,
        dueDate: validated.dueDate ? new Date(validated.dueDate) : null,
      },
      include: {
        Owner: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    
    // 5. Create related key results
    if (validated.keyResults?.length > 0) {
      await Promise.all(
        validated.keyResults.map((kr) =>
          prisma.objectiveKeyResult.create({
            data: {
              id: crypto.randomUUID(),
              title: kr.title,
              targetValue: kr.targetValue,
              currentValue: kr.currentValue || 0,
              companyObjectiveId: createdObjective.id,
            },
          })
        )
      );
    }
    
    return NextResponse.json({ objective: createdObjective }, { status: 201 });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

**Key Steps**:
1. **Authentication**: Verify session exists
2. **Validation**: Zod schema validates request body
3. **Authorization**: Role-based access control (RBAC)
4. **Database Write**: Create with `companyId` and `createdBy`
5. **Related Records**: Create key results in transaction
6. **Error Handling**: Distinguish validation vs server errors

### Example: GET Single Objective (`app/api/objectives/[id]/route.ts`)

```typescript
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // 1. Find objective across multiple tables
    const result = await findObjective(id, session.user.companyId);
    if (!result) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    
    // 2. Check access for personal objectives
    if (result.type === "personal") {
      const employee = await prisma.employee.findUnique({
        where: { userId: session.user.id },
      });
      
      const canView =
        isManagerOrAdmin(session.user.role) ||
        (employee && employee.id === result.objective.employeeId);
      
      if (!canView) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    
    return NextResponse.json({ 
      objective: result.objective, 
      type: result.type 
    });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

**Authorization Patterns**:
- **Tenant Isolation**: Always filter by `session.user.companyId`
- **Role-Based**: Check `session.user.role` for admin/manager actions
- **Resource-Based**: Verify ownership (e.g., employee owns personal objective)

---

## 4. Frontend Layer (`app/(withSidebar)/`)

### Client Component (`app/(withSidebar)/performance/objectives/new/page.tsx`)

```typescript
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react"; // ✅ Client-side session hook
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function CreateObjectivePage() {
  // 1. ✅ Get session on client side
  const { data: session } = useSession();
  const router = useRouter();
  
  // 2. Local state management
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"company" | "team" | "personal">("company");
  
  // 3. ✅ Authorization check (client-side)
  const canManageTemplates =
    session?.user?.role === "ADMIN" ||
    session?.user?.role === "SUPER_ADMIN" ||
    session?.user?.role === "MANAGER";
  
  useEffect(() => {
    if (session && !canManageTemplates && type !== "personal") {
      toast.error("You don't have permission to create company objectives");
      router.push("/performance");
    }
  }, [session, canManageTemplates, type]);
  
  // 4. Form submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // 5. ✅ Call API route (session automatically sent via cookie)
      const response = await fetch("/api/objectives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          type,
          priority: "MEDIUM",
          status: "NOT_STARTED",
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create objective");
      }
      
      const { objective } = await response.json();
      toast.success("Objective created successfully");
      
      // 6. Navigate to success page
      router.push("/performance?tab=objectives");
      
    } catch (error: any) {
      console.error("Error creating objective:", error);
      toast.error(error.message || "Failed to create objective");
    } finally {
      setLoading(false);
    }
  };
  
  // 7. Loading state while session loads
  if (!session) {
    return <LoadingSpinner />;
  }
  
  // 8. Render form
  return (
    <form onSubmit={handleSubmit}>
      <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
      <Button type="submit" disabled={loading}>
        {loading ? "Creating..." : "Create Objective"}
      </Button>
    </form>
  );
}
```

**Client-Side Flow**:
1. **Session Hook**: `useSession()` provides client-side access to session
2. **Authorization**: Check `session.user.role` before rendering UI
3. **API Call**: `fetch()` automatically includes session cookie
4. **Error Handling**: Display user-friendly messages with `toast`
5. **Navigation**: Redirect after success with `useRouter()`

### Data Fetching with SWR

```typescript
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then(res => res.json());

function ObjectivesList() {
  const { data: session } = useSession();
  
  // ✅ SWR handles caching, revalidation, and loading states
  const { data, error, isLoading, mutate } = useSWR(
    session ? "/api/objectives?type=company" : null,
    fetcher,
    {
      refreshInterval: 30000, // Revalidate every 30s
      revalidateOnFocus: true,
    }
  );
  
  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  
  return (
    <div>
      {data?.objectives.map(obj => (
        <ObjectiveCard key={obj.id} objective={obj} onUpdate={mutate} />
      ))}
    </div>
  );
}
```

**SWR Benefits**:
- Automatic caching and deduplication
- Revalidation on focus/reconnect
- Optimistic UI updates with `mutate()`
- Loading and error states built-in

---

## 5. Complete Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     PostgreSQL Database                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  ┌──────────┐   │
│  │   User   │  │ Employee │  │CompanyObjective│  │ Company  │   │
│  │          │  │          │  │                │  │          │   │
│  │ companyId├──┤ companyId├──┤   companyId    ├──┤    id    │   │
│  │   role   │  │  userId  │  │     owner      │  │   name   │   │
│  └────┬─────┘  └────┬─────┘  └───────┬────────┘  └──────────┘   │
└───────┼─────────────┼────────────────┼──────────────────────────┘
        │             │                │
        │             │                │
┌───────▼─────────────▼────────────────▼──────────────────────────┐
│                    Prisma Client (Singleton)                     │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  prisma.user.findMany({ where: { companyId } })           │ │
│  │  prisma.companyObjective.create({ data: {...} })          │ │
│  └────────────────────────────────────────────────────────────┘ │
└───────────────────────────────┬──────────────────────────────────┘
                                │
┌───────────────────────────────▼──────────────────────────────────┐
│                    NextAuth.js (Authentication)                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  1. User logs in → Credentials validated                  │ │
│  │  2. JWT created with { id, role, companyId }              │ │
│  │  3. JWT stored in HTTP-only cookie                        │ │
│  │  4. Session object exposed to client                      │ │
│  └────────────────────────────────────────────────────────────┘ │
└───────────────────────────────┬──────────────────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
┌───────────────────▼──────────┐  ┌─────────▼──────────────────────┐
│   API Routes (Server-Side)   │  │  Client Components (Browser)   │
│  ┌──────────────────────────┐│  │  ┌───────────────────────────┐│
│  │ GET /api/objectives      ││  │  │ useSession() hook         ││
│  │                          ││  │  │   ↓                       ││
│  │ 1. getServerSession()    ││  │  │ session.user.id           ││
│  │ 2. Check companyId       ││  │  │ session.user.role         ││
│  │ 3. Query Prisma          ││  │  │ session.user.companyId    ││
│  │ 4. Return JSON           ││  │  │   ↓                       ││
│  └──────────────────────────┘│  │  │ fetch("/api/objectives")  ││
│                               │  │  │   ↓                       ││
│  ┌──────────────────────────┐│  │  │ Display data in UI        ││
│  │ POST /api/objectives     ││  │  └───────────────────────────┘│
│  │                          ││  │                                │
│  │ 1. getServerSession()    ││  │  ┌───────────────────────────┐│
│  │ 2. Validate body (Zod)   ││  │  │ SWR for data fetching     ││
│  │ 3. Check authorization   ││  │  │                           ││
│  │ 4. prisma.create()       ││  │  │ - Automatic caching       ││
│  │ 5. Return created obj    ││  │  │ - Revalidation            ││
│  └──────────────────────────┘│  │  │ - Optimistic updates      ││
└──────────────────────────────┘  │  └───────────────────────────┘│
                                  └────────────────────────────────┘
```

---

## 6. Session Propagation Patterns

### Server-Side (API Routes & Server Components)

```typescript
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

// In API Route
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  // session.user.companyId available
}

// In Server Component
export default async function Page() {
  const session = await getServerSession(authOptions);
  // session.user.role available
}
```

### Client-Side (Client Components)

```typescript
"use client";
import { useSession } from "next-auth/react";

export default function Component() {
  const { data: session, status } = useSession();
  
  if (status === "loading") return <Loading />;
  if (status === "unauthenticated") return <Login />;
  
  // session.user.companyId available
  // session.user.role available
}
```

### Session Provider (Root Layout)

```typescript
// app/components/Providers.tsx
"use client";
import { SessionProvider } from "next-auth/react";

export default function Providers({ children }) {
  return (
    <SessionProvider>
      {children}
    </SessionProvider>
  );
}
```

---

## 7. Multi-Tenant Data Isolation

Every database query MUST filter by `companyId`:

```typescript
// ✅ CORRECT: Tenant-scoped query
const objectives = await prisma.companyObjective.findMany({
  where: {
    companyId: session.user.companyId, // Always required
    status: "IN_PROGRESS",
  },
});

// ❌ WRONG: Missing tenant filter (security vulnerability)
const objectives = await prisma.companyObjective.findMany({
  where: {
    status: "IN_PROGRESS", // Exposes all tenants' data!
  },
});
```

**Enforcement**:
- All Prisma queries include `companyId` filter
- Database indexes on `companyId` for performance
- API routes validate `session.user.companyId` exists
- TypeScript types require `companyId` field

---

## 8. Authorization Patterns

### Role-Based Access Control (RBAC)

```typescript
function isManagerOrAdmin(role?: string) {
  return role === "ADMIN" || 
         role === "SUPER_ADMIN" || 
         role === "MANAGER" || 
         role === "HR";
}

// In API route
if (!isManagerOrAdmin(session.user.role)) {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
```

### Resource-Based Access Control

```typescript
// Check if user owns the resource
const employee = await prisma.employee.findUnique({
  where: { userId: session.user.id },
});

const canEdit = 
  isManagerOrAdmin(session.user.role) ||
  (employee && employee.id === objective.employeeId);

if (!canEdit) {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
```

### Permission Helper (`lib/permissions.ts`)

```typescript
export async function canAccessEmployee(
  userId: string,
  employeeId: string,
  companyId: string
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { Employee: true },
  });
  
  // Admin/Manager can access all employees in their company
  if (isManagerOrAdmin(user?.role)) return true;
  
  // Employee can only access their own record
  return user?.Employee?.id === employeeId;
}
```

---

## Summary: Complete Request Lifecycle

### Example: Creating a Company Objective

1. **User Action**: Clicks "Create Objective" button
2. **Client Component**: Calls `fetch("/api/objectives", { method: "POST", body: {...} })`
3. **Browser**: Sends HTTP request with session cookie
4. **API Route**: `POST /api/objectives`
   - Calls `getServerSession(authOptions)`
   - NextAuth decodes JWT from cookie
   - Returns session object with `{ user: { id, role, companyId } }`
5. **Authorization**: Checks `session.user.role` === "ADMIN" or "MANAGER"
6. **Validation**: Zod schema validates request body
7. **Database Query**: 
   ```typescript
   await prisma.companyObjective.create({
     data: {
       companyId: session.user.companyId, // Tenant isolation
       createdBy: session.user.id,        // Audit trail
       ...validated,
     },
   })
   ```
8. **Prisma**: Generates SQL: `INSERT INTO "CompanyObjective" (...) VALUES (...)`
9. **PostgreSQL**: Executes query, returns created record
10. **API Response**: Returns JSON with created objective
11. **Client**: Receives response, shows success toast, redirects
12. **SWR**: Revalidates cached data, updates UI

**Key Takeaways**:
- Session data flows from JWT → API routes → Database queries
- `companyId` enforces multi-tenant isolation at every layer
- Authorization happens at both client (UX) and server (security)
- Prisma provides type-safe database access with relations
- NextAuth handles authentication, session management, and JWT

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

---

## Critical Data Flow Insights

### 1. Session is the Source of Truth
- **JWT Token** contains: `{ id, role, companyId, homeCompanyId }`
- **Server-side**: `getServerSession(authOptions)` in API routes
- **Client-side**: `useSession()` hook in components
- **Cookie**: HTTP-only, automatically sent with every request

### 2. Multi-Tenancy is Enforced at Every Layer
- **Database**: All models have `companyId` field with indexes
- **API Routes**: Every query filters by `session.user.companyId`
- **Prisma**: Type-safe queries prevent accidental cross-tenant access
- **Validation**: Session check happens before any database operation

### 3. User ↔ Employee Relationship
- **User**: Authentication entity (login credentials, role, companyId)
- **Employee**: HR entity (job details, manager, department)
- **Link**: `Employee.userId` → `User.id` (one-to-one)
- **Pattern**: API routes often query both: `prisma.employee.findUnique({ where: { userId: session.user.id } })`

### 4. Authorization Layers
1. **Client-side** (UX): Hide UI elements based on `session.user.role`
2. **API Route** (Security): Verify `session.user.role` before database operations
3. **Database** (Isolation): Filter by `companyId` in all queries
4. **Resource-level**: Check ownership (e.g., employee can only edit their own objectives)

### 5. Data Flow Summary

```
PostgreSQL (companyId indexed)
    ↕ Prisma Client (type-safe queries)
    ↕ API Routes (getServerSession + authorization)
    ↕ NextAuth JWT (HTTP-only cookie)
    ↕ Client Components (useSession + fetch)
    ↕ User Interface (React + SWR caching)
```

**Every request follows this pattern**:
1. Client sends request with session cookie
2. API route validates session (401 if missing)
3. API route checks authorization (403 if forbidden)
4. API route queries database with `companyId` filter
5. Prisma generates SQL with proper WHERE clauses
6. PostgreSQL returns tenant-scoped data
7. API route returns JSON response
8. Client updates UI (SWR handles caching)

---

**This document should inform all subsequent development work.**
