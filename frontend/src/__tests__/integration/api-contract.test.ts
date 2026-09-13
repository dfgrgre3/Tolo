/**
 * API contract drift test.
 *
 * الهدف: منع الـdrift بين frontend↔backend عبر:
 *   1) التأكد أن OpenAPI spec موجود وقابل للقراءة (يُولّد تلقائياً من Go backend).
 *   2) فحص الـstructure (paths/operations) قبل الـdeploy.
 *   3) قائمة الـendpoints المعروفة في الـfrontend — إذا الـbackend أزال واحداً، يفشل CI.
 *   4) التحقق أن catch-all proxy لا يزال موجوداً (الـfrontend لا ينشئ routes يدوياً).
 *
 * NOTE: حتى يُولّد swagger.json من الـbackend (swaggo/swag)،
 * سيتخطى هذا الاختبار gracefully باستخدام vi.skip().
 * ما إن يُولّد، تصبح الحماية فعّالة.
 */
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(fileURLToPath(import.meta.url), "../../../../../");

const SWAGGER_CANDIDATES = [
  process.env.THANAWY_OPENAPI_PATH,
  "backend/docs/swagger.json",
  "backend/docs/openapi.json",
  "backend/swagger.json",
  "backend/openapi.json",
  "../backend/docs/swagger.json",
].filter((candidate): candidate is string => Boolean(candidate));

// Endpoints الـfrontend يستخدمها فعلاً (مسارات لا تتغيّر بسهولة).
// عند حذف أي منها من الـbackend بدون تحديث هنا، يفشل الـCI.
// تتم صيانتها يدوياً حتى يُولّد client type-safe من OpenAPI (TODO).
const KNOWN_API_PATHS: ReadonlyArray<string> = [
  "/api/v1/auth/login",
  "/api/v1/courses",
  "/api/v1/courses/{id}",
  "/api/v1/courses/{id}/enroll",
];

function findSwagger(): string | null {
  for (const candidate of SWAGGER_CANDIDATES) {
    const abs = resolve(REPO_ROOT, candidate);
    if (existsSync(abs)) return abs;
  }
  return null;
}

describe("API contract drift", () => {
  const swaggerPath = findSwagger();

  if (!swaggerPath) {
    it("requires a backend OpenAPI artifact", () => {
      throw new Error(
        "Backend OpenAPI artifact is unavailable. Set THANAWY_OPENAPI_PATH or generate backend/docs/swagger.json before running contract tests.",
      );
      // graceful skip — لا يكسر الـCI قبل أن يُولّد الـspec.
    });
    return;
  }

  it("OpenAPI spec is parseable JSON with a `paths` object", () => {
    const raw = readFileSync(swaggerPath, "utf8");
    const doc = JSON.parse(raw) as { paths?: Record<string, unknown> };
    expect(typeof doc.paths).toBe("object");
    expect(doc.paths).not.toBeNull();
  });

  it("every path starts with `/` and has at least one HTTP operation", () => {
    const raw = readFileSync(swaggerPath, "utf8");
    const doc = JSON.parse(raw) as {
      paths: Record<string, Record<string, unknown> | undefined>;
    };
    const HTTP_METHODS = [
      "get",
      "post",
      "put",
      "patch",
      "delete",
      "head",
      "options",
    ];
    for (const [path, ops] of Object.entries(doc.paths)) {
      expect(path.startsWith("/"), `path ${path} must start with /`).toBe(true);
      expect(
        path.endsWith("/") && path !== "/",
        `path ${path} must not have trailing slash`,
      ).toBe(false);
      const methodCount = Object.keys(ops ?? {}).filter((k) =>
        HTTP_METHODS.includes(k),
      ).length;
      expect(methodCount, `${path} has no HTTP operations`).toBeGreaterThan(0);
    }
  });

  it("frontend KNOWN_API_PATHS still exist in backend swagger", () => {
    const raw = readFileSync(swaggerPath, "utf8");
    const doc = JSON.parse(raw) as { paths: Record<string, unknown> };
    const backendPaths = new Set(Object.keys(doc.paths));
    const missing = KNOWN_API_PATHS.filter((p) => !backendPaths.has(p));
    expect(
      missing,
      `Backend dropped ${missing.length} endpoint(s) the frontend uses:\n${missing.join("\n")}\n` +
        `Either update KNOWN_API_PATHS in this file (intentional removal) ` +
        `or restore the backend route.`,
    ).toEqual([]);
  });
});

describe("frontend catch-all proxy still in place", () => {
  it("src/app/api/[...path]/route.ts exists (no hand-written routes)", () => {
    const proxyPath = resolve(
      REPO_ROOT,
      "frontend/src/app/api/[...path]/route.ts",
    );
    expect(
      existsSync(proxyPath),
      `${proxyPath} missing — frontend must proxy all API traffic through the catch-all`,
    ).toBe(true);
  });
});
