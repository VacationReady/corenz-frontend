import crypto from "crypto";

const SECRET = process.env.NEXTAUTH_SECRET || "fallback-secret-change-me";

export const TENANT_ADMIN_COOKIE_NAME = "tenant_admin_session";
export const COOKIE_MAX_AGE = 60 * 60 * 24; // 24 hours
const TOKEN_EXPIRY_MS = COOKIE_MAX_AGE * 1000;

/**
 * Create a signed token for tenant admin session
 */
export function createSignedToken(): string {
  const payload = {
    authenticated: true,
    timestamp: Date.now(),
    expiresAt: Date.now() + TOKEN_EXPIRY_MS,
  };
  
  const payloadStr = JSON.stringify(payload);
  const payloadBase64 = Buffer.from(payloadStr).toString("base64url");
  
  const signature = crypto
    .createHmac("sha256", SECRET)
    .update(payloadBase64)
    .digest("base64url");
  
  return `${payloadBase64}.${signature}`;
}

/**
 * Verify a signed token
 */
export function verifySignedToken(token: string): { valid: boolean; expired?: boolean } {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) {
      return { valid: false };
    }
    
    const [payloadBase64, providedSignature] = parts;
    
    // Verify signature
    const expectedSignature = crypto
      .createHmac("sha256", SECRET)
      .update(payloadBase64)
      .digest("base64url");
    
    if (!crypto.timingSafeEqual(
      Buffer.from(providedSignature),
      Buffer.from(expectedSignature)
    )) {
      return { valid: false };
    }
    
    // Decode and verify expiry
    const payloadStr = Buffer.from(payloadBase64, "base64url").toString("utf8");
    const payload = JSON.parse(payloadStr);
    
    if (!payload.authenticated || !payload.expiresAt) {
      return { valid: false };
    }
    
    if (Date.now() > payload.expiresAt) {
      return { valid: false, expired: true };
    }
    
    return { valid: true };
  } catch {
    return { valid: false };
  }
}

