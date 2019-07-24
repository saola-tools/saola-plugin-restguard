'use strict';

const Devebot = require('devebot');
const lodash = Devebot.require('lodash');
const path = require('path');

function Service(params = {}) {
  const { sandboxConfig, restguardHandler, webweaverService } = params;
  const contextPath = sandboxConfig.contextPath || '/restguard';
  const apiPath = sandboxConfig.apiPath || '';
  const apiFullPath = path.join(contextPath, apiPath);
  const express = webweaverService.express;

  const jwtCfg = lodash.get(sandboxConfig, ['jwt'], {});

  const L = params.loggingFactory.getLogger();
  const T = params.loggingFactory.getTracer();

  this.buildAccessTokenLayer = function(branches) {
    const seqVerifier = new express();
    seqVerifier.use(jwtCfg.protectedPaths, restguardHandler.defineAccessTokenMiddleware());
    return {
      name: 'app-restguard-checker',
      middleware: seqVerifier,
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
      childRack
    ], sandboxConfig.priority);
  }

  this.inject = this.push = function(layerOrBranches) {
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
