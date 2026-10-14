import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["node_modules", ".next"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // "server-only" lanza error fuera de React Server; en tests se reemplaza por un módulo vacío
      "server-only": path.resolve(__dirname, "test/server-only-stub.ts"),
    },
  },
});
