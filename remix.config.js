/** @type {import('@remix-run/dev').AppConfig} */
module.exports = {
  ignoredRouteFiles: ["**/.*"],
  appDirectory: "app",
  serverModuleFormat: "cjs",
  future: {
    v2_errorBoundary: false,
    v2_meta: false,
    v2_normalizeFormMethod: false,
    v2_routeConvention: false,
  },
};
