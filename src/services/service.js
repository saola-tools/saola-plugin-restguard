'use strict';

const Devebot = require('devebot');
const lodash = Devebot.require('lodash');

function Service(params = {}) {
  const { sandboxConfig, restguardHandler, webweaverService } = params;
  const express = webweaverService.express;

  const L = params.loggingFactory.getLogger();
  const T = params.loggingFactory.getTracer();

  let protectedPaths = lodash.get(sandboxConfig, ['protectedPaths']);
  if (lodash.isString(protectedPaths)) protectedPaths = [ protectedPaths ];
  if (!lodash.isArray(protectedPaths)) protectedPaths = [];

  this.buildAccessTokenLayer = function(branches) {
    return {
      name: 'app-restguard-access-token',
      path: protectedPaths,
      middleware: restguardHandler.defineAccessTokenMiddleware(),
      branches: branches,
      skipped: (sandboxConfig.enabled === false)
    }
  }

  this.buildPermCheckerLayer = function(branches) {
    return {
      name: 'app-restguard-authorization',
      middleware: restguardHandler.definePermCheckerMiddleware(),
      branches: branches,
      skipped: (sandboxConfig.enabled === false)
    }
  }

  let childRack = null;
  if (sandboxConfig.autowired !== false) {
    childRack = childRack || {
      name: 'app-restguard-branches',
      middleware: express()
    };
    webweaverService.push([
      this.buildAccessTokenLayer(),
      this.buildPermCheckerLayer(),
      childRack
    ], sandboxConfig.priority);
  }

  this.push = function(layerOrBranches) {
    if (childRack) {
      L.has('silly') && L.log('silly', ' - push layer(s) to %s', childRack.name);
      webweaverService.wire(childRack.middleware, layerOrBranches, childRack.trails);
    }
  }
}

Service.referenceHash = {
  restguardHandler: 'handler',
  webweaverService: 'app-webweaver/webweaverService'
};

module.exports = Service;
