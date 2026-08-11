import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node --experimental-strip-types prisma/seed.ts",
  },
  // datasource は migration / introspection 系コマンドでのみ必須。
  // Docker ビルド時の prisma generate では DATABASE_URL が存在しないため、その場合は省略する
  datasource: process.env.DATABASE_URL
    ? { url: env("DATABASE_URL") }
    : undefined,
});
