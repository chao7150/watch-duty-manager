/// <reference types="vitest" />
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "~/": `${__dirname}/app/`,
    },
  },
  test: {
    env: {
      DATABASE_URL:
        "mysql://masaki:tsuji@localhost:3307/watch-duty-manager-test?schema=public",
    },
    setupFiles: ["./app/test/integration-setup.ts"],
    include: ["app/adapters/repository/prisma/__tests__/**/*.test.ts"],
    fileParallelism: false,
  },
});
