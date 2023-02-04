"use strict";

const Devebot = require("@saola/core");
const lodash = Devebot.require("lodash");

function Example (params = {}) {
  const { sandboxConfig, loggingFactory, restguardService, webweaverService } = params;
  const L = params.loggingFactory.getLogger();
  const T = params.loggingFactory.getTracer();

  const express = webweaverService.express;
  const contextPath = sandboxConfig.contextPath || "/example";
  const layers = [];

  const router_jwt = express.Router();
  router_jwt.route("/authorized").get(function(req, res, next) {
    L.has("silly") && L.log("silly", T && T.toMessage({
      text: " - request /jwt/authorized ..."
    }));
    res.json({ status: 200, message: "authorized" });
  });
  router_jwt.route("/session-info").get(function(req, res, next) {
    if (lodash.isObject(req[sandboxConfig.accessTokenObjectName])) {
      res.json(req[sandboxConfig.accessTokenObjectName]);
    } else {
      res.status(404).json({});
    }
  });
  router_jwt.route("/*").get(function(req, res, next) {
    L.has("silly") && L.log("silly", " - request /jwt public resources ...");
    res.json({ status: 200, message: "public" });
  });
  //
  layers.push({
    name: "saola-plugin-restguard-example-jwt",
    path: contextPath + "/jwt",
    middleware: router_jwt
  });
  //
  restguardService.push(webweaverService.getPrintRequestInfoLayer(layers));
}

Example.referenceHash = {
  restguardService: "@saola/plugin-restguard/service",
  webweaverService: "@saola/plugin-webweaver/webweaverService"
};

module.exports = Example;
