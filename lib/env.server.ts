/**
 * Server-side environment variable validation
 * 
 * This module validates all environment variables at startup using Zod schemas.
 * Import `env` from this module instead of accessing `process.env` directly.
 * 
 * @see README.md#environment-configuration for setup instructions
 */

import "server-only";
import { z } from "zod";

/**
 * Environment variable schema with strict validation
 */
const envSchema = z.object({
  // Node environment
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // Database
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  LOG_PRISMA: z.string().transform(val => val === "true").optional(),

  // Authentication
  NEXTAUTH_SECRET: z.string().min(1, "NEXTAUTH_SECRET is required for session security"),
  NEXTAUTH_URL: z.string()
    .optional()
    .transform(val => {
      // Auto-fix: Add https:// if missing protocol
      if (val && !val.startsWith("http://") && !val.startsWith("https://")) {
        return `https://${val}`;
      }
      return val;
    })
    .pipe(z.string().url("NEXTAUTH_URL must be a valid URL").optional()),

  // OAuth Providers (optional)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  AZURE_AD_CLIENT_ID: z.string().optional(),
  AZURE_AD_CLIENT_SECRET: z.string().optional(),
  AZURE_AD_TENANT_ID: z.string().optional(),

  // Email
  FROM_EMAIL: z.string().email("FROM_EMAIL must be a valid email address").default("noreply@peoplecore.co.nz"),
  RESEND_API_KEY: z.string().optional(),
  HR_INBOX_EMAIL: z.string().email().optional(),

  // Rate Limiting
  RATE_LIMIT_MAX: z.string().transform(val => parseInt(val, 10)).pipe(z.number().int().positive()).default("120"),
  RATE_LIMIT_WINDOW_MS: z.string().transform(val => parseInt(val, 10)).pipe(z.number().int().positive()).default("60000"),
  
  // Redis/KV (optional)
  KV_REST_API_URL: z.string().url().optional(),
  KV_REST_API_TOKEN: z.string().optional(),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // OpenAI (optional)
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-4-turbo-preview"),
  OPENAI_FINE_TUNED_MODEL: z.string().optional(),
  OPENAI_TEMPERATURE: z.string().transform(val => parseFloat(val)).pipe(z.number().min(0).max(2)).default("0.7"),

  // Supabase Storage (optional)
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),

  // Application URLs
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_MAIN_PRODUCTION_COMPANY_ID: z.string().optional(),

  // Feature Flags
  UNIFIED_AUDIT_DUALWRITE: z.string().transform(val => val === "true").default("true"),

  // Admin Access
  TENANT_ADMIN_PASSWORD: z.string().min(8, "TENANT_ADMIN_PASSWORD must be at least 8 characters").optional(),

  // Password Reset
  PASSWORD_RESET_LIMIT: z.string().transform(val => parseInt(val, 10)).pipe(z.number().int().positive()).default("3"),
  PASSWORD_RESET_WINDOW_MS: z.string().transform(val => parseInt(val, 10)).pipe(z.number().int().positive()).default("900000"),
});

/**
 * Validated and parsed environment variables
 * 
 * Access environment variables through this object instead of process.env
 * to ensure type safety and validation.
 */
export type Env = z.infer<typeof envSchema>;

/**
 * Parse and validate environment variables
 * 
 * During build phase, only validates critical build-time variables.
 * Full validation happens at runtime.
 */
function parseEnv(): Env {
  // Skip strict validation during Next.js build phase
  const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build" || 
                       process.env.NEXT_PHASE === "phase-development-build" ||
                       !process.env.NEXTAUTH_URL; // Also skip if NEXTAUTH_URL not set (Vercel build)
  
  const parsed = envSchema.safeParse({
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    LOG_PRISMA: process.env.LOG_PRISMA,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    AZURE_AD_CLIENT_ID: process.env.AZURE_AD_CLIENT_ID,
    AZURE_AD_CLIENT_SECRET: process.env.AZURE_AD_CLIENT_SECRET,
    AZURE_AD_TENANT_ID: process.env.AZURE_AD_TENANT_ID,
    FROM_EMAIL: process.env.FROM_EMAIL,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    HR_INBOX_EMAIL: process.env.HR_INBOX_EMAIL,
    RATE_LIMIT_MAX: process.env.RATE_LIMIT_MAX,
    RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS,
    KV_REST_API_URL: process.env.KV_REST_API_URL,
    KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_MODEL: process.env.OPENAI_MODEL,
    OPENAI_FINE_TUNED_MODEL: process.env.OPENAI_FINE_TUNED_MODEL,
    OPENAI_TEMPERATURE: process.env.OPENAI_TEMPERATURE,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_MAIN_PRODUCTION_COMPANY_ID: process.env.NEXT_PUBLIC_MAIN_PRODUCTION_COMPANY_ID,
    UNIFIED_AUDIT_DUALWRITE: process.env.UNIFIED_AUDIT_DUALWRITE,
    TENANT_ADMIN_PASSWORD: process.env.TENANT_ADMIN_PASSWORD,
    PASSWORD_RESET_LIMIT: process.env.PASSWORD_RESET_LIMIT,
    PASSWORD_RESET_WINDOW_MS: process.env.PASSWORD_RESET_WINDOW_MS,
  });

  if (!parsed.success) {
    const isDev = process.env.NODE_ENV === "development";
    
    if (isBuildPhase || isDev) {
      // During build or development, log warning but don't fail
      console.warn("⚠️  Environment validation failed - using defaults for development");
      if (isDev) {
        console.warn("⚠️  Some environment variables are missing or invalid:");
        console.warn(JSON.stringify(parsed.error.format(), null, 2));
      }
      // Return a minimal env object for build/dev
      return {
        NODE_ENV: (process.env.NODE_ENV as any) || "development",
        DATABASE_URL: process.env.DATABASE_URL || "",
        NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || "dev-secret-change-in-production",
        NEXTAUTH_URL: process.env.NEXTAUTH_URL || "http://localhost:3000",
        FROM_EMAIL: process.env.FROM_EMAIL || "noreply@peoplecore.co.nz",
        RATE_LIMIT_MAX: "120",
        RATE_LIMIT_WINDOW_MS: "60000",
        OPENAI_MODEL: "gpt-4-turbo-preview",
        OPENAI_TEMPERATURE: "0.7",
        UNIFIED_AUDIT_DUALWRITE: "true",
        PASSWORD_RESET_LIMIT: "3",
        PASSWORD_RESET_WINDOW_MS: "900000",
      } as any;
    }
    
    // At runtime in production, fail hard on invalid config
    console.error("❌ Environment validation failed:");
    console.error(JSON.stringify(parsed.error.format(), null, 2));
    console.error("\n📋 Current environment variable values:");
    console.error(`  NEXTAUTH_URL: "${process.env.NEXTAUTH_URL}"`);
    console.error(`  DATABASE_URL: "${process.env.DATABASE_URL?.slice(0, 30)}..."`);
    console.error(`  NEXTAUTH_SECRET: ${process.env.NEXTAUTH_SECRET ? '[SET]' : '[NOT SET]'}`);
    console.error("\n💡 Common fixes:");
    console.error("  - NEXTAUTH_URL must include protocol (https://yourdomain.com)");
    console.error("  - Check Vercel environment variables are set correctly");
    throw new Error("Invalid environment configuration. See logs above for details.");
  }

  return parsed.data;
}

/**
 * Frozen environment object - validated once at module load
 * 
 * Usage:
 * ```ts
 * import { env } from '@/lib/env.server';
 * const apiKey = env.OPENAI_API_KEY;
 * ```
 */
export const env = Object.freeze(parseEnv());

/**
 * Check if a feature requiring optional env vars is enabled
 */
export const features = {
  openai: !!env.OPENAI_API_KEY,
  supabase: !!(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY),
  redis: !!(env.KV_REST_API_URL && env.KV_REST_API_TOKEN) || 
          !!(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN),
  resend: !!env.RESEND_API_KEY,
  googleOAuth: !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
  azureOAuth: !!(env.AZURE_AD_CLIENT_ID && env.AZURE_AD_CLIENT_SECRET && env.AZURE_AD_TENANT_ID),
} as const;
