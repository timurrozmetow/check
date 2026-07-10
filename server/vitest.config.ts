import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    // Тесты бьют в общую тестовую БД — выполняем последовательно
    fileParallelism: false,
    env: {
      NODE_ENV: "test",
      DB_NAME: "directorhub_test",
      JWT_SECRET: "test-secret-key-at-least-16-chars",
    },
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.ts"],
  },
});
