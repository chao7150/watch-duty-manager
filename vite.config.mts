/// <reference types="vitest" />
// Configure Vitest (https://vitest.dev/config/)
import { reactRouter } from "@react-router/dev/vite";

import tailwindcss from "@tailwindcss/vite";
import fs from "fs";
import { cjsInterop } from "vite-plugin-cjs-interop";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    !process.env.VITEST &&
      reactRouter(),
    tsconfigPaths(),
    cjsInterop({
      dependencies: ["url-from", "react-use", "firebase-admin"],
    }),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // tsconfigのpathと合わせている
      "~/": `${__dirname}/app/`,
    },
  },
  test: {
    include: ["app/**/*.test.ts", "app/**/*.test.tsx"],
    /* for example, use global to avoid globals imports (describe, test, expect): */
    // globals: true,
  },
});
