/**
 * API Guard for Feature Toggles
 * 
 * Provides a higher-order function to wrap API route handlers with feature
 * toggle checks. Returns 403 Forbidden when a feature is disabled for the tenant.
 * 
 * Requirements: 4.1, 4.2
 */

import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { featureToggleService } from "./service";
import { FeatureKey, isValidFeatureKey } from "./types";

/**
 * Response returned when a feature is disabled
 */
export interface FeatureDisabledResponse {
  error: string;
  code: "FEATURE_DISABLED";
  feature: FeatureKey;
}

/**
 * Type for Next.js App Router route handlers
 * Uses any for context to support both static routes and dynamic routes
 * with Promise-based params (Next.js 15+/16)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RouteHandler = (req: NextRequest, context?: any) => Promise<Response>;

/**
 * Higher-order function that wraps API route handlers with feature toggle checks.
 * 
 * When the specified feature is disabled for the tenant, returns a 403 Forbidden
 * response with a descriptive error message.
 * 
 * Usage:
 * ```typescript
 * import { withFeatureGuard } from "@/lib/feature-toggles/api-guard";
 * import { FEATURE_KEYS } from "@/lib/feature-toggles/types";
 * 
 * async function handler(req: NextRequest) {
 *   // Your route logic here
 * }
 * 
 * export const GET = withFeatureGuard(FEATURE_KEYS.NEWS)(handler);
 * export const POST = withFeatureGuard(FEATURE_KEYS.NEWS)(handler);
 * ```
 * 
 * @param featureKey - The feature key to check
 * @returns A function that wraps route handlers with the feature guard
 * 
 * Requirements: 4.1, 4.2
 */
export function withFeatureGuard(featureKey: FeatureKey) {
  // Validate feature key at guard creation time
  if (!isValidFeatureKey(featureKey)) {
    throw new Error(`Invalid feature key: ${featureKey}`);
  }

  return function <T extends RouteHandler>(handler: T): T {
    const guardedHandler = async (
      req: NextRequest,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      context?: any
    ): Promise<Response> => {
      // Get the authenticated session
      const session = await auth();

      // Check authentication first
      if (!session?.user?.id || !session.user.companyId) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }

      const companyId = session.user.companyId;

      // Check if the feature is enabled for this tenant
      try {
        const isEnabled = await featureToggleService.isFeatureEnabled(
          companyId,
          featureKey
        );

        if (!isEnabled) {
          // Return 403 with feature disabled message (Requirement 4.1, 4.2)
          const response: FeatureDisabledResponse = {
            error: "Feature not available",
            code: "FEATURE_DISABLED",
            feature: featureKey,
          };
          return NextResponse.json(response, { status: 403 });
        }
      } catch (error) {
        // Log the error but fail-open for better UX
        console.error(
          `Feature toggle check failed for ${featureKey} in company ${companyId}:`,
          error
        );
        // Continue to handler - fail-open design
      }

      // Feature is enabled (or check failed with fail-open), proceed to handler
      return handler(req, context);
    };

    return guardedHandler as T;
  };
}

/**
 * Creates a feature guard that can be applied to multiple handlers.
 * Useful when you want to apply the same guard to GET, POST, PUT, DELETE, etc.
 * 
 * Usage:
 * ```typescript
 * const newsGuard = createFeatureGuard(FEATURE_KEYS.NEWS);
 * 
 * export const GET = newsGuard(getHandler);
 * export const POST = newsGuard(postHandler);
 * ```
 * 
 * @param featureKey - The feature key to check
 * @returns A guard function that can wrap multiple handlers
 */
export function createFeatureGuard(featureKey: FeatureKey) {
  return withFeatureGuard(featureKey);
}

/**
 * Checks if a feature is enabled for a given company ID.
 * Useful for conditional logic within route handlers.
 * 
 * @param companyId - The tenant's company ID
 * @param featureKey - The feature to check
 * @returns Promise<boolean> - true if enabled, false if disabled
 */
export async function isFeatureEnabledForCompany(
  companyId: string,
  featureKey: FeatureKey
): Promise<boolean> {
  if (!isValidFeatureKey(featureKey)) {
    return false;
  }

  try {
    return await featureToggleService.isFeatureEnabled(companyId, featureKey);
  } catch (error) {
    console.error(
      `Feature toggle check failed for ${featureKey} in company ${companyId}:`,
      error
    );
    // Fail-open for better UX
    return true;
  }
}

/**
 * Returns a 403 response for a disabled feature.
 * Useful when you need to manually return a feature disabled response.
 * 
 * @param featureKey - The feature that is disabled
 * @returns NextResponse with 403 status
 */
export function featureDisabledResponse(featureKey: FeatureKey): NextResponse {
  const response: FeatureDisabledResponse = {
    error: "Feature not available",
    code: "FEATURE_DISABLED",
    feature: featureKey,
  };
  return NextResponse.json(response, { status: 403 });
}
