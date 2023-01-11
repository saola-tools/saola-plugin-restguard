"use strict";

const Devebot = require("devebot");
const chores = Devebot.require("chores");
const lodash = Devebot.require("lodash");
const { momentHelper, tokenHandler } = require("tokenlib");

const { PortletMixiner } = require("app-webserver").require("portlet");

function Service (params = {}) {
  const { packageName, loggingFactory, configPortletifier, webweaverService } = params;

  const blockRef = chores.getBlockRef(__filename, packageName);
  const L = loggingFactory.getLogger();
  const T = loggingFactory.getTracer();

  const pluginConfig = configPortletifier.getPluginConfig();

  PortletMixiner.call(this, {
    pluginConfig,
    portletForwarder: webweaverService,
    portletArguments: { L, T, blockRef },
    PortletConstructor: Portlet,
  });

  // @deprecated
  this.encode = function(data, opts) {
    return this.hasPortlet() && this.getPortlet().encode(data, opts) || undefined;
  }

  // @deprecated
  this.decode = function(token, opts) {
    return this.hasPortlet() && this.getPortlet().decode(token, opts) || undefined;
  }

  // @deprecated
  this.verify = function(token, opts) {
    return this.hasPortlet() && this.getPortlet().verify(token, opts) || undefined;
  }
}

Object.assign(Service.prototype, PortletMixiner.prototype);

function Portlet (params = {}) {
  const { L, T, blockRef, portletConfig } = params;

  const expiresInFieldName = portletConfig.expiresInFieldName || "expiredIn";

  const config = lodash.pick(portletConfig, ["secretKey", "expiresIn", "ignoreExpiration"]);
  config.secretKey = config.secretKey || "t0ps3cr3t";
  config.expiresIn = config.expiresIn || 60 * 60; // expires in 1 hour

  L.has("silly") && L.log("silly", T.add({ blockRef }).toMessage({
    tags: [ blockRef, "constructor" ],
    text: " - toolkit[${blockRef}] is loading"
  }));

  this.encode = function(data, opts) {
    opts = opts || {};
    //
    const secretKey = opts.secretKey || config.secretKey;
    const expiresIn = opts.expiresIn || config.expiresIn;
    const expiredTime = momentHelper.getTimeAfterCurrent(expiresIn);
    //
    const accessObject = Object.assign({}, data, {
      [expiresInFieldName]: expiresIn,
      expiredTime
    });
    //
    const auth = {
      access_token: tokenHandler.encode(accessObject, secretKey, opts, config),
      expires_in: expiresIn,
      expired_time: expiredTime
    };
    //
    return auth;
  };

  this.decode = function(token, opts) {
    opts = opts || {};
    return tokenHandler.decode(token, opts);
  };

  this.verify = function(token, opts) {
    opts = opts || {};
    return tokenHandler.verify(token, opts.secretKey || config.secretKey, opts, config);
  };
}

Service.referenceHash = {
  configPortletifier: "portletifier",
  webweaverService: "app-webweaver/webweaverService",
};

module.exports = Service;
