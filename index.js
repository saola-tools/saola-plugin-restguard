'use strict';

var plugin = require('devebot').registerLayerware(__dirname, [
  'app-errorlist',
  'app-tracelog',
  'app-webweaver',
  'app-restfetch'
], []);

var moduleMapping = {
  helper: './lib/utils/chores.js'
}

plugin.require = function (moduleName) {
  if (moduleName in moduleMapping) {
    return require(moduleMapping[moduleName]);
  }
  return null;
}

module.exports = plugin;
