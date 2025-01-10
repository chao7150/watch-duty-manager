/// <reference types="vitest" />
// Configure Vitest (https://vitest.dev/config/)
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { installGlobals } from "@remix-run/node";
import { vitePlugin as remix } from "@remix-run/dev";
import { cjsInterop } from "vite-plugin-cjs-interop";
import tailwindcss from "tailwindcss";

installGlobals();

export default defineConfig({
  plugins: [
    remix({
      ignoredRouteFiles: ["**/*.test.ts"],
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
