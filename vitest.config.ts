import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    environment: "node",
    setupFiles: ["tests/setup.ts"],
    // Интеграционные тесты ходят в одну базу: параллельный запуск файлов мешал бы друг другу.
    fileParallelism: false,
  },
});
