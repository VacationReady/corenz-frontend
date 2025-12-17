/**
 * NZ Sick Leave - CI Enforcement Test
 * 
 * This test scans the codebase to ensure sickLeaveBalance is never
 * written directly outside the approved ledger helper module.
 * 
 * Approved locations:
 * - lib/leave/nz-sick-leave-ledger.ts
 * - scripts/migrate-nz-sick-leave.ts (migration only)
 * 
 * This test should fail if any other file attempts to mutate sickLeaveBalance.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';

const APPROVED_FILES = [
  'lib/leave/nz-sick-leave-ledger.ts',
  'scripts/migrate-nz-sick-leave.ts',
];

const SEARCH_DIRECTORIES = [
  'app',
  'lib',
  'scripts',
];

const IGNORED_PATTERNS = [
  'node_modules',
  '.next',
  'dist',
  '.git',
];

interface Violation {
  file: string;
  line: number;
  content: string;
}

function isApprovedFile(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/');
  return APPROVED_FILES.some(approved => normalized.endsWith(approved));
}

function shouldIgnore(filePath: string): boolean {
  return IGNORED_PATTERNS.some(pattern => filePath.includes(pattern));
}

function scanFile(filePath: string): Violation[] {
  const violations: Violation[] = [];
  
  if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) {
    return violations;
  }
  
  if (shouldIgnore(filePath) || isApprovedFile(filePath)) {
    return violations;
  }
  
  // Also ignore test files for this specific check
  if (filePath.includes('.test.') || filePath.includes('.spec.')) {
    return violations;
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  // Patterns that indicate direct sickLeaveBalance mutation
  const mutationPatterns = [
    // Direct assignment in Prisma create/update
    /sickLeaveBalance\s*:\s*(?!employee|existing|current|Number|parseFloat|params)/i,
    // Increment/decrement operations
    /sickLeaveBalance\s*:\s*{\s*(?:increment|decrement)/i,
    // Direct property assignment
    /\.sickLeaveBalance\s*=/,
  ];
  
  // Exclude patterns (safe usages)
  const safePatterns = [
    // Reading the value
    /select:\s*{[^}]*sickLeaveBalance:\s*true/,
    // Type definitions
    /sickLeaveBalance\??\s*:/,
    // Comments
    /\/\/.*sickLeaveBalance/,
    /\/\*.*sickLeaveBalance.*\*\//,
    // Documentation strings
    /['"`].*sickLeaveBalance.*['"`]/,
  ];
  
  lines.forEach((line, index) => {
    // Skip if line matches safe patterns
    const isSafe = safePatterns.some(pattern => pattern.test(line));
    if (isSafe) return;
    
    // Check for mutation patterns
    for (const pattern of mutationPatterns) {
      if (pattern.test(line)) {
        // Additional context check - skip if it's in a select/include block
        const contextStart = Math.max(0, index - 5);
        const context = lines.slice(contextStart, index + 1).join('\n');
        
        if (context.includes('select:') || context.includes('include:')) {
          // Likely reading, not writing
          continue;
        }
        
        // Check if this is an actual Prisma mutation
        if (line.includes('data:') || context.includes('data:')) {
          violations.push({
            file: filePath,
            line: index + 1,
            content: line.trim(),
          });
          break; // Only report once per line
        }
      }
    }
  });
  
  return violations;
}

function scanDirectory(dir: string): Violation[] {
  const violations: Violation[] = [];
  
  if (!fs.existsSync(dir)) {
    return violations;
  }
  
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (shouldIgnore(fullPath)) {
      continue;
    }
    
    if (entry.isDirectory()) {
      violations.push(...scanDirectory(fullPath));
    } else if (entry.isFile()) {
      violations.push(...scanFile(fullPath));
    }
  }
  
  return violations;
}

describe('NZ Sick Leave - No Direct Writes Enforcement', () => {
  
  it('should not allow direct sickLeaveBalance writes outside approved modules', () => {
    const projectRoot = path.resolve(__dirname, '..');
    const allViolations: Violation[] = [];
    
    for (const dir of SEARCH_DIRECTORIES) {
      const fullPath = path.join(projectRoot, dir);
      allViolations.push(...scanDirectory(fullPath));
    }
    
    if (allViolations.length > 0) {
      const report = allViolations.map(v => 
        `  ${v.file}:${v.line}\n    ${v.content}`
      ).join('\n\n');
      
      assert.fail(
        `Found ${allViolations.length} violation(s) of sickLeaveBalance write policy.\n\n` +
        `sickLeaveBalance should ONLY be written from:\n` +
        APPROVED_FILES.map(f => `  - ${f}`).join('\n') + '\n\n' +
        `Violations:\n${report}\n\n` +
        `To fix: Use recordSickLeaveUsage() or applySickLeaveGrants() from lib/leave/nz-sick-leave-ledger.ts`
      );
    }
    
    // Test passes if no violations found
    assert.ok(true, 'No direct sickLeaveBalance writes found outside approved modules');
  });
  
  it('should have approved modules in the codebase', () => {
    const projectRoot = path.resolve(__dirname, '..');
    
    for (const approved of APPROVED_FILES) {
      const fullPath = path.join(projectRoot, approved);
      assert.ok(
        fs.existsSync(fullPath),
        `Approved module not found: ${approved}`
      );
    }
  });
  
  it('should have ledger helper module with required exports', () => {
    // This ensures the ledger module exists and has the expected interface
    const ledgerModule = require('../lib/leave/nz-sick-leave-ledger');
    
    const requiredExports = [
      'applySickLeaveGrants',
      'recordSickLeaveUsage',
      'reverseSickLeaveUsage',
      'getSickLeaveStatus',
      'isEligibleForSickLeave',
      'computeSickEligibilityDate',
      'computeNextSickGrantDate',
      'getCanonicalEmploymentDate',
      'hoursToDisplayDays',
      'daysToHours',
      'createOpeningBalance',
    ];
    
    for (const exportName of requiredExports) {
      assert.ok(
        typeof ledgerModule[exportName] === 'function',
        `Missing required export: ${exportName}`
      );
    }
  });
});
