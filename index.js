"use strict";

const plugin = require("@saola/core").registerLayerware(__dirname, [
  "@saola/plugin-errorlist",
  "@saola/plugin-logtracer",
  "@saola/plugin-webweaver",
  "@saola/plugin-restfetch"
], []);

const moduleMapping = {
  helper: require("./lib/utils/chores.js")
};

plugin.require = function (moduleName) {
  if (moduleName in moduleMapping) {
    return moduleMapping[moduleName];
  }
  return null;
};

module.exports = plugin;
