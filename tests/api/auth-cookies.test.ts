/**
 * @jest-environment node
 */
import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import {
  getSessionCookieName,
  getSessionCookieNames,
  getAllSessionCookieNames,
  getSessionCookieOptions,
  getClearCookieOptions,
  COOKIE_NAMES,
} from "../../app/lib/auth-cookies";

describe("auth-cookies utility", () => {
  describe("getSessionCookieName", () => {
    it("returns v5 secure cookie name in production", () => {
      const name = getSessionCookieName(true);
      expect(name).toBe("__Secure-authjs.session-token");
    });

    it("returns v5 non-secure cookie name in development", () => {
      const name = getSessionCookieName(false);
      expect(name).toBe("authjs.session-token");
    });
  });

  describe("getSessionCookieNames", () => {
    it("returns all secure variants first in production", () => {
      const names = getSessionCookieNames(true);
      expect(names).toEqual([
        "__Secure-authjs.session-token",
        "__Secure-next-auth.session-token",
        "authjs.session-token",
        "next-auth.session-token",
      ]);
      // v5 should be first (preferred)
      expect(names[0]).toBe("__Secure-authjs.session-token");
    });

    it("returns non-secure variants in development", () => {
      const names = getSessionCookieNames(false);
      expect(names).toEqual([
        "authjs.session-token",
        "next-auth.session-token",
      ]);
      // v5 should be first (preferred)
      expect(names[0]).toBe("authjs.session-token");
    });

    it("includes legacy v4 cookie names for backward compatibility", () => {
      const prodNames = getSessionCookieNames(true);
      const devNames = getSessionCookieNames(false);
      
      expect(prodNames).toContain("__Secure-next-auth.session-token");
      expect(devNames).toContain("next-auth.session-token");
    });
  });

  describe("getAllSessionCookieNames", () => {
    it("returns all four cookie name variants", () => {
      const names = getAllSessionCookieNames();
      expect(names).toHaveLength(4);
      expect(names).toContain("__Secure-authjs.session-token");
      expect(names).toContain("authjs.session-token");
      expect(names).toContain("__Secure-next-auth.session-token");
      expect(names).toContain("next-auth.session-token");
    });
  });

  describe("getSessionCookieOptions", () => {
    it("returns correct options for production", () => {
      const options = getSessionCookieOptions(true);
      expect(options).toEqual({
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
      });
    });

    it("returns correct options for development", () => {
      const options = getSessionCookieOptions(false);
      expect(options).toEqual({
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        path: "/",
      });
    });
  });

  describe("getClearCookieOptions", () => {
    it("includes maxAge: 0 and past expires date", () => {
      const options = getClearCookieOptions(true);
      expect(options.maxAge).toBe(0);
      expect(options.expires).toEqual(new Date(0));
      expect(options.httpOnly).toBe(true);
    });
  });

  describe("COOKIE_NAMES constants", () => {
    it("exports all cookie name constants", () => {
      expect(COOKIE_NAMES.V5).toBe("authjs.session-token");
      expect(COOKIE_NAMES.V5_SECURE).toBe("__Secure-authjs.session-token");
      expect(COOKIE_NAMES.V4).toBe("next-auth.session-token");
      expect(COOKIE_NAMES.V4_SECURE).toBe("__Secure-next-auth.session-token");
    });
  });
});

describe("auth cookie migration scenarios", () => {
  describe("signout clears legacy cookies", () => {
    it("getAllSessionCookieNames includes legacy v4 names for clearing", () => {
      const names = getAllSessionCookieNames();
      // Both legacy names should be included so signout clears them
      expect(names).toContain("next-auth.session-token");
      expect(names).toContain("__Secure-next-auth.session-token");
    });
  });

  describe("login sets v5 cookie name", () => {
    it("getSessionCookieName returns v5 name (not legacy v4)", () => {
      const prodName = getSessionCookieName(true);
      const devName = getSessionCookieName(false);
      
      // Should use v5 naming, not v4
      expect(prodName).toBe("__Secure-authjs.session-token");
      expect(prodName).not.toBe("__Secure-next-auth.session-token");
      
      expect(devName).toBe("authjs.session-token");
      expect(devName).not.toBe("next-auth.session-token");
    });
  });

  describe("reading supports both v5 and legacy v4", () => {
    it("getSessionCookieNames includes both v5 and v4 for reading", () => {
      const prodNames = getSessionCookieNames(true);
      const devNames = getSessionCookieNames(false);
      
      // Production should include both secure variants
      expect(prodNames).toContain("__Secure-authjs.session-token");
      expect(prodNames).toContain("__Secure-next-auth.session-token");
      
      // Development should include both non-secure variants
      expect(devNames).toContain("authjs.session-token");
      expect(devNames).toContain("next-auth.session-token");
    });

    it("v5 cookie names come before v4 (preferred order)", () => {
      const prodNames = getSessionCookieNames(true);
      const devNames = getSessionCookieNames(false);
      
      // v5 should be checked first
      const prodV5Index = prodNames.indexOf("__Secure-authjs.session-token");
      const prodV4Index = prodNames.indexOf("__Secure-next-auth.session-token");
      expect(prodV5Index).toBeLessThan(prodV4Index);
      
      const devV5Index = devNames.indexOf("authjs.session-token");
      const devV4Index = devNames.indexOf("next-auth.session-token");
      expect(devV5Index).toBeLessThan(devV4Index);
    });
  });
});
