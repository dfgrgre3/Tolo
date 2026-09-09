import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const args = ["knip", "--directory", "frontend", "--include", "files", "--reporter", "json"];
const command = process.platform === "win32" ? (process.env.ComSpec ?? "cmd.exe") : "npx";
const commandArgs = process.platform === "win32" ? ["/d", "/s", "/c", `npx ${args.join(" ")}`] : args;
const result = spawnSync(
  command,
  commandArgs,
  { encoding: "utf8" },
);

if (result.error) throw result.error;

let report;
try {
  report = JSON.parse(result.stdout);
} catch {
  console.error("Unable to parse Knip JSON output.");
  console.error(result.stdout || result.stderr);
  process.exit(1);
}

const baselinePath = resolve("config", "knip-unused-files-baseline.json");
const baseline = new Set(JSON.parse(readFileSync(baselinePath, "utf8")));
const current = new Set(
  (report.issues ?? []).flatMap((issue) =>
    (issue.files ?? [{ name: issue.file }]).map((file) => file.name),
  ),
);
const newlyUnused = [...current].filter((file) => !baseline.has(file)).sort();

if (newlyUnused.length > 0) {
  console.error("Knip found new unused files outside the approved baseline:");
  for (const file of newlyUnused) console.error(`  ${file}`);
  process.exit(1);
}

console.log(`Knip baseline check passed (${current.size} unused files, ${baseline.size} baselined).`);
