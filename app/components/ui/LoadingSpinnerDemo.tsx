"use client";

import React from "react";
import { LoadingSpinner, GlassSpinner, OrbitalSpinner, PageLoader, InlineLoader } from "./LoadingSpinner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./Card";

export function LoadingSpinnerDemo() {
  return (
    <div className="space-y-8 p-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Modern Loading Spinners - 2025 Style</h2>
        <p className="text-muted-foreground mb-6">
          A collection of modern, glassmorphism-inspired loading spinners with smooth animations.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Standard Spinner */}
        <Card>
          <CardHeader>
            <CardTitle>Standard Spinner</CardTitle>
            <CardDescription>Modern gradient ring with pulsing center</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-center py-8 space-x-4">
              <LoadingSpinner size="sm" variant="primary" />
              <LoadingSpinner size="md" variant="accent" />
              <LoadingSpinner size="lg" variant="secondary" />
            </div>
            <div className="flex justify-center">
              <LoadingSpinner size="md" showText text="Loading..." />
            </div>
          </CardContent>
        </Card>

        {/* Glass Spinner */}
        <Card>
          <CardHeader>
            <CardTitle>Glass Spinner</CardTitle>
            <CardDescription>Glassmorphism effect with backdrop blur</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-center py-8 space-x-4">
              <GlassSpinner size="sm" />
              <GlassSpinner size="md" />
              <GlassSpinner size="lg" />
            </div>
            <div className="flex justify-center">
              <GlassSpinner size="md" showText text="Processing..." />
            </div>
          </CardContent>
        </Card>

        {/* Orbital Spinner */}
        <Card>
          <CardHeader>
            <CardTitle>Orbital Spinner</CardTitle>
            <CardDescription>Futuristic orbital particles animation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-center py-8 space-x-4">
              <OrbitalSpinner size="sm" />
              <OrbitalSpinner size="md" />
              <OrbitalSpinner size="lg" />
            </div>
            <div className="flex justify-center">
              <OrbitalSpinner size="md" showText text="Analyzing..." />
            </div>
          </CardContent>
        </Card>

        {/* Page Loader */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Page Loader</CardTitle>
            <CardDescription>Full-page loading component with descriptive text</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border border-dashed border-muted-foreground/30 rounded-lg">
              <PageLoader text="Loading dashboard data..." />
            </div>
          </CardContent>
        </Card>

        {/* Inline Loader */}
        <Card>
          <CardHeader>
            <CardTitle>Inline Loader</CardTitle>
            <CardDescription>Compact loader for buttons and inline use</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <InlineLoader size="sm" text="Saving..." />
              <InlineLoader size="md" text="Processing request..." />
              <div className="flex justify-center">
                <InlineLoader size="md" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-4">Usage Examples</h3>
        <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm font-mono">
          <div>{"<LoadingSpinner size=\"md\" variant=\"primary\" />"}</div>
          <div>{"<GlassSpinner size=\"lg\" showText text=\"Loading...\" />"}</div>
          <div>{"<OrbitalSpinner size=\"xl\" />"}</div>
          <div>{"<PageLoader text=\"Loading dashboard...\" />"}</div>
          <div>{"<InlineLoader size=\"sm\" text=\"Saving...\" />"}</div>
        </div>
      </div>
    </div>
  );
}
