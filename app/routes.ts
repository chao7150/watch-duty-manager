import type { RouteConfig } from "@react-router/dev/routes";
import { flatRoutes } from "@react-router/fs-routes";

export default (await flatRoutes({
  ignoredRouteFiles: ["**/*.test.ts"],
})) satisfies RouteConfig;
