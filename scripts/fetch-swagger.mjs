#!/usr/bin/env node
/**
 * Fetch the backend swagger.json and place it at packages/contracts/swagger.json.
 *
 * Sources (in priority order):
 *   1. --source <path>      local file (used in dev)
 *   2. --url   <url>        remote HTTP (used by some deploy flows)
 *   3. --github-release    fetch from backend repo's latest swagger release
 *   4. GITHUB_ARTIFACT_PATH  env var set by CI from `actions/download-artifact`
 *
 * Why this exists:
 *   The backend lives in a separate repo (d:\backend) with its own CI.
 *   It produces docs/swagger.json and uploads it as a GitHub Release asset
 *   named `swagger.json`. The frontend CI downloads that asset via
 *   GitHub REST API.
 *
 * IMPORTANT: actions/upload-artifact CANNOT share artifacts across repositories.
 * The backend MUST publish swagger.json as a GitHub Release asset.
 */
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..");
const DEST = resolve(REPO_ROOT, "packages/contracts/swagger.json");

/**
 * The Go backend currently emits Swagger 2.0, while openapi-typescript 7
 * requires OpenAPI 3.x. Keep the backend as the source of truth and perform
 * the format conversion at the repository boundary.
 */
function copyOrConvert(source, destination) {
  const document = JSON.parse(readFileSync(source, "utf8"));
  mkdirSync(dirname(destination), { recursive: true });

  if (document.swagger !== "2.0") {
    copyFileSync(source, destination);
    return;
  }

  const tempDir = mkdtempSync(join(tmpdir(), "thanawy-swagger-"));
  const converted = join(tempDir, "openapi.json");
  try {
    const converter = resolve(REPO_ROOT, "node_modules/swagger2openapi/swagger2openapi.js");
    execFileSync(process.execPath, [converter, "-y", "-o", converted, source], {
      stdio: "inherit",
    });
    copyFileSync(converted, destination);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--source") out.source = argv[++i];
    else if (a === "--url") out.url = argv[++i];
    else if (a === "--dest") out.dest = argv[++i];
    else if (a === "--github-release") out.githubRelease = argv[++i] || "thanawy/backend";
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
    copyOrConvert(src, dest);
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
    const tempDir = mkdtempSync(join(tmpdir(), "thanawy-swagger-"));
    const source = join(tempDir, "swagger.json");
    try {
      writeFileSync(source, text, "utf8");
      copyOrConvert(source, dest);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
    console.log(`fetch-swagger: downloaded ${args.url} → ${dest}`);
    return;
  }

  if (args.githubRelease) {
    const [owner, repo] = args.githubRelease.split("/");
    if (!owner || !repo) {
      console.error(`fetch-swagger: invalid --github-release format: ${args.githubRelease} (expected owner/repo)`);
      process.exit(1);
    }

    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      console.error("fetch-swagger: GITHUB_TOKEN environment variable is required for --github-release");
      process.exit(1);
    }

    // Use static tag swagger-latest for reliable fetching
    const tag = "swagger-latest";

    // Fetch release by tag
    const releaseRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/tags/${tag}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!releaseRes.ok) {
      if (releaseRes.status === 404) {
        console.error(`fetch-swagger: no release found for ${owner}/${repo} tag "${tag}". Has the backend CI run and published swagger?`);
      } else {
        console.error(`fetch-swagger: GitHub API error: ${releaseRes.status}`);
      }
      process.exit(1);
    }

    const release = await releaseRes.json();
    const swaggerAsset = release.assets?.find((a) => a.name === "swagger.json");

    if (!swaggerAsset) {
      console.error(`fetch-swagger: release ${release.tag_name} has no swagger.json asset`);
      process.exit(1);
    }

    const downloadRes = await fetch(swaggerAsset.browser_download_url);
    if (!downloadRes.ok) {
      console.error(`fetch-swagger: failed to download swagger.json: ${downloadRes.status}`);
      process.exit(1);
    }

    const text = await downloadRes.text();
    const tempDir = mkdtempSync(join(tmpdir(), "thanawy-swagger-"));
    const source = join(tempDir, "swagger.json");
    try {
      writeFileSync(source, text, "utf8");
      copyOrConvert(source, dest);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
    console.log(`fetch-swagger: downloaded ${swaggerAsset.browser_download_url} → ${dest} (release: ${release.tag_name})`);
    return;
  }

  const artifactPath = process.env.GITHUB_ARTIFACT_PATH;
  if (artifactPath && existsSync(artifactPath)) {
    mkdirSync(dirname(dest), { recursive: true });
    copyOrConvert(artifactPath, dest);
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
