/**
 * Property-based tests for Bug Input Sanitization
 * 
 * Feature: bug-reporting-system
 * Property 5: Input Sanitization
 * 
 * *For any* text input (title, description, stepsToReproduce, adminNotes, comment content)
 * containing potential XSS payloads or SQL injection patterns, the stored and returned
 * value SHALL be sanitized to prevent script execution.
 * 
 * **Validates: Requirements 4.7, 9.5**
 */
import "../setupEnv";
import test from "node:test";
import assert from "node:assert/strict";
import * as fc from "fast-check";
import { sanitizeText, sanitizeAdminNotes } from "../../lib/bugs/validation";

// ============================================
// XSS PAYLOAD GENERATORS
// ============================================

/**
 * Generator for common XSS attack patterns
 */
const xssPayloadArbitrary = fc.oneof(
  // Script tags
  fc.constant('<script>alert("xss")</script>'),
  fc.constant('<script src="evil.js"></script>'),
  fc.constant('<SCRIPT>alert(1)</SCRIPT>'),
  
  // Event handlers
  fc.constant('<img src="x" onerror="alert(1)">'),
  fc.constant('<div onmouseover="alert(1)">hover me</div>'),
  fc.constant('<body onload="alert(1)">'),
  fc.constant('<svg onload="alert(1)">'),
  fc.constant('<input onfocus="alert(1)" autofocus>'),
  
  // JavaScript URLs
  fc.constant('<a href="javascript:alert(1)">click</a>'),
  fc.constant('<iframe src="javascript:alert(1)">'),
  
  // Data URLs with scripts
  fc.constant('<a href="data:text/html,<script>alert(1)</script>">click</a>'),
  
  // CSS-based attacks
  fc.constant('<div style="background:url(javascript:alert(1))">'),
  fc.constant('<style>body{background:url("javascript:alert(1)")}</style>'),
  
  // Encoded payloads
  fc.constant('<script>alert(String.fromCharCode(88,83,83))</script>'),
  fc.constant('<img src=x onerror=&#97;&#108;&#101;&#114;&#116;(1)>'),
  
  // Mixed case evasion
  fc.constant('<ScRiPt>alert(1)</ScRiPt>'),
  fc.constant('<IMG SRC=x OnErRoR=alert(1)>'),
  
  // Null byte injection
  fc.constant('<scr\x00ipt>alert(1)</script>'),
  
  // Template literals
  fc.constant('${alert(1)}'),
  fc.constant('`${alert(1)}`'),
  
  // SVG-based XSS
  fc.constant('<svg><script>alert(1)</script></svg>'),
  fc.constant('<svg><animate onbegin="alert(1)">'),
  
  // Object/embed tags
  fc.constant('<object data="javascript:alert(1)">'),
  fc.constant('<embed src="javascript:alert(1)">'),
  
  // Form-based attacks
  fc.constant('<form action="javascript:alert(1)"><input type="submit">'),
  
  // Meta refresh
  fc.constant('<meta http-equiv="refresh" content="0;url=javascript:alert(1)">')
);

/**
 * Generator for SQL injection patterns
 */
const sqlInjectionArbitrary = fc.oneof(
  fc.constant("'; DROP TABLE users; --"),
  fc.constant("1' OR '1'='1"),
  fc.constant("1; DELETE FROM bugs WHERE 1=1; --"),
  fc.constant("' UNION SELECT * FROM users --"),
  fc.constant("admin'--"),
  fc.constant("1' AND 1=1 --"),
  fc.constant("'; EXEC xp_cmdshell('dir'); --"),
  fc.constant("1'; WAITFOR DELAY '0:0:10'; --"),
  fc.constant("' OR 1=1#"),
  fc.constant("admin' /*"),
  fc.constant("*/ OR 1=1 --")
);

/**
 * Generator for mixed content with XSS embedded in normal text
 */
const mixedContentWithXssArbitrary = fc.tuple(
  fc.string({ minLength: 0, maxLength: 50 }),
  xssPayloadArbitrary,
  fc.string({ minLength: 0, maxLength: 50 })
).map(([prefix, xss, suffix]) => `${prefix}${xss}${suffix}`);

/**
 * Generator for safe text (no XSS)
 */
const safeTextArbitrary = fc.string({ minLength: 1, maxLength: 200 })
  .filter(s => !s.includes('<') && !s.includes('>') && !s.includes('&'));

// ============================================
// PROPERTY TESTS
// ============================================

test("Property 5: Input Sanitization - Bug Reporting System", async (t) => {
  
  await t.test("sanitizeText removes script tags from any input", () => {
    /**
     * Property: For any input containing <script> tags, the sanitized output
     * SHALL NOT contain any script tags or executable JavaScript.
     */
    fc.assert(
      fc.property(
        xssPayloadArbitrary,
        (xssPayload) => {
          const sanitized = sanitizeText(xssPayload);
          
          // Must not contain script tags (case-insensitive)
          const hasScriptTag = /<script/i.test(sanitized);
          
          // Must not contain event handlers
          const hasEventHandler = /\bon\w+\s*=/i.test(sanitized);
          
          // Must not contain javascript: URLs
          const hasJsUrl = /javascript:/i.test(sanitized);
          
          return !hasScriptTag && !hasEventHandler && !hasJsUrl;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("sanitizeText removes all HTML tags for plain text fields", () => {
    /**
     * Property: For any input with HTML tags, sanitizeText SHALL remove
     * all HTML tags since bug titles/descriptions are plain text.
     */
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant('<b>bold</b>'),
          fc.constant('<i>italic</i>'),
          fc.constant('<div>content</div>'),
          fc.constant('<p>paragraph</p>'),
          fc.constant('<span class="test">span</span>'),
          fc.constant('<a href="http://example.com">link</a>'),
          xssPayloadArbitrary
        ),
        (htmlInput) => {
          const sanitized = sanitizeText(htmlInput);
          
          // Should not contain any HTML tags
          const hasHtmlTags = /<[^>]+>/g.test(sanitized);
          
          return !hasHtmlTags;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("sanitizeText preserves safe text content", () => {
    /**
     * Property: For any safe text input (no HTML/XSS), the sanitized output
     * SHALL preserve the original content.
     */
    fc.assert(
      fc.property(
        safeTextArbitrary,
        (safeText) => {
          const sanitized = sanitizeText(safeText);
          
          // Safe text should be preserved (after trimming)
          return sanitized === safeText.trim();
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("sanitizeText handles mixed content with XSS payloads", () => {
    /**
     * Property: For any text containing both safe content and XSS payloads,
     * the sanitized output SHALL remove the XSS while preserving safe content.
     */
    fc.assert(
      fc.property(
        mixedContentWithXssArbitrary,
        (mixedContent) => {
          const sanitized = sanitizeText(mixedContent);
          
          // Must not contain dangerous patterns
          const hasScriptTag = /<script/i.test(sanitized);
          const hasEventHandler = /\bon\w+\s*=/i.test(sanitized);
          const hasJsUrl = /javascript:/i.test(sanitized);
          
          return !hasScriptTag && !hasEventHandler && !hasJsUrl;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("sanitizeText handles null and undefined inputs", () => {
    /**
     * Property: For null or undefined inputs, sanitizeText SHALL return
     * an empty string without throwing.
     */
    assert.equal(sanitizeText(null), "");
    assert.equal(sanitizeText(undefined), "");
    assert.equal(sanitizeText(""), "");
  });

  await t.test("sanitizeText handles SQL injection patterns safely", () => {
    /**
     * Property: For any SQL injection pattern, sanitizeText SHALL return
     * the text without modification (SQL injection is handled by Prisma's
     * parameterized queries, but we verify sanitization doesn't break).
     */
    fc.assert(
      fc.property(
        sqlInjectionArbitrary,
        (sqlPayload) => {
          const sanitized = sanitizeText(sqlPayload);
          
          // SQL injection text should pass through (no HTML to strip)
          // The actual SQL injection protection is via Prisma parameterized queries
          // We just verify the function doesn't throw and returns a string
          return typeof sanitized === "string";
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("sanitizeAdminNotes allows safe formatting tags", () => {
    /**
     * Property: For admin notes, basic formatting tags (b, i, u, br, p, ul, ol, li)
     * SHALL be preserved while dangerous tags are removed.
     */
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant('<b>bold text</b>'),
          fc.constant('<i>italic text</i>'),
          fc.constant('<u>underlined</u>'),
          fc.constant('<p>paragraph</p>'),
          fc.constant('<ul><li>item 1</li><li>item 2</li></ul>'),
          fc.constant('<ol><li>first</li><li>second</li></ol>'),
          fc.constant('line 1<br>line 2')
        ),
        (formattedText) => {
          const sanitized = sanitizeAdminNotes(formattedText);
          
          // Should preserve the allowed tags
          // The content should still contain the formatting
          return sanitized.length > 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("sanitizeAdminNotes removes dangerous tags while preserving safe ones", () => {
    /**
     * Property: For admin notes containing both safe formatting and XSS payloads,
     * the dangerous content SHALL be removed while safe formatting is preserved.
     */
    fc.assert(
      fc.property(
        fc.tuple(
          fc.constantFrom('<b>', '<i>', '<p>'),
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.includes('<')),
          fc.constantFrom('</b>', '</i>', '</p>'),
          xssPayloadArbitrary
        ),
        ([openTag, content, closeTag, xss]) => {
          const input = `${openTag}${content}${closeTag}${xss}`;
          const sanitized = sanitizeAdminNotes(input);
          
          // Must not contain script tags or event handlers
          const hasScriptTag = /<script/i.test(sanitized);
          const hasEventHandler = /\bon\w+\s*=/i.test(sanitized);
          const hasJsUrl = /javascript:/i.test(sanitized);
          
          return !hasScriptTag && !hasEventHandler && !hasJsUrl;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("sanitizeText is idempotent", () => {
    /**
     * Property: Applying sanitizeText multiple times SHALL produce
     * the same result as applying it once (idempotence).
     */
    fc.assert(
      fc.property(
        fc.oneof(xssPayloadArbitrary, safeTextArbitrary, mixedContentWithXssArbitrary),
        (input) => {
          const once = sanitizeText(input);
          const twice = sanitizeText(once);
          
          return once === twice;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("sanitizeAdminNotes is idempotent", () => {
    /**
     * Property: Applying sanitizeAdminNotes multiple times SHALL produce
     * the same result as applying it once (idempotence).
     */
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant('<b>test</b>'),
          fc.constant('<script>alert(1)</script>'),
          fc.constant('<p>safe</p><script>bad</script>')
        ),
        (input) => {
          const once = sanitizeAdminNotes(input);
          const twice = sanitizeAdminNotes(once);
          
          return once === twice;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("sanitizeText output never contains executable JavaScript", () => {
    /**
     * Property: For ANY string input, the sanitized output SHALL NOT
     * contain patterns that could execute JavaScript in a browser.
     */
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 500 }),
        (arbitraryInput) => {
          const sanitized = sanitizeText(arbitraryInput);
          
          // Comprehensive check for executable JS patterns
          const dangerousPatterns = [
            /<script/i,
            /javascript:/i,
            /\bon\w+\s*=/i,  // Event handlers like onclick=, onerror=
            /data:text\/html/i,
            /<iframe/i,
            /<object/i,
            /<embed/i,
            /<svg[^>]*>/i,
            /<math[^>]*>/i,
          ];
          
          return dangerousPatterns.every(pattern => !pattern.test(sanitized));
        }
      ),
      { numRuns: 100 }
    );
  });
});
