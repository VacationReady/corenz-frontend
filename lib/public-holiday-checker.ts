/**
 * Public Holiday Detection Utility
 * 
 * Provides reliable NZ public holiday checking for overtime calculations
 * with caching and graceful error handling.
 * 
 * Supports:
 * - National NZ public holidays (Waitangi Day, ANZAC Day, Christmas, etc.)
 * - Regional holidays (Auckland Anniversary, Wellington Anniversary, etc.)
 * - Multi-country support (NZ, AU, UK)
 * - Performance optimization through result caching
 */

import Holidays from 'date-holidays';
import { format, startOfDay } from 'date-fns';
import type { PrismaClient } from '@prisma/client';

// Lazy-initialize Prisma to avoid DB connection during test imports
// DO NOT import PrismaClient at module level - it causes connection attempts
let prisma: PrismaClient | null = null;

function getPrismaClient(): PrismaClient | null {
  // In test environment, don't try to initialize real Prisma
  if (process.env.NODE_ENV === 'test') {
    console.warn('[public-holiday-checker] Test mode - skipping Prisma initialization');
    return null;
  }
  
  if (!prisma) {
    try {
      // Dynamic import to avoid module-level execution
      const { PrismaClient } = require('@prisma/client');
      prisma = new PrismaClient();
    } catch (error) {
      console.error('[public-holiday-checker] Failed to initialize Prisma client:', error);
      return null;
    }
  }
  return prisma;
}

// Cache configuration
const COMPANY_SETTINGS_CACHE = new Map<string, { 
  template: string | null; 
  region: string | null; 
  timestamp: number;
}>();

const HOLIDAY_CACHE = new Map<string, { 
  isHoliday: boolean; 
  holidayName?: string;
  timestamp: number;
}>();

const COMPANY_SETTINGS_TTL_MS = 1000 * 60 * 60; // 1 hour
const HOLIDAY_CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

/**
 * Company holiday template types
 */
type HolidayTemplate = 'NZ' | 'AU' | 'UK';

/**
 * Company holiday settings
 */
interface CompanyHolidaySettings {
  template: HolidayTemplate | null;
  region: string | null;
}

/**
 * Map template to country code for date-holidays library
 */
function mapTemplateToCountry(template: HolidayTemplate): string {
  switch (template) {
    case 'NZ':
      return 'NZ';
    case 'AU':
      return 'AU';
    case 'UK':
      return 'GB';
    default:
      return 'NZ';
  }
}

/**
 * Get company's public holiday settings from database
 * Results are cached to minimize database queries
 * 
 * @param companyId - Company identifier
 * @returns Company holiday settings or null if not found
 */
async function getCompanyHolidaySettings(
  companyId: string
): Promise<CompanyHolidaySettings | null> {
  // Check cache first
  const cached = COMPANY_SETTINGS_CACHE.get(companyId);
  if (cached && Date.now() - cached.timestamp < COMPANY_SETTINGS_TTL_MS) {
    return {
      template: cached.template as HolidayTemplate | null,
      region: cached.region,
    };
  }

  try {
    // Fetch from database using lazy-initialized client
    const prismaClient = getPrismaClient();
    
    // If client is null (test environment without DB), return null gracefully
    if (!prismaClient) {
      console.warn(`[public-holiday-checker] No Prisma client available for companyId: ${companyId}`);
      return null;
    }
    
    const company = await prismaClient.company.findUnique({
      where: { id: companyId },
      select: {
        publicHolidayTemplate: true,
        publicHolidayRegion: true,
      },
    });

    if (!company) {
      console.warn(`[public-holiday-checker] Company not found: ${companyId}`);
      return null;
    }

    // Cache the result
    COMPANY_SETTINGS_CACHE.set(companyId, {
      template: company.publicHolidayTemplate,
      region: company.publicHolidayRegion,
      timestamp: Date.now(),
    });

    return {
      template: company.publicHolidayTemplate as HolidayTemplate | null,
      region: company.publicHolidayRegion,
    };
  } catch (error) {
    console.error('[public-holiday-checker] Failed to fetch company settings:', error);
    return null;
  }
}

/**
 * Public holiday information
 */
export interface PublicHolidayInfo {
  isHoliday: boolean;
  holidayName?: string;
  holidayType?: 'NATIONAL' | 'REGIONAL' | 'MONDAYISED';
  region?: string;
}

/**
 * Check if a date is a public holiday using date-holidays library
 * 
 * @param date - Date to check
 * @param template - Country template (NZ, AU, UK)
 * @param region - Optional region code (e.g., NZ-AUK for Auckland)
 * @returns Holiday info or null if not a holiday
 */
function checkHolidayWithLibrary(
  date: Date,
  template: HolidayTemplate,
  region: string | null
): PublicHolidayInfo {
  try {
    const hd = new Holidays();
    const country = mapTemplateToCountry(template);

    // Initialize with region if provided
    if (region) {
      // Region format: NZ-AUK, AU-NSW, GB-SCT
      const [countryCode, subdivision] = region.split('-');
      hd.init(countryCode || country, subdivision ? subdivision.toLowerCase() : undefined);
    } else {
      hd.init(country);
    }

    // Get holidays for the specific year
    const year = date.getFullYear();
    const holidays = hd.getHolidays(year) || [];

    // Check if the date matches any holiday
    const dateStr = format(date, 'yyyy-MM-dd');
    const holiday = holidays.find((h: any) => {
      const holidayDate = format(new Date(h.date), 'yyyy-MM-dd');
      return holidayDate === dateStr;
    });

    if (holiday) {
      // Determine holiday type
      const holidayType: 'NATIONAL' | 'REGIONAL' | 'MONDAYISED' = 
        region ? 'REGIONAL' : 
        (holiday.substitute ? 'MONDAYISED' : 'NATIONAL');
      
      return {
        isHoliday: true,
        holidayName: holiday.name,
        holidayType,
        region: region || undefined,
      };
    }

    return { isHoliday: false };
  } catch (error) {
    console.error('[public-holiday-checker] Error checking holiday with library:', error);
    return { isHoliday: false };
  }
}

/**
 * Check if a date is a New Zealand public holiday
 * 
 * This function integrates with the company's public holiday calendar settings
 * and uses the date-holidays library to determine if a given date is a statutory
 * holiday in the specified region.
 * 
 * **Features:**
 * - Supports national NZ holidays (Waitangi Day, ANZAC Day, Christmas, etc.)
 * - Handles regional holidays (Auckland Anniversary, Wellington Anniversary, etc.)
 * - Caches results for 24 hours to optimize performance
 * - Graceful error handling (logs errors and returns false)
 * 
 * **Usage:**
 * ```typescript
 * const isHoliday = await isNZPublicHoliday(
 *   new Date('2024-12-25'),
 *   'company-id-123'
 * );
 * if (isHoliday) {
 *   // Apply public holiday overtime multiplier
 * }
 * ```
 * 
 * @param date - The date to check (normalized to start of day)
 * @param companyId - Company identifier for retrieving holiday settings
 * @param regionOverride - Optional region override (e.g., 'NZ-AUK' for Auckland)
 * @returns Promise<boolean> - True if the date is a public holiday, false otherwise
 * 
 * @example
 * // Check if Christmas Day is a holiday
 * await isNZPublicHoliday(new Date('2024-12-25'), 'company-123'); // true
 * 
 * @example
 * // Check Auckland Anniversary Day with region override
 * await isNZPublicHoliday(
 *   new Date('2024-01-29'), 
 *   'company-123',
 *   'NZ-AUK'
 * ); // true in Auckland region
 * 
 * @throws Never throws - all errors are caught and logged
 */
export async function isNZPublicHoliday(
  date: Date,
  companyId: string,
  regionOverride?: string
): Promise<boolean> {
  try {
    // Normalize date to start of day for consistent caching
    const normalizedDate = startOfDay(date);
    const dateKey = format(normalizedDate, 'yyyy-MM-dd');

    // Check cache first
    const cacheKey = `${companyId}:${regionOverride || 'default'}:${dateKey}`;
    const cached = HOLIDAY_CACHE.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < HOLIDAY_CACHE_TTL_MS) {
      return cached.isHoliday;
    }

    // Get company holiday settings
    const settings = await getCompanyHolidaySettings(companyId);
    
    if (!settings || !settings.template) {
      // No holiday template configured - not a holiday
      console.debug(
        `[public-holiday-checker] No holiday template configured for company ${companyId}`
      );
      
      // Cache negative result
      HOLIDAY_CACHE.set(cacheKey, {
        isHoliday: false,
        timestamp: Date.now(),
      });
      
      return false;
    }

    // Use region override or company's configured region
    const region = regionOverride || settings.region;

    // Check if date is a holiday
    const result = checkHolidayWithLibrary(
      normalizedDate,
      settings.template,
      region
    );

    // Cache the result
    HOLIDAY_CACHE.set(cacheKey, {
      isHoliday: result.isHoliday,
      holidayName: result.holidayName,
      timestamp: Date.now(),
    });

    if (result.isHoliday) {
      console.debug(
        `[public-holiday-checker] Holiday detected: ${result.holidayName} on ${dateKey} ` +
        `for company ${companyId} (region: ${region || 'national'})`
      );
    }

    return result.isHoliday;
  } catch (error) {
    // Graceful degradation - log error and return false
    console.error(
      `[public-holiday-checker] Error checking holiday for date ${format(date, 'yyyy-MM-dd')}:`,
      error
    );
    return false;
  }
}

/**
 * Get detailed public holiday information
 * Returns enhanced information including holiday name and type
 * 
 * @param date - Date to check
 * @param companyId - Company identifier
 * @param regionOverride - Optional region override
 * @returns Public holiday information or null if not a holiday
 */
export async function getNZPublicHolidayInfo(
  date: Date,
  companyId: string,
  regionOverride?: string
): Promise<PublicHolidayInfo | null> {
  try {
    const normalizedDate = startOfDay(date);
    
    // Get company holiday settings
    const settings = await getCompanyHolidaySettings(companyId);
    
    if (!settings || !settings.template) {
      return null;
    }

    const region = regionOverride || settings.region;
    const result = checkHolidayWithLibrary(
      normalizedDate,
      settings.template,
      region
    );

    return result.isHoliday ? result : null;
  } catch (error) {
    console.error('[public-holiday-checker] Error getting holiday info:', error);
    return null;
  }
}

/**
 * Clear all caches (useful for testing or forced refresh)
 */
export function clearHolidayCache(): void {
  COMPANY_SETTINGS_CACHE.clear();
  HOLIDAY_CACHE.clear();
}

/**
 * Get cache statistics for monitoring/debugging
 */
export function getHolidayCacheStats() {
  return {
    companySettingsCacheSize: COMPANY_SETTINGS_CACHE.size,
    holidayCacheSize: HOLIDAY_CACHE.size,
  };
}
