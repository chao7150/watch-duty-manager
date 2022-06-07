/// <reference types="vitest" />

// Configure Vitest (https://vitest.dev/config/)

import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    alias: {
      // tsconfigのpathと合わせている
      "~/": `${__dirname}/app/`,
    },
  },
  test: {
    /* for example, use global to avoid globals imports (describe, test, expect): */
    // globals: true,
  },
});
