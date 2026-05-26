/// <reference types="vitest" />
// Configure Vitest (https://vitest.dev/config/)
import { reactRouter } from "@react-router/dev/vite";

import tailwindcss from "@tailwindcss/vite";
import { cjsInterop } from "vite-plugin-cjs-interop";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    !process.env.VITEST && reactRouter(),
    cjsInterop({
      dependencies: ["url-from", "react-use", "firebase-admin"],
    }),
    tailwindcss(),
  ],
  resolve: {
    tsconfigPaths: true,
    alias: {
      // tsconfigのpathと合わせている
      "~/": `${__dirname}/app/`,
    },
  },
  test: {
    include: ["app/**/*.test.ts", "app/**/*.test.tsx"],
    exclude: ["app/adapters/repository/prisma/__tests__/**"],
    /* for example, use global to avoid globals imports (describe, test, expect): */
    // globals: true,
  },
});
