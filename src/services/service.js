"use strict";

const Devebot = require("@saola/core");
const chores = Devebot.require("chores");
const lodash = Devebot.require("lodash");

const { PortletMixiner } = require("@saola/plugin-webserver").require("portlet");

function Service (params = {}) {
  const { configPortletifier, packageName, loggingFactory } = params;
  const { restguardHandler, webweaverService } = params;

  const express = webweaverService.express;

  PortletMixiner.call(this, {
    portletBaseConfig: configPortletifier.getPortletBaseConfig(),
    portletDescriptors: configPortletifier.getPortletDescriptors(),
    portletReferenceHolders: { restguardHandler, webweaverService },
    portletArguments: { packageName, loggingFactory, express },
    PortletConstructor: Portlet,
  });

  // @deprecated
  this.buildAllowPublicLayer = function(branches) {
    return this.hasPortlet() && this.getPortlet().buildAllowPublicLayer(branches) || undefined;
  };

  // @deprecated
  this.buildAccessTokenLayer = function(branches) {
    return this.hasPortlet() && this.getPortlet().buildAccessTokenLayer(branches) || undefined;
  };

  // @deprecated
  this.buildTokenReaderLayer = function(branches) {
    return this.hasPortlet() && this.getPortlet().buildTokenReaderLayer(branches) || undefined;
  };

  // @deprecated
  this.buildPermCheckerLayer = function(branches) {
    return this.hasPortlet() && this.getPortlet().buildPermCheckerLayer(branches) || undefined;
  };

  // @deprecated
  this.push = function(layerOrBranches) {
    return this.hasPortlet() && this.getPortlet().push(layerOrBranches) || undefined;
  };
}

Object.assign(Service.prototype, PortletMixiner.prototype);

function Portlet (params = {}) {
  const { packageName, loggingFactory, portletName, portletConfig, restguardHandler, webweaverService, express } = params;

  const L = loggingFactory.getLogger();
  const T = loggingFactory.getTracer();
  const blockRef = chores.getBlockRef(__filename, packageName);

  L && L.has("silly") && L.log("silly", T && T.add({ portletName }).toMessage({
    tags: [ blockRef ],
    text: "The Portlet[${portletName}] is loading"
  }));

  const publicPaths = lodash.get(portletConfig, ["publicPaths"], []);

  let protectedPaths = lodash.get(portletConfig, ["protectedPaths"]);
  if (lodash.isString(protectedPaths)) protectedPaths = [ protectedPaths ];
  if (!lodash.isArray(protectedPaths)) protectedPaths = [];
  if (portletConfig.accessTokenDetailPath) {
    protectedPaths.push(portletConfig.accessTokenDetailPath);
  }

  this.buildAllowPublicLayer = function(branches) {
    if (lodash.isEmpty(publicPaths)) {
      L && L.has("silly") && L.log("silly", T && T.add({ publicPaths }).toMessage({
        tmpl: "publicPaths ${publicPaths} is empty, skipped"
      }));
      return null;
    }
    L && L.has("silly") && L.log("silly", T && T.add({ publicPaths }).toMessage({
      tmpl: "publicPaths ${publicPaths} is applied"
    }));
    return {
      name: "saola-plugin-restguard-allow-public",
      path: publicPaths,
      middleware: function (req, res, next) {
        req[portletConfig.allowPublicAccessName] = true;
        next();
      },
      branches: branches,
      skipped: (portletConfig.enabled === false)
    };
  };

  this.buildAccessTokenLayer = function(branches) {
    return {
      name: "saola-plugin-restguard-access-token",
      path: protectedPaths,
      middleware: restguardHandler.defineAccessTokenMiddleware(),
      branches: branches,
      skipped: (portletConfig.enabled === false)
    };
  };

  this.buildTokenReaderLayer = function(branches) {
    if (portletConfig.accessTokenDetailPath) {
      return {
        name: "saola-plugin-restguard-token-reader",
        path: portletConfig.accessTokenDetailPath,
        middleware: function(req, res, next) {
          if (lodash.isObject(req[portletConfig.accessTokenObjectName])) {
            res.json(req[portletConfig.accessTokenObjectName]);
          } else {
            res.status(404).send();
          }
        },
        branches: branches,
        skipped: (portletConfig.enabled === false)
      };
    }
  };

  this.buildPermCheckerLayer = function(branches) {
    return {
      name: "saola-plugin-restguard-authorization",
      middleware: restguardHandler.definePermCheckerMiddleware(),
      branches: branches,
      skipped: (portletConfig.enabled === false)
    };
  };

  let childRack = null;
  if (portletConfig.autowired !== false) {
    childRack = childRack || {
      name: "saola-plugin-restguard-branches",
      middleware: express.Router()
    };
    //
    const layers = [];
    // public resource layer
    const publicLayer = this.buildAllowPublicLayer();
    if (publicLayer) {
      layers.push(publicLayer);
    }
    // access-token checker
    const accessTokenLayer = this.buildAccessTokenLayer();
    if (accessTokenLayer) {
      layers.push(accessTokenLayer);
    }
    // get the details of access-token
    const detailLayer = this.buildTokenReaderLayer();
    if (detailLayer) {
      layers.push(detailLayer);
    }
    // permissions checker
    layers.push(this.buildPermCheckerLayer(), childRack);
    //
    webweaverService.push(layers, portletConfig.priority);
  }

  this.push = function(layerOrBranches) {
    if (childRack) {
      L.has("silly") && L.log("silly", " - push layer(s) to %s", childRack.name);
      webweaverService.wire(childRack.middleware, layerOrBranches, childRack.trails);
    }
  };
}

Service.referenceHash = {
  configPortletifier: "portletifier",
  restguardHandler: "handler",
  webweaverService: "@saola/plugin-webweaver/webweaverService"
};

module.exports = Service;
