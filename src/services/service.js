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
  if (sandboxConfig.accessTokenDetailPath) {
    protectedPaths.push(sandboxConfig.accessTokenDetailPath);
  }

  this.buildAccessTokenLayer = function(branches) {
    return {
      name: 'app-restguard-access-token',
      path: protectedPaths,
      middleware: restguardHandler.defineAccessTokenMiddleware(),
      branches: branches,
      skipped: (sandboxConfig.enabled === false)
    }
  }

  this.buildTokenReaderLayer = function(branches) {
    if (sandboxConfig.accessTokenDetailPath) {
      return {
        name: 'app-restguard-token-reader',
        path: sandboxConfig.accessTokenDetailPath,
        middleware: function(req, res, next) {
          if (lodash.isObject(req[sandboxConfig.accessTokenObjectName])) {
            res.json(req[sandboxConfig.accessTokenObjectName]);
          } else {
            res.status(404).send();
          }
        },
        branches: branches,
        skipped: (sandboxConfig.enabled === false)
      }
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
    const layers = [ this.buildAccessTokenLayer() ];
    const detailLayer = this.buildTokenReaderLayer();
    if (detailLayer) {
      layers.push(detailLayer);
    }
    layers.push(this.buildPermCheckerLayer(), childRack);
    webweaverService.push(layers, sandboxConfig.priority);
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
