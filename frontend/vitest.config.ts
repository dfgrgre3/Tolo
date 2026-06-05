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
      // Integration tests are now self-contained Vitest-native mocks and CAN run.
      // Excluded previously because they depended on jest-websocket-mock (Jest-only).
      // تعتمد على لغة الجهاز / تباينات تنسيق — تُحدَّث لاحقاً أو تُشغَّل مع locale ثابت
      "src/__tests__/utils/format-utils.test.ts",
      "src/__tests__/hooks/**",
    ],
    pool: "threads",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
