#!/usr/bin/env node
/**
 * Exempt packages with *critical* npm audit advisories from min-release-age,
 * so security patches can install immediately. Moderate/high still wait 7 days.
 *
 * Usage: npm run deps:allow-critical
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const npmrcPath = resolve(process.cwd(), ".npmrc");
const MARKER_START =
  "# --- critical-vuln-excludes (managed by deps:allow-critical) ---";
const MARKER_END = "# --- end critical-vuln-excludes ---";

function runAudit() {
  const result = spawnSync("npm", ["audit", "--json"], {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  // npm audit exits non-zero when vulns exist; still parse stdout
  if (!result.stdout) {
    console.error(result.stderr || "npm audit produced no output");
    process.exit(1);
  }
  try {
    return JSON.parse(result.stdout);
  } catch {
    console.error("Failed to parse npm audit JSON");
    process.exit(1);
  }
}

/** @param {unknown} audit */
function collectCriticalPackages(audit) {
  /** @type {Set<string>} */
  const names = new Set();

  // npm audit v2+ shape: vulnerabilities map
  const vulns =
    audit &&
    typeof audit === "object" &&
    "vulnerabilities" in audit &&
    audit.vulnerabilities &&
    typeof audit.vulnerabilities === "object"
      ? /** @type {Record<string, { severity?: string; name?: string }>} */ (
          audit.vulnerabilities
        )
      : {};

  for (const [name, info] of Object.entries(vulns)) {
    if (info?.severity === "critical") {
      names.add(info.name || name);
    }
  }

  // Legacy advisories shape
  const advisories =
    audit &&
    typeof audit === "object" &&
    "advisories" in audit &&
    audit.advisories &&
    typeof audit.advisories === "object"
      ? /** @type {Record<string, { severity?: string; module_name?: string }>} */ (
          audit.advisories
        )
      : {};

  for (const adv of Object.values(advisories)) {
    if (adv?.severity === "critical" && adv.module_name) {
      names.add(adv.module_name);
    }
  }

  return [...names].sort();
}

function stripManagedBlock(content) {
  const start = content.indexOf(MARKER_START);
  if (start === -1) return content.trimEnd();
  const end = content.indexOf(MARKER_END, start);
  if (end === -1) return content.trimEnd();
  return (content.slice(0, start) + content.slice(end + MARKER_END.length)).trimEnd();
}

function main() {
  const audit = runAudit();
  const critical = collectCriticalPackages(audit);

  if (!existsSync(npmrcPath)) {
    console.error(".npmrc not found — create one with min-release-age=7 first");
    process.exit(1);
  }

  let npmrc = readFileSync(npmrcPath, "utf8");
  npmrc = stripManagedBlock(npmrc);

  if (critical.length === 0) {
    writeFileSync(npmrcPath, `${npmrc}\n`, "utf8");
    console.log("No critical vulnerabilities found. Cleared managed excludes.");
    return;
  }

  const block = [
    "",
    MARKER_START,
    `# Auto-generated ${new Date().toISOString()} — critical advisories only`,
    ...critical.map((name) => `min-release-age-exclude[]=${name}`),
    MARKER_END,
    "",
  ].join("\n");

  writeFileSync(npmrcPath, `${npmrc}\n${block}`, "utf8");
  console.log(
    `Exempted ${critical.length} package(s) with critical vulns from min-release-age:`,
  );
  for (const name of critical) console.log(`  - ${name}`);
  console.log("\nNext: npm install && npm audit fix");
}

main();
