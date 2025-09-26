"use client";

import React from "react";
import { 
  Search, 
  Settings, 
  Users, 
  Calendar, 
  FileText, 
  TrendingUp,
  Download,
  Upload,
  Check,
  X,
  AlertCircle,
  Info,
  ChevronRight,
  Plus,
  Edit,
  Trash,
  Eye,
  Heart,
  Share2,
  MessageSquare,
} from "lucide-react";

import Button from "../Button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, MetricCard, FeatureCard } from "../Card";
import { Input, SearchInput, PasswordInput } from "../Input";
import { GlassSurface, GlassCard, GlassPanel, GlassContainer } from "../GlassSurface";
import { LoadingSpinner, GlassSpinner, OrbitalSpinner, PageLoader } from "../LoadingSpinner";
import { EmptyState } from "../EmptyState";

export default function ComponentShowcase() {
  const [loading, setLoading] = React.useState(false);

  return (
    <div className="min-h-screen p-8 space-y-16">
      {/* Header */}
      <header className="glass-ultra rounded-3xl p-8 shadow-depth-3">
        <h1 className="text-4xl font-bold text-foreground mb-4">
          Corenz Design System
        </h1>
        <p className="text-lg text-muted-foreground">
          Flagship glassmorphic component library with tenant-aware theming
        </p>
      </header>

      {/* Glass Surfaces */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-foreground">Glass Surfaces</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <GlassSurface intensity="subtle" size="md">
            <h3 className="font-medium mb-2">Subtle Glass</h3>
            <p className="text-sm text-muted-foreground">Low opacity surface</p>
          </GlassSurface>

          <GlassSurface intensity="medium" size="md">
            <h3 className="font-medium mb-2">Medium Glass</h3>
            <p className="text-sm text-muted-foreground">Standard surface</p>
          </GlassSurface>

          <GlassSurface intensity="strong" size="md">
            <h3 className="font-medium mb-2">Strong Glass</h3>
            <p className="text-sm text-muted-foreground">High opacity surface</p>
          </GlassSurface>

          <GlassSurface intensity="ultra" size="md">
            <h3 className="font-medium mb-2">Ultra Glass</h3>
            <p className="text-sm text-muted-foreground">Maximum opacity</p>
          </GlassSurface>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <GlassCard>
            <h3 className="font-medium mb-2">Glass Card</h3>
            <p className="text-sm text-muted-foreground">
              Card variant with enhanced glass effects and hover states
            </p>
          </GlassCard>

          <GlassPanel>
            <h3 className="font-medium mb-2">Glass Panel</h3>
            <p className="text-sm text-muted-foreground">
              Panel variant for sections and containers
            </p>
          </GlassPanel>

          <GlassContainer>
            <h3 className="font-medium mb-2">Glass Container</h3>
            <p className="text-sm text-muted-foreground">
              Container with noise texture overlay
            </p>
          </GlassContainer>
        </div>
      </section>

      {/* Buttons */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-foreground">Buttons</h2>
        
        <div className="glass-panel space-y-4">
          <div className="flex flex-wrap gap-4">
            <Button variant="primary">Primary Button</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="glass">Glass Button</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
          </div>

          <div className="flex flex-wrap gap-4">
            <Button size="sm" variant="primary">Small</Button>
            <Button size="md" variant="primary">Medium</Button>
            <Button size="lg" variant="primary">Large</Button>
            <Button size="icon" variant="glass">
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex flex-wrap gap-4">
            <Button variant="primary" icon={<Download className="w-4 h-4" />}>
              Download
            </Button>
            <Button variant="glass" icon={<Upload className="w-4 h-4" />} iconPosition="end">
              Upload
            </Button>
            <Button variant="secondary" pill>
              Pill Button
            </Button>
            <Button variant="primary" glow>
              Glow Effect
            </Button>
          </div>

          <div className="flex flex-wrap gap-4">
            <Button loading loadingText="Processing...">
              Loading State
            </Button>
            <Button disabled>Disabled</Button>
            <Button variant="glass" loading>
              Glass Loading
            </Button>
          </div>
        </div>
      </section>

      {/* Input Fields */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-foreground">Input Fields</h2>
        
        <div className="glass-panel space-y-4 max-w-md">
          <Input placeholder="Default glass input" />
          <Input variant="filled" placeholder="Filled variant" />
          <Input variant="outline" placeholder="Outline variant" />
          <Input 
            variant="glass" 
            placeholder="With icon" 
            icon={<Settings className="w-4 h-4" />}
          />
          <Input 
            variant="glass" 
            placeholder="Icon at end" 
            icon={<Check className="w-4 h-4" />}
            iconPosition="end"
          />
          <SearchInput placeholder="Search anything..." />
          <PasswordInput placeholder="Enter password" />
          <Input 
            variant="glass" 
            placeholder="Error state" 
            error
          />
          <Input 
            variant="glass" 
            placeholder="Disabled input" 
            disabled
          />
        </div>
      </section>

      {/* Cards */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-foreground">Cards</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card title="Default Card" icon={<FileText className="w-5 h-5" />}>
            <p>Standard card with glass morphism effects</p>
          </Card>

          <Card 
            variant="elevated" 
            title="Elevated Card" 
            icon={<TrendingUp className="w-5 h-5" />}
            hoverable
          >
            <p>Card with elevation and hover effects</p>
          </Card>

          <Card 
            variant="gradient" 
            title="Gradient Card"
            action={<Button size="sm" variant="ghost">Action</Button>}
            glow
          >
            <p>Card with gradient background and glow</p>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <MetricCard
            title="Total Users"
            value="12,345"
            change="+12.5%"
            trend="up"
            icon={<Users className="w-5 h-5" />}
          />
          <MetricCard
            title="Revenue"
            value="$89,234"
            change="-3.2%"
            trend="down"
            icon={<TrendingUp className="w-5 h-5" />}
          />
          <MetricCard
            title="Active Sessions"
            value="1,234"
            change="No change"
            trend="neutral"
            icon={<Eye className="w-5 h-5" />}
          />
          <MetricCard
            title="Completion Rate"
            value="87.5%"
            change="+5.3%"
            trend="up"
            icon={<Check className="w-5 h-5" />}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FeatureCard
            title="Employee Management"
            description="Manage your team members, roles, and permissions"
            icon={<Users className="w-6 h-6" />}
            onClick={() => console.log("Feature clicked")}
          />
          <FeatureCard
            title="Document Center"
            description="Store, organize, and share company documents"
            icon={<FileText className="w-6 h-6" />}
            onClick={() => console.log("Feature clicked")}
          />
          <FeatureCard
            title="Analytics Dashboard"
            description="Track performance metrics and generate reports"
            icon={<TrendingUp className="w-6 h-6" />}
            onClick={() => console.log("Feature clicked")}
          />
        </div>
      </section>

      {/* Loading States */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-foreground">Loading States</h2>
        
        <div className="glass-panel">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center space-y-2">
              <LoadingSpinner size="sm" />
              <p className="text-sm text-muted-foreground">Small</p>
            </div>
            <div className="text-center space-y-2">
              <LoadingSpinner size="md" />
              <p className="text-sm text-muted-foreground">Medium</p>
            </div>
            <div className="text-center space-y-2">
              <LoadingSpinner size="lg" />
              <p className="text-sm text-muted-foreground">Large</p>
            </div>
            <div className="text-center space-y-2">
              <LoadingSpinner size="xl" />
              <p className="text-sm text-muted-foreground">Extra Large</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-8">
            <div className="text-center space-y-2">
              <GlassSpinner size="sm" />
              <p className="text-sm text-muted-foreground">Glass Small</p>
            </div>
            <div className="text-center space-y-2">
              <GlassSpinner size="md" />
              <p className="text-sm text-muted-foreground">Glass Medium</p>
            </div>
            <div className="text-center space-y-2">
              <GlassSpinner size="lg" />
              <p className="text-sm text-muted-foreground">Glass Large</p>
            </div>
            <div className="text-center space-y-2">
              <GlassSpinner size="xl" />
              <p className="text-sm text-muted-foreground">Glass XL</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-8">
            <div className="text-center space-y-2">
              <OrbitalSpinner size="sm" />
              <p className="text-sm text-muted-foreground">Orbital Small</p>
            </div>
            <div className="text-center space-y-2">
              <OrbitalSpinner size="md" />
              <p className="text-sm text-muted-foreground">Orbital Medium</p>
            </div>
            <div className="text-center space-y-2">
              <OrbitalSpinner size="lg" />
              <p className="text-sm text-muted-foreground">Orbital Large</p>
            </div>
            <div className="text-center space-y-2">
              <OrbitalSpinner size="xl" />
              <p className="text-sm text-muted-foreground">Orbital XL</p>
            </div>
          </div>
        </div>
      </section>

      {/* Empty States */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-foreground">Empty States</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <EmptyState
              icon={Users}
              title="No team members yet"
              description="Get started by inviting your first team member to collaborate."
              action={{
                label: "Invite Team Member",
                onClick: () => console.log("Invite clicked"),
              }}
            />
          </Card>

          <Card>
            <EmptyState
              icon={AlertCircle}
              title="Configuration Required"
              description="Please complete the setup to enable this feature."
              tone="warning"
              guidance={[
                "Enable API access in settings",
                "Configure webhook endpoints",
                "Set up notification preferences"
              ]}
            />
          </Card>
        </div>
      </section>

      {/* Color Palette */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-foreground">Color System</h2>
        
        <div className="glass-panel">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="space-y-2">
              <div className="h-20 rounded-xl bg-primary shadow-depth-1" />
              <p className="text-sm font-medium">Primary</p>
            </div>
            <div className="space-y-2">
              <div className="h-20 rounded-xl bg-secondary shadow-depth-1" />
              <p className="text-sm font-medium">Secondary</p>
            </div>
            <div className="space-y-2">
              <div className="h-20 rounded-xl bg-accent shadow-depth-1" />
              <p className="text-sm font-medium">Accent</p>
            </div>
            <div className="space-y-2">
              <div className="h-20 rounded-xl bg-destructive shadow-depth-1" />
              <p className="text-sm font-medium">Destructive</p>
            </div>
            <div className="space-y-2">
              <div className="h-20 rounded-xl bg-sunset-1 shadow-depth-1" />
              <p className="text-sm font-medium">Sunset 1</p>
            </div>
            <div className="space-y-2">
              <div className="h-20 rounded-xl bg-sunset-2 shadow-depth-1" />
              <p className="text-sm font-medium">Sunset 2</p>
            </div>
          </div>
        </div>
      </section>

      {/* Typography */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-foreground">Typography</h2>
        
        <div className="glass-panel space-y-4">
          <h1 className="text-4xl font-bold">Heading 1 - Bold 4xl</h1>
          <h2 className="text-3xl font-semibold">Heading 2 - Semibold 3xl</h2>
          <h3 className="text-2xl font-semibold">Heading 3 - Semibold 2xl</h3>
          <h4 className="text-xl font-medium">Heading 4 - Medium xl</h4>
          <h5 className="text-lg font-medium">Heading 5 - Medium lg</h5>
          <p className="text-base">Body text - Base size for regular content</p>
          <p className="text-sm text-muted-foreground">Small text - Muted foreground</p>
          <p className="text-xs text-muted-foreground">Extra small text - For captions</p>
        </div>
      </section>

      {/* Effects & Animations */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-foreground">Effects & Animations</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-panel hover-lift cursor-pointer">
            <h3 className="font-medium mb-2">Hover Lift</h3>
            <p className="text-sm text-muted-foreground">Lifts on hover</p>
          </div>

          <div className="glass-panel hover-scale cursor-pointer">
            <h3 className="font-medium mb-2">Hover Scale</h3>
            <p className="text-sm text-muted-foreground">Scales on hover</p>
          </div>

          <div className="glass-panel hover-glow cursor-pointer">
            <h3 className="font-medium mb-2">Hover Glow</h3>
            <p className="text-sm text-muted-foreground">Glows on hover</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="glass-panel animate-fadeIn">
            <p className="text-sm">Fade In</p>
          </div>

          <div className="glass-panel animate-slideUp">
            <p className="text-sm">Slide Up</p>
          </div>

          <div className="glass-panel animate-fadeScale">
            <p className="text-sm">Fade Scale</p>
          </div>

          <div className="glass-panel animate-breathe">
            <p className="text-sm">Breathe</p>
          </div>
        </div>
      </section>
    </div>
  );
}
