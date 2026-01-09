/**
 * Feature Toggle Service
 * 
 * Provides cached access to tenant-level feature toggles with automatic
 * cache invalidation on updates.
 * 
 * Requirements: 2.3, 5.1, 5.2, 5.3, 5.4, 7.6
 */

import "server-only";

import { prisma } from "../../app/lib/prisma";
import { documentStatusCache } from "../cache";
import {
  FeatureKey,
  FeatureToggleState,
  ALL_FEATURE_KEYS,
  isValidFeatureKey,
} from "./types";
import { AuditEntityType, AuditAction, AuditActorType } from "@prisma/client";
import { randomUUID } from "crypto";

// Cache configuration
const CACHE_KEY_PREFIX = "feature-toggles";
const CACHE_TTL_SECONDS = 300; // 5 minutes (Requirement 5.3)

/**
 * Generate cache key for a tenant's feature toggles
 */
function getCacheKey(companyId: string): string {
  return `${CACHE_KEY_PREFIX}:${companyId}`;
}

/**
 * Options for audit logging when changing feature toggles
 * Requirement 7.6
 */
export interface AuditOptions {
  /** The user ID performing the action (required for audit logging) */
  actorId: string;
  /** The type of actor (defaults to SYSTEM for service-level changes) */
  actorType?: AuditActorType;
  /** Source of the change (e.g., 'tenant-admin', 'api', 'migration') */
  source?: string;
}

/**
 * Interface for the Feature Toggle Service
 */
export interface IFeatureToggleService {
  isFeatureEnabled(companyId: string, featureKey: FeatureKey): Promise<boolean>;
  getEnabledFeatures(companyId: string): Promise<FeatureToggleState>;
  setFeatureEnabled(companyId: string, featureKey: FeatureKey, enabled: boolean, auditOptions?: AuditOptions): Promise<void>;
  bulkSetFeatures(companyId: string, features: Partial<FeatureToggleState>, auditOptions?: AuditOptions): Promise<void>;
  initializeDefaultToggles(companyId: string, enabledFeatures?: FeatureKey[], auditOptions?: AuditOptions): Promise<void>;
  invalidateCache(companyId: string): Promise<void>;
}

/**
 * Feature Toggle Service Implementation
 * 
 * Uses in-memory/Redis cache for fast lookups with automatic invalidation
 * on updates. Falls back to database when cache is empty.
 */
class FeatureToggleService implements IFeatureToggleService {
  /**
   * Check if a specific feature is enabled for a tenant
   * 
   * @param companyId - The tenant's company ID
   * @param featureKey - The feature to check
   * @returns true if enabled, false if disabled
   */
  async isFeatureEnabled(companyId: string, featureKey: FeatureKey): Promise<boolean> {
    const features = await this.getEnabledFeatures(companyId);
    // Default to true if not found (fail-open for better UX)
    return features[featureKey] ?? true;
  }

  /**
   * Get all feature toggle states for a tenant
   * 
   * Uses cache with fallback to database (Requirement 5.1, 5.4)
   * 
   * @param companyId - The tenant's company ID
   * @returns Object mapping feature keys to enabled state
   */
  async getEnabledFeatures(companyId: string): Promise<FeatureToggleState> {
    const cacheKey = getCacheKey(companyId);

    // Try cache first
    try {
      const cached = await documentStatusCache.get<FeatureToggleState>(cacheKey);
      if (cached !== null) {
        return cached;
      }
    } catch (error) {
      console.warn(`Feature toggle cache read error for ${companyId}:`, error);
      // Continue to database fallback
    }

    // Fetch from database
    const toggles = await prisma.tenantFeatureToggle.findMany({
      where: { companyId },
      select: { featureKey: true, isEnabled: true },
    });

    // Build state object, defaulting to true for missing features
    const state: FeatureToggleState = {};
    for (const key of ALL_FEATURE_KEYS) {
      const toggle = toggles.find((t: { featureKey: string; isEnabled: boolean }) => t.featureKey === key);
      state[key] = toggle?.isEnabled ?? true;
    }

    // Cache the result
    try {
      await documentStatusCache.set(cacheKey, state, CACHE_TTL_SECONDS);
    } catch (error) {
      console.warn(`Feature toggle cache write error for ${companyId}:`, error);
      // Non-fatal, continue without caching
    }

    return state;
  }

  /**
   * Set a single feature toggle for a tenant
   * 
   * Persists to database and invalidates cache (Requirement 2.3, 5.2)
   * Optionally logs changes to audit log (Requirement 7.6)
   * 
   * @param companyId - The tenant's company ID
   * @param featureKey - The feature to update
   * @param enabled - Whether the feature should be enabled
   * @param auditOptions - Optional audit logging configuration
   */
  async setFeatureEnabled(
    companyId: string,
    featureKey: FeatureKey,
    enabled: boolean,
    auditOptions?: AuditOptions
  ): Promise<void> {
    if (!isValidFeatureKey(featureKey)) {
      throw new Error(`Invalid feature key: ${featureKey}`);
    }

    // Get current value for audit logging
    let oldValue: boolean | undefined;
    if (auditOptions?.actorId) {
      const currentToggle = await prisma.tenantFeatureToggle.findUnique({
        where: { companyId_featureKey: { companyId, featureKey } },
        select: { isEnabled: true },
      });
      oldValue = currentToggle?.isEnabled ?? true; // Default to true if not found
    }

    await prisma.tenantFeatureToggle.upsert({
      where: {
        companyId_featureKey: { companyId, featureKey },
      },
      update: { isEnabled: enabled },
      create: { companyId, featureKey, isEnabled: enabled },
    });

    // Create audit log entry if audit options provided and value changed (Requirement 7.6)
    if (auditOptions?.actorId && oldValue !== enabled) {
      await this.createAuditLogEntry(
        companyId,
        featureKey,
        oldValue ?? true,
        enabled,
        auditOptions
      );
    }

    // Invalidate cache immediately (Requirement 5.2)
    await this.invalidateCache(companyId);
  }

  /**
   * Bulk update multiple feature toggles for a tenant
   * 
   * Only updates specified features, preserving others (Requirement 7.4)
   * Optionally logs changes to audit log (Requirement 7.6)
   * 
   * @param companyId - The tenant's company ID
   * @param features - Partial object with features to update
   * @param auditOptions - Optional audit logging configuration
   */
  async bulkSetFeatures(
    companyId: string,
    features: Partial<FeatureToggleState>,
    auditOptions?: AuditOptions
  ): Promise<void> {
    const updates = Object.entries(features).filter(
      ([key]) => isValidFeatureKey(key)
    );

    if (updates.length === 0) {
      return;
    }

    // Get current values for audit logging
    let currentState: FeatureToggleState = {};
    if (auditOptions?.actorId) {
      currentState = await this.getEnabledFeatures(companyId);
    }

    // Use transaction for atomicity
    await prisma.$transaction(
      updates.map(([featureKey, isEnabled]) =>
        prisma.tenantFeatureToggle.upsert({
          where: {
            companyId_featureKey: { companyId, featureKey },
          },
          update: { isEnabled },
          create: { companyId, featureKey, isEnabled: isEnabled ?? true },
        })
      )
    );

    // Create audit log entries for changed values (Requirement 7.6)
    if (auditOptions?.actorId) {
      const auditPromises: Promise<void>[] = [];
      for (const [featureKey, newValue] of updates) {
        const oldValue = currentState[featureKey] ?? true;
        if (oldValue !== newValue) {
          auditPromises.push(
            this.createAuditLogEntry(
              companyId,
              featureKey as FeatureKey,
              oldValue,
              newValue as boolean,
              auditOptions
            )
          );
        }
      }
      await Promise.all(auditPromises);
    }

    // Invalidate cache immediately (Requirement 5.2)
    await this.invalidateCache(companyId);
  }

  /**
   * Initialize default toggles for a new tenant
   * 
   * Creates toggle records for all features. If enabledFeatures is provided,
   * only those features are enabled; otherwise all features are enabled.
   * (Requirement 1.2, 2.7)
   * Optionally logs changes to audit log (Requirement 7.6)
   * 
   * @param companyId - The tenant's company ID
   * @param enabledFeatures - Optional array of features to enable (others disabled)
   * @param auditOptions - Optional audit logging configuration
   */
  async initializeDefaultToggles(
    companyId: string,
    enabledFeatures?: FeatureKey[],
    auditOptions?: AuditOptions
  ): Promise<void> {
    const toggleData = ALL_FEATURE_KEYS.map(featureKey => ({
      companyId,
      featureKey,
      // If enabledFeatures is provided, only enable those; otherwise enable all
      isEnabled: enabledFeatures ? enabledFeatures.includes(featureKey) : true,
    }));

    // Use createMany with skipDuplicates to handle re-initialization gracefully
    await prisma.tenantFeatureToggle.createMany({
      data: toggleData,
      skipDuplicates: true,
    });

    // Create audit log entries for initialization (Requirement 7.6)
    if (auditOptions?.actorId) {
      const auditPromises = toggleData.map(toggle =>
        this.createAuditLogEntry(
          companyId,
          toggle.featureKey as FeatureKey,
          true, // Default value before initialization
          toggle.isEnabled,
          auditOptions,
          AuditAction.CREATED
        )
      );
      await Promise.all(auditPromises);
    }

    // Invalidate cache to ensure fresh state
    await this.invalidateCache(companyId);
  }

  /**
   * Invalidate the cache for a tenant's feature toggles
   * 
   * Called after any update to ensure subsequent reads get fresh data
   * (Requirement 5.2)
   * 
   * @param companyId - The tenant's company ID
   */
  async invalidateCache(companyId: string): Promise<void> {
    const cacheKey = getCacheKey(companyId);
    try {
      await documentStatusCache.delete(cacheKey);
    } catch (error) {
      console.warn(`Feature toggle cache invalidation error for ${companyId}:`, error);
      // Non-fatal, cache will expire naturally
    }
  }

  /**
   * Create an audit log entry for a feature toggle change
   * 
   * Logs companyId, featureKey, oldValue, newValue, timestamp, userId
   * (Requirement 7.6)
   * 
   * @param companyId - The tenant's company ID
   * @param featureKey - The feature that was changed
   * @param oldValue - The previous value
   * @param newValue - The new value
   * @param auditOptions - Audit logging configuration
   * @param action - The audit action (defaults to UPDATED)
   */
  private async createAuditLogEntry(
    companyId: string,
    featureKey: FeatureKey,
    oldValue: boolean,
    newValue: boolean,
    auditOptions: AuditOptions,
    action: AuditAction = AuditAction.UPDATED
  ): Promise<void> {
    try {
      await prisma.globalAuditLog.create({
        data: {
          id: randomUUID(),
          companyId,
          entityType: AuditEntityType.FEATURE_TOGGLE,
          entityId: featureKey,
          action,
          actorId: auditOptions.actorId,
          actorType: auditOptions.actorType ?? AuditActorType.SYSTEM,
          changes: {
            featureKey,
            isEnabled: { from: oldValue, to: newValue },
          },
          metadata: {
            source: auditOptions.source ?? 'service',
            oldValue,
            newValue,
          },
        },
      });
    } catch (error) {
      // Log but don't throw - audit logging failures shouldn't break the main operation
      console.error(`Failed to create audit log for feature toggle ${featureKey}:`, error);
    }
  }
}

// Export singleton instance
export const featureToggleService = new FeatureToggleService();

// Export class for testing
export { FeatureToggleService };
