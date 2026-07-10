#!/usr/bin/env node
// Sync every locale file against en.json: add missing keys (English copy as
// placeholder), drop keys not present in English, and normalize key order to
// match English so diffs stay clean. Run after adding keys to en.json, then
// translate the locales you care about.
//
// Usage: node scripts/sync-locales.mjs

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const localesDir = join(dirname(fileURLToPath(import.meta.url)), "../ui/src/i18n/locales");
const english = JSON.parse(readFileSync(join(localesDir, "en.json"), "utf8"));

function sync(reference, existing) {
  if (typeof reference === "string") {
    return typeof existing === "string" ? existing : reference;
  }
  const existingObject = existing && typeof existing === "object" && !Array.isArray(existing) ? existing : {};
  return Object.fromEntries(
    Object.entries(reference).map(([key, value]) => [key, sync(value, existingObject[key])]),
  );
}

let changed = 0;
for (const file of readdirSync(localesDir).sort()) {
  if (!file.endsWith(".json") || file === "en.json") continue;
  const path = join(localesDir, file);
  const before = readFileSync(path, "utf8");
  const after = `${JSON.stringify(sync(english, JSON.parse(before)), null, 2)}\n`;
  if (after !== before) {
    writeFileSync(path, after);
    changed += 1;
    console.log(`updated ${file}`);
  }
}
console.log(changed === 0 ? "all locales already in sync" : `synced ${changed} locale file(s)`);
