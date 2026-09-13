import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { TextDecoder } from "node:util";

const textExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".jsx",
  ".json",
  ".md",
  ".mjs",
  ".sql",
  ".ts",
  ".tsx",
]);

// These sequences are the usual result of decoding UTF-8 Arabic as Windows-1252
// or Latin-1. They should never reach source control as user-facing text.
const mojibakePattern = /[�]|Ã[\u0080-\uFFFF]|Â[\u0080-\uFFFF]|â[\u0080-\uFFFF]{1,2}|[ØÙ][\u0080-\uFFFF]/u;
const decoder = new TextDecoder("utf-8", { fatal: true });
const trackedFiles = execFileSync("git", ["ls-files", "-z"], { encoding: "buffer" })
  .toString("utf8")
  .split("\0")
  .filter(Boolean);
const failures = [];

for (const file of trackedFiles) {
  if (!textExtensions.has(path.extname(file).toLowerCase())) continue;

  const bytes = readFileSync(file);
  if (bytes.includes(0)) continue;

  let content;
  try {
    content = decoder.decode(bytes);
  } catch {
    failures.push(`${file}: invalid UTF-8 byte sequence`);
    continue;
  }

  const match = content.match(mojibakePattern);
  if (match) {
    const line = content.slice(0, match.index).split("\n").length;
    failures.push(`${file}:${line}: suspicious text sequence ${JSON.stringify(match[0])}`);
  }
}

if (failures.length) {
  console.error("UTF-8 check failed. Repair the text encoding in these files:");
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`UTF-8 check passed for ${trackedFiles.length} tracked files.`);
}
