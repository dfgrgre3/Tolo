#!/usr/bin/env node
/**
 * Verify that the generated API types are up-to-date with the swagger spec.
 *
 * Run in CI after `npm run contracts:generate`. If the generated file
 * differs from what's checked in, the build fails — which means someone
 * changed the swagger spec but forgot to commit the regenerated types.
 *
 * Usage:
 *   node scripts/check-api-types-fresh.mjs
 * Exit codes:
 *   0 — generated file matches spec
 *   1 — drift detected (or generated file missing)
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..");
const SPEC = resolve(REPO_ROOT, "packages/contracts/swagger.json");
const GENERATED = resolve(
  REPO_ROOT,
  "packages/contracts/src/generated/api.ts",
);

// Regenerate into a temp file so we can diff without overwriting the
// committed artifact.
const TMP = resolve(
  REPO_ROOT,
  "packages/contracts/src/generated/.api.ts.tmp",
);

function regen(out) {
  execSync(`npx --no-install openapi-typescript "${SPEC}" -o "${out}"`, {
    stdio: "inherit",
  });
}

if (!existsSync(SPEC)) {
  console.error(
    `check-api-types-fresh: swagger spec not found at ${SPEC}.\n` +
      `Run \`npm run contracts:fetch\` first.`,
  );
  process.exit(1);
}

try {
  regen(TMP);
} catch (err) {
  console.error("check-api-types-fresh: codegen failed", err);
  process.exit(1);
}

let drift = false;
if (!existsSync(GENERATED)) {
  drift = true;
  console.error(
    `check-api-types-fresh: ${GENERATED} is missing. ` +
      `Run \`npm run generate:api-types\` and commit the result.`,
  );
} else {
  // Compare inline — avoid `node -e` (PowerShell mangles backslashes) and
  // subprocess overhead. Binary equality is the right semantic for
  // machine-generated code; line-level diffs would only add noise.
  const fresh = readFileSync(TMP, "utf8");
  const committed = readFileSync(GENERATED, "utf8");
  if (fresh !== committed) {
    drift = true;
    console.error("DRIFT");
  }
}

// Clean up temp file regardless of outcome.
try {
  unlinkSync(TMP);
} catch {
  /* best-effort */
}

if (drift) {
  console.error(
    "\nAPI types are out of date with the swagger spec.\n" +
      "Run `npm run contracts:generate` locally and commit the result.",
  );
  process.exit(1);
}

console.log("check-api-types-fresh: ok");
