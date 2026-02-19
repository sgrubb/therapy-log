import { defineConfig } from "vitest/config";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";

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
        plugins: [react()],
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
