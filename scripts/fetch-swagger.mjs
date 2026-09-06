#!/usr/bin/env node
/**
 * Fetch the backend swagger.json and place it at packages/contracts/swagger.json.
 *
 * Sources (in priority order):
 *   1. --source <path>      local file (used in dev)
 *   2. --url   <url>        remote HTTP (used by some deploy flows)
 *   3. GITHUB_ARTIFACT_PATH  env var set by CI from `actions/download-artifact`
 *
 * Why this exists:
 *   The backend lives in a separate repo (d:\backend) with its own CI.
 *   It produces docs/swagger.json and uploads it as a GitHub artifact
 *   named `backend-swagger`. The frontend CI downloads that artifact via
 *   `actions/download-artifact` and sets GITHUB_ARTIFACT_PATH to the
 *   extracted swagger.json. This script copies it into the contracts
 *   package so codegen has a stable input path.
 */
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..");
const DEST = resolve(REPO_ROOT, "packages/contracts/swagger.json");

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--source") out.source = argv[++i];
    else if (a === "--url") out.url = argv[++i];
    else if (a === "--dest") out.dest = argv[++i];
    else if (a === "--allow-missing") out.allowMissing = true;
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const dest = args.dest ?? DEST;

  if (args.source) {
    const src = resolve(args.source);
    if (!existsSync(src)) {
      console.error(`fetch-swagger: --source not found: ${src}`);
      process.exit(1);
    }
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(src, dest);
    console.log(`fetch-swagger: copied ${src} → ${dest}`);
    return;
  }

  if (args.url) {
    const res = await fetch(args.url);
    if (!res.ok) {
      console.error(`fetch-swagger: HTTP ${res.status} from ${args.url}`);
      process.exit(1);
    }
    const text = await res.text();
    mkdirSync(dirname(dest), { recursive: true });
    const { writeFileSync } = await import("node:fs");
    writeFileSync(dest, text, "utf8");
    console.log(`fetch-swagger: downloaded ${args.url} → ${dest}`);
    return;
  }

  const artifactPath = process.env.GITHUB_ARTIFACT_PATH;
  if (artifactPath && existsSync(artifactPath)) {
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(artifactPath, dest);
    console.log(
      `fetch-swagger: copied CI artifact ${artifactPath} → ${dest}`,
    );
    return;
  }

  // No source provided. Two reasonable behaviors:
  //   (a) hard fail (default) — caller wants the freshest spec or nothing.
  //   (b) soft fallthrough with --allow-missing — caller (CI before the
  //       first backend build) is happy to use the placeholder already
  //       checked into packages/contracts/swagger.json.
  if (args.allowMissing && existsSync(dest)) {
    console.warn(
      `fetch-swagger: no source provided; using existing ${dest}. ` +
        `Run \`npm run contracts:generate\` locally once the backend artifact is available.`,
    );
    return;
  }

  console.error(
    "fetch-swagger: no source provided.\n" +
      "Pass --source <path>, --url <url>, or set GITHUB_ARTIFACT_PATH.",
  );
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
