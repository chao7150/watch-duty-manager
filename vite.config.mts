/// <reference types="vitest" />
// Configure Vitest (https://vitest.dev/config/)
import { vitePlugin as remix } from "@remix-run/dev";
import { installGlobals } from "@remix-run/node";

import tailwindcss from "tailwindcss";
import { defineConfig } from "vite";
import { cjsInterop } from "vite-plugin-cjs-interop";
import tsconfigPaths from "vite-tsconfig-paths";
import fs from "fs";

declare module "@remix-run/server-runtime" {
  interface Future {
    v3_singleFetch: true;
  }
}

installGlobals();

export default defineConfig({
  plugins: [
    !process.env.VITEST &&
      remix({
        ignoredRouteFiles: ["**/*.test.ts"],
        future: {
          v3_singleFetch: true,
          v3_fetcherPersist: true,
          v3_lazyRouteDiscovery: true,
          v3_relativeSplatPath: true,
          v3_throwAbortReason: true,
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
  ...(process.env.NODE_ENV === "development" && {
    server: {
      allowedHosts: ["app"],
      host: true,
      port: 5173,
      https: {
        key: fs.readFileSync("./.devcontainer/key.pem"),
        cert: fs.readFileSync("./.devcontainer/cert.pem"),
      },
      hmr: { host: "app", protocol: "wss", clientPort: 5137 }
    },
  }),
});
