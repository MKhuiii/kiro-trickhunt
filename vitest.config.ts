import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  // tsconfig uses jsx "preserve" (Next.js); tests need the automatic runtime.
  esbuild: { jsx: "automatic" },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    exclude: ["e2e/**", "node_modules/**", ".next/**"],
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
