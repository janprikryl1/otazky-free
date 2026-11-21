import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // překlad aliasu "@/..." podle tsconfig.json
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    setupFiles: ["src/test/setup.ts"],
    restoreMocks: true,
  },
});
