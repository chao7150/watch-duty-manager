/**
 * @type {import('@remix-run/dev/config').AppConfig}
 */
module.exports = {
  appDirectory: "app",
  browserBuildDirectory: "public/build",
  publicPath: "/build/",
  serverBuildPath: "build/index.js",
  devServerPort: 8002,
  ignoredRouteFiles: ["**/*.test.ts"],
};
