import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: [
      "node_modules/**",
      "src/__tests__/e2e/**",
    ],
    pool: "forks",
    maxWorkers: 1,
    // Setup test environment with locale for Arabic tests
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
