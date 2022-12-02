'use strict';

const plugin = require('devebot').registerLayerware(__dirname, [
  'app-errorlist',
  'app-tracelog',
  'app-webweaver',
  'app-restfetch'
], []);

const moduleMapping = {
  helper: './lib/utils/chores.js'
}

plugin.require = function (moduleName) {
  if (moduleName in moduleMapping) {
    return require(moduleMapping[moduleName]);
  }
  return null;
}

module.exports = plugin;
