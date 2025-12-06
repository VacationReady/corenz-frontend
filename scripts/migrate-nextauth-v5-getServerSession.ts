import fs from "fs/promises";
import path from "path";

const ROOT = path.resolve(__dirname, "..", "app");

async function walk(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath)));
    } else if (entry.isFile() && (fullPath.endsWith(".ts") || fullPath.endsWith(".tsx"))) {
      files.push(fullPath);
    }
  }

  return files;
}

function ensureAuthImport(code: string): { updated: string; changed: boolean } {
  const importRe = /import\s*{([^}]*)}\s*from\s*["']@\/lib\/auth-options["'];/;
  const match = code.match(importRe);

  if (match) {
    const namesRaw = match[1];
    const names = namesRaw
      .split(",")
      .map((n) => n.trim())
      .filter(Boolean);

    if (!names.includes("auth")) {
      names.push("auth");
      const newImport = `import { ${names.join(", ")} } from "@/lib/auth-options";`;
      return { updated: code.replace(importRe, newImport), changed: true };
    }

    return { updated: code, changed: false };
  }

  // No existing import from auth-options, add one at the top
  const newCode = `import { auth } from "@/lib/auth-options";\n` + code;
  return { updated: newCode, changed: true };
}

async function processFile(filePath: string): Promise<boolean> {
  let code = await fs.readFile(filePath, "utf8");

  if (!code.includes("getServerSession")) return false;

  let changed = false;

  // Remove invalid imports from next-auth / next-auth/next
  const importPatterns: RegExp[] = [
    /import\s*{\s*getServerSession\s*}\s*from\s*["']next-auth["'];?\s*/g,
    /import\s*{\s*getServerSession\s*}\s*from\s*["']next-auth\/next["'];?\s*/g,
  ];

  for (const re of importPatterns) {
    if (re.test(code)) {
      code = code.replace(re, "");
      changed = true;
    }
  }

  if (!code.includes("getServerSession")) {
    // Only imports were present, nothing else to do
    if (changed) {
      await fs.writeFile(filePath, code, "utf8");
    }
    return changed;
  }

  // Ensure we import auth from our central config
  const authImportResult = ensureAuthImport(code);
  code = authImportResult.updated;
  if (authImportResult.changed) changed = true;

  // Replace the common usage patterns
  const before = code;
  code = code.replace(/getServerSession\(authOptions(?:\s*as\s*any)?\)/g, "auth()");

  if (code !== before) changed = true;

  if (changed) {
    await fs.writeFile(filePath, code, "utf8");
  }

  return changed;
}

async function main() {
  const files = await walk(ROOT);
  let updatedCount = 0;

  for (const file of files) {
    const changed = await processFile(file);
    if (changed) {
      updatedCount += 1;
      // eslint-disable-next-line no-console
      console.log("Updated", path.relative(ROOT, file));
    }
  }

  // eslint-disable-next-line no-console
  console.log(`Done. Updated ${updatedCount} file(s).`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Migration failed", err);
  process.exit(1);
});
