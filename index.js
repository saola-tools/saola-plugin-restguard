"use strict";

const plugin = require("devebot").registerLayerware(__dirname, [
  "app-errorlist",
  "app-tracelog",
  "app-webweaver",
  "app-restfetch"
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
