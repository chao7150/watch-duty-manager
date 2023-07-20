/**
 * @type {import('@remix-run/dev').AppConfig}
 */
module.exports = {
  appDirectory: "app",
  assetsBuildDirectory: "public/build",
  publicPath: "/build/",
  serverBuildPath: "build/index.js",
  devServerPort: 8002,
  ignoredRouteFiles: ["**/*.test.ts"],
  future: {
    v2_meta: true,
    v2_errorBoundary: true,
    v2_normalizeFormMethod: true,
  },
  tailwind: true,
};
