import "./setupEnv";
import test from "node:test";
import assert from "node:assert/strict";
import {
  getSessionCookieName,
  getSessionCookieNames,
  getAllSessionCookieNames,
  getSessionCookieOptions,
  getClearCookieOptions,
  COOKIE_NAMES,
} from "../../app/lib/auth-cookies";

test("auth-cookies utility", async (t) => {
  await t.test("getSessionCookieName returns v5 secure cookie name in production", () => {
    const name = getSessionCookieName(true);
    assert.equal(name, "__Secure-authjs.session-token");
  });

  await t.test("getSessionCookieName returns v5 non-secure cookie name in development", () => {
    const name = getSessionCookieName(false);
    assert.equal(name, "authjs.session-token");
  });

  await t.test("getSessionCookieNames returns all secure variants first in production", () => {
    const names = getSessionCookieNames(true);
    assert.deepEqual(names, [
      "__Secure-authjs.session-token",
      "__Secure-next-auth.session-token",
      "authjs.session-token",
      "next-auth.session-token",
    ]);
    assert.equal(names[0], "__Secure-authjs.session-token");
  });

  await t.test("getSessionCookieNames returns non-secure variants in development", () => {
    const names = getSessionCookieNames(false);
    assert.deepEqual(names, [
      "authjs.session-token",
      "next-auth.session-token",
    ]);
    assert.equal(names[0], "authjs.session-token");
  });

  await t.test("getSessionCookieNames includes legacy v4 cookie names for backward compatibility", () => {
    const prodNames = getSessionCookieNames(true);
    const devNames = getSessionCookieNames(false);
    
    assert.ok(prodNames.includes("__Secure-next-auth.session-token"));
    assert.ok(devNames.includes("next-auth.session-token"));
  });

  await t.test("getAllSessionCookieNames returns all four cookie name variants", () => {
    const names = getAllSessionCookieNames();
    assert.equal(names.length, 4);
    assert.ok(names.includes("__Secure-authjs.session-token"));
    assert.ok(names.includes("authjs.session-token"));
    assert.ok(names.includes("__Secure-next-auth.session-token"));
    assert.ok(names.includes("next-auth.session-token"));
  });

  await t.test("getSessionCookieOptions returns correct options for production", () => {
    const options = getSessionCookieOptions(true);
    assert.deepEqual(options, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
    });
  });

  await t.test("getSessionCookieOptions returns correct options for development", () => {
    const options = getSessionCookieOptions(false);
    assert.deepEqual(options, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
    });
  });

  await t.test("getClearCookieOptions includes maxAge: 0 and past expires date", () => {
    const options = getClearCookieOptions(true);
    assert.equal(options.maxAge, 0);
    assert.deepEqual(options.expires, new Date(0));
    assert.equal(options.httpOnly, true);
  });

  await t.test("COOKIE_NAMES exports all cookie name constants", () => {
    assert.equal(COOKIE_NAMES.V5, "authjs.session-token");
    assert.equal(COOKIE_NAMES.V5_SECURE, "__Secure-authjs.session-token");
    assert.equal(COOKIE_NAMES.V4, "next-auth.session-token");
    assert.equal(COOKIE_NAMES.V4_SECURE, "__Secure-next-auth.session-token");
  });
});

test("auth cookie migration scenarios", async (t) => {
  await t.test("getAllSessionCookieNames includes legacy v4 names for clearing", () => {
    const names = getAllSessionCookieNames();
    assert.ok(names.includes("next-auth.session-token"));
    assert.ok(names.includes("__Secure-next-auth.session-token"));
  });

  await t.test("getSessionCookieName returns v5 name (not legacy v4)", () => {
    const prodName = getSessionCookieName(true);
    const devName = getSessionCookieName(false);
    
    assert.equal(prodName, "__Secure-authjs.session-token");
    assert.notEqual(prodName, "__Secure-next-auth.session-token");
    
    assert.equal(devName, "authjs.session-token");
    assert.notEqual(devName, "next-auth.session-token");
  });

  await t.test("getSessionCookieNames includes both v5 and v4 for reading", () => {
    const prodNames = getSessionCookieNames(true);
    const devNames = getSessionCookieNames(false);
    
    assert.ok(prodNames.includes("__Secure-authjs.session-token"));
    assert.ok(prodNames.includes("__Secure-next-auth.session-token"));
    
    assert.ok(devNames.includes("authjs.session-token"));
    assert.ok(devNames.includes("next-auth.session-token"));
  });

  await t.test("v5 cookie names come before v4 (preferred order)", () => {
    const prodNames = getSessionCookieNames(true);
    const devNames = getSessionCookieNames(false);
    
    const prodV5Index = prodNames.indexOf("__Secure-authjs.session-token");
    const prodV4Index = prodNames.indexOf("__Secure-next-auth.session-token");
    assert.ok(prodV5Index < prodV4Index);
    
    const devV5Index = devNames.indexOf("authjs.session-token");
    const devV4Index = devNames.indexOf("next-auth.session-token");
    assert.ok(devV5Index < devV4Index);
  });
});
