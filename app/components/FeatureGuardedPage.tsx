/**
 * FeatureGuardedPage Component
 * 
 * A wrapper component that checks if a feature is enabled for the current tenant.
 * If the feature is disabled, it redirects to the dashboard and shows a toast message.
 * 
 * Requirements: 8.1, 8.2
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";
import { FeatureKey } from "@/lib/feature-toggles/types";
import { Skeleton } from "@/components/ui/Skeleton";

interface FeatureGuardedPageProps {
  /** The feature key to check */
  featureKey: FeatureKey;
  /** The children to render if the feature is enabled */
  children: React.ReactNode;
  /** Optional custom redirect path (defaults to /dashboard) */
  redirectTo?: string;
  /** Optional custom message to show when feature is disabled */
  disabledMessage?: string;
  /** Optional loading component to show while checking feature status */
  loadingComponent?: React.ReactNode;
}

/**
 * Default loading skeleton for feature guarded pages
 */
function DefaultLoadingSkeleton() {
  return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  );
}

/**
 * FeatureGuardedPage wraps page content and checks if the required feature
 * is enabled for the current tenant. If disabled, redirects to dashboard.
 * 
 * @example
 * ```tsx
 * // In a page component
 * export default function PerformancePage() {
 *   return (
 *     <FeatureGuardedPage featureKey="performance_management">
 *       <PerformancePageContent />
 *     </FeatureGuardedPage>
 *   );
 * }
 * ```
 */
export function FeatureGuardedPage({
  featureKey,
  children,
  redirectTo = "/dashboard",
  disabledMessage = "This feature is not available for your organisation",
  loadingComponent,
}: FeatureGuardedPageProps) {
  const router = useRouter();
  const { isFeatureEnabled, isLoading, enabledFeatures } = useFeatureToggles();
  const [hasChecked, setHasChecked] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    // Wait until feature toggles are loaded
    if (isLoading) return;

    // Only check once we have actual data (not default empty state)
    // The hook returns {} when loading, so we check if we have any keys
    const hasData = Object.keys(enabledFeatures).length > 0;
    
    // If still no data after loading completes, assume fail-open (show content)
    if (!hasData) {
      setShouldRender(true);
      setHasChecked(true);
      return;
    }

    const enabled = isFeatureEnabled(featureKey);
    
    if (!enabled) {
      // Feature is disabled - redirect and show toast
      toast.error(disabledMessage);
      router.push(redirectTo);
    } else {
      // Feature is enabled - render children
      setShouldRender(true);
    }
    
    setHasChecked(true);
  }, [isLoading, isFeatureEnabled, featureKey, router, redirectTo, disabledMessage, enabledFeatures]);

  // Show loading state while checking
  if (!hasChecked || isLoading) {
    return <>{loadingComponent ?? <DefaultLoadingSkeleton />}</>;
  }

  // If feature is disabled, don't render anything (redirect is happening)
  if (!shouldRender) {
    return <>{loadingComponent ?? <DefaultLoadingSkeleton />}</>;
  }

  // Feature is enabled - render children
  return <>{children}</>;
}

export default FeatureGuardedPage;
