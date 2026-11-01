import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    passWithNoTests: true,
    alias: {
      "@core": resolve(__dirname, "src/core"),
      core: resolve(__dirname, "src/core"),
    },
  },
  resolve: {
    alias: {
      "@core": resolve(__dirname, "src/core"),
      core: resolve(__dirname, "src/core"),
      "@": resolve(__dirname, "src"),
    },
  },
});
