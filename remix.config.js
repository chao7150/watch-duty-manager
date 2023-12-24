/**
 * @type {import('@remix-run/dev').AppConfig}
 */
module.exports = {
  appDirectory: "app",
  assetsBuildDirectory: "public/build",
  publicPath:
    process.env.NODE_ENV === "production"
      ? "https://d1tczfrjg2qmw6.cloudfront.net/build/"
      : "/build/",
  serverBuildPath: "build/index.js",
  serverModuleFormat: "cjs",
  devServerPort: 8002,
  ignoredRouteFiles: ["**/*.test.ts"],
  tailwind: true,
};
