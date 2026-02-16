import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "node",
          environment: "node",
          include: ["electron-tests/**/*.test.ts"],
        },
      },
      {
        test: {
          name: "jsdom",
          environment: "jsdom",
          include: ["tests/**/*.test.{ts,tsx}"],
          setupFiles: ["tests/test-setup.ts"],
        },
        resolve: {
          alias: {
            "@": resolve(__dirname, "src"),
          },
        },
      },
    ],
  },
});
