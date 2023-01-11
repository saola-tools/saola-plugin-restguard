"use strict";

const Devebot = require("devebot");
const lodash = Devebot.require("lodash");

const { PortletMixiner } = require("app-webserver").require("portlet");

function Service (params = {}) {
  const { configPortletifier, loggingFactory } = params;
  const { restguardHandler, webweaverService } = params;

  const L = loggingFactory.getLogger();
  const T = loggingFactory.getTracer();

  const pluginConfig = configPortletifier.getPluginConfig();

  PortletMixiner.call(this, {
    pluginConfig,
    portletForwarder: webweaverService,
    portletArguments: { L, T, restguardHandler, webweaverService },
    PortletConstructor: Portlet,
  });

  // @deprecated
  this.buildAllowPublicLayer = function(branches) {
    return this.hasPortlet() && this.getPortlet().buildAllowPublicLayer(branches) || undefined;
  }

  // @deprecated
  this.buildAccessTokenLayer = function(branches) {
    return this.hasPortlet() && this.getPortlet().buildAccessTokenLayer(branches) || undefined;
  }

  // @deprecated
  this.buildTokenReaderLayer = function(branches) {
    return this.hasPortlet() && this.getPortlet().buildTokenReaderLayer(branches) || undefined;
  }

  // @deprecated
  this.buildPermCheckerLayer = function(branches) {
    return this.hasPortlet() && this.getPortlet().buildPermCheckerLayer(branches) || undefined;
  }

  // @deprecated
  this.push = function(layerOrBranches) {
    return this.hasPortlet() && this.getPortlet().push(layerOrBranches) || undefined;
  }
}

Object.assign(Service.prototype, PortletMixiner.prototype);

function Portlet (params = {}) {
  const { L, T, portletName, portletConfig, restguardHandler, webweaverService } = params;
  const express = webweaverService.express;

  const publicPaths = lodash.get(portletConfig, ["publicPaths"], []);

  let protectedPaths = lodash.get(portletConfig, ["protectedPaths"]);
  if (lodash.isString(protectedPaths)) protectedPaths = [ protectedPaths ];
  if (!lodash.isArray(protectedPaths)) protectedPaths = [];
  if (portletConfig.accessTokenDetailPath) {
    protectedPaths.push(portletConfig.accessTokenDetailPath);
  }

  this.buildAllowPublicLayer = function(branches) {
    if (lodash.isEmpty(publicPaths)) {
      L.has("silly") && L.log("silly", T.add({ publicPaths }).toMessage({
        tmpl: "publicPaths ${publicPaths} is empty, skipped"
      }));
      return null;
    }
    L.has("silly") && L.log("silly", T.add({ publicPaths }).toMessage({
      tmpl: "publicPaths ${publicPaths} is applied"
    }));
    return {
      name: "app-restguard-allow-public",
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
    if (restguardHandler.hasPortlet(portletName)) {
      const handlerPortlet = restguardHandler.getPortlet(portletName);
      return {
        name: "app-restguard-access-token",
        path: protectedPaths,
        middleware: handlerPortlet && handlerPortlet.defineAccessTokenMiddleware(),
        branches: branches,
        skipped: (portletConfig.enabled === false)
      };
    }
  };

  this.buildTokenReaderLayer = function(branches) {
    if (portletConfig.accessTokenDetailPath) {
      return {
        name: "app-restguard-token-reader",
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
    if (restguardHandler.hasPortlet(portletName)) {
      const handlerPortlet = restguardHandler.getPortlet(portletName);
      return {
        name: "app-restguard-authorization",
        middleware: handlerPortlet && handlerPortlet.definePermCheckerMiddleware(),
        branches: branches,
        skipped: (portletConfig.enabled === false)
      };
    }
  };

  let childRack = null;
  if (portletConfig.autowired !== false && webweaverService.hasPortlet(portletName)) {
    childRack = childRack || {
      name: "app-restguard-branches",
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
    webweaverService.getPortlet(portletName).push(layers, portletConfig.priority);
  }

  this.push = function(layerOrBranches) {
    if (childRack && webweaverService.hasPortlet(portletName)) {
      L.has("silly") && L.log("silly", " - push layer(s) to %s", childRack.name);
      webweaverService.getPortlet(portletName).wire(childRack.middleware, layerOrBranches, childRack.trails);
    }
  };
}

Service.referenceHash = {
  configPortletifier: "portletifier",
  restguardHandler: "handler",
  webweaverService: "app-webweaver/webweaverService"
};

module.exports = Service;
