/// <reference types="vitest" />
// Configure Vitest (https://vitest.dev/config/)
import { vitePlugin as remix } from "@remix-run/dev";
import { installGlobals } from "@remix-run/node";

import tailwindcss from "tailwindcss";
import { defineConfig } from "vite";
import { cjsInterop } from "vite-plugin-cjs-interop";
import tsconfigPaths from "vite-tsconfig-paths";

declare module "@remix-run/server-runtime" {
  interface Future {
    v3_singleFetch: true;
  }
}

installGlobals();

export default defineConfig({
  plugins: [
    remix({
      ignoredRouteFiles: ["**/*.test.ts"],
      future: {
        v3_singleFetch: true,
      },
    }),
    tsconfigPaths(),
    cjsInterop({
      dependencies: ["url-from", "react-use", "firebase-admin"],
    }),
  ],
  css: {
    postcss: {
      plugins: [tailwindcss()],
    },
  },
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
