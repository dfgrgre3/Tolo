import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const docsDir = join(root, "docs");
const reportPath = join(docsDir, "audit-report.md");
const isFixMode = process.argv.includes("--fix");
const now = new Date();

const ignoredDirs = new Set([
  ".git",
  ".next",
  "node_modules",
  "coverage",
  "dist",
  "build",
  "out",
  "test-results",
]);

const secretPatterns = [
  { name: "JWT-like token", pattern: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/ },
  { name: "OpenAI API key", pattern: /sk-[A-Za-z0-9_-]{20,}/ },
  { name: "Generic private key", pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { name: "AWS access key", pattern: /AKIA[0-9A-Z]{16}/ },
  { name: "Likely hard-coded secret", pattern: /\b(secret|api[_-]?key|token|password)\b\s*[:=]\s*["'][^"']{12,}["']/i },
];

function runCheck(name, command, cwd = root, warnOnly = false) {
  const started = Date.now();
  const result = spawnSync(command, {
    cwd,
    shell: true,
    encoding: "utf8",
    env: { ...process.env, GOCACHE: process.env.GOCACHE || join(root, ".gocache") },
  });

  const output = `${result.stdout || ""}${result.stderr || ""}`.trim();
  const status = result.status === 0 ? "pass" : warnOnly ? "warn" : "fail";

  return {
    name,
    command,
    status,
    durationMs: Date.now() - started,
    summary: status === "pass" ? "Completed successfully." : "Command exited with a non-zero status.",
    output: clip(output),
  };
}

function clip(value, max = 8_000) {
  if (value.length <= max) {
    return value;
  }
  return `${value.slice(0, max)}\n\n... output truncated ...`;
}

function walkFiles(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const rel = relative(root, fullPath);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      if (!ignoredDirs.has(entry)) {
        walkFiles(fullPath, files);
      }
      continue;
    }

    if (stats.size > 1024 * 1024) {
      continue;
    }

    if (rel.endsWith("package-lock.json") || rel.endsWith("pnpm-lock.yaml") || rel.endsWith("tsconfig.tsbuildinfo")) {
      continue;
    }

    files.push(fullPath);
  }
  return files;
}

function secretScan() {
  const started = Date.now();
  const findings = [];

  for (const file of walkFiles(root)) {
    const rel = relative(root, file);
    let content = "";

    try {
      content = readFileSync(file, "utf8");
    } catch {
      continue;
    }

    const lines = content.split(/\r?\n/);
    lines.forEach((line, index) => {
      if (rel === ".env.example" && line.includes("your-")) {
        return;
      }
      if (line.includes("valid-jwt-token")) {
        return;
      }
      for (const { name, pattern } of secretPatterns) {
        if (pattern.test(line)) {
          findings.push(`${rel}:${index + 1} - ${name}`);
          break;
        }
      }
    });
  }

  return {
    name: "Secret and credential scan",
    status: findings.length === 0 ? "pass" : "warn",
    durationMs: Date.now() - started,
    summary: findings.length === 0 ? "No obvious hard-coded secrets found." : `${findings.length} possible secret references found.`,
    output: findings.join("\n"),
  };
}

function dependencyAudit() {
  return runCheck("npm dependency audit", "npm audit --audit-level=moderate --omit=dev", root, true);
}

function statusIcon(status) {
  if (status === "pass") return "PASS";
  if (status === "warn") return "WARN";
  return "FAIL";
}

function renderReport(results) {
  const failed = results.filter((result) => result.status === "fail").length;
  const warned = results.filter((result) => result.status === "warn").length;
  const passed = results.filter((result) => result.status === "pass").length;

  const sections = results
    .map((result) => {
      const command = result.command ? `\nCommand: \`${result.command}\`` : "";
      const output = result.output
        ? `\n\n<details>\n<summary>Output</summary>\n\n\`\`\`text\n${result.output.replace(/```/g, "'''")}\n\`\`\`\n\n</details>`
        : "";
      return `## ${statusIcon(result.status)} ${result.name}\n${result.summary}${command}\nDuration: ${result.durationMs}ms${output}`;
    })
    .join("\n\n");

  return `# Thanawy Project Audit Report

Generated: ${now.toISOString()}
Mode: ${isFixMode ? "fix" : "check"}

## Summary

- Passed: ${passed}
- Warnings: ${warned}
- Failed: ${failed}

${sections}
`;
}

const checks = [];

if (isFixMode) {
  checks.push(runCheck("ESLint auto-fix", "npx eslint . --fix", root, true));
}

checks.push(runCheck("TypeScript type-check", "npx tsc --noEmit", root));
checks.push(runCheck("ESLint", "npx eslint .", root, true));
checks.push(runCheck("Frontend tests", "npm test", root));
checks.push(runCheck("Next production build", "npm run build", root));
checks.push(secretScan());
checks.push(dependencyAudit());

if (!existsSync(docsDir)) {
  mkdirSync(docsDir, { recursive: true });
}

writeFileSync(reportPath, renderReport(checks), "utf8");

console.log(`Audit report written to ${relative(root, reportPath)}`);
console.log(`Passed: ${checks.filter((check) => check.status === "pass").length}`);
console.log(`Warnings: ${checks.filter((check) => check.status === "warn").length}`);
console.log(`Failed: ${checks.filter((check) => check.status === "fail").length}`);

if (checks.some((check) => check.status === "fail")) {
  process.exit(1);
}
