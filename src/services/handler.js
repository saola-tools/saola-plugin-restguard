"use strict";

const Devebot = require("devebot");
const Promise = Devebot.require("bluebird");
const chores = Devebot.require("chores");
const lodash = Devebot.require("lodash");
const { tokenHandler } = require("tokenlib");

const portlet = require("app-webserver").require("portlet");
const { PORTLETS_COLLECTION_NAME, PortletMixiner } = portlet;

const nodash = require("../utils/chores");

const JWT_TokenExpiredError = "TokenExpiredError";
const JWT_JsonWebTokenError = "JsonWebTokenError";

const REG_TokenExpiredError = "TokenExpiredError";
const REG_JsonWebTokenError = "JsonWebTokenError";
const REG_TokenNotFoundError = "TokenNotFoundError";
const REG_JwtUnknownError = "JwtVerifyUnknownError";
const REG_InsufficientError = "InsufficientError";

function Handler (params = {}) {
  const { configPortletifier, packageName, loggingFactory } = params;
  const { errorManager, permissionChecker, tracelogService } = params;

  const pluginConfig = configPortletifier.getPluginConfig();

  PortletMixiner.call(this, {
    portletDescriptors: lodash.get(pluginConfig, PORTLETS_COLLECTION_NAME),
    portletReferenceHolders: { tracelogService },
    portletArguments: { packageName, loggingFactory, errorManager, permissionChecker },
    PortletConstructor: Portlet,
  });

  this.definePermCheckerMiddleware = function () {
    return this.hasPortlet() && this.getPortlet().definePermCheckerMiddleware() || undefined;
  };

  this.defineAccessTokenMiddleware = function () {
    return this.hasPortlet() && this.getPortlet().defineAccessTokenMiddleware() || undefined;
  };

  this.verifyAccessToken = function (req, { promiseEnabled }) {
    return this.hasPortlet() && this.getPortlet().verifyAccessToken(req, { promiseEnabled }) || undefined;
  };
}

Object.assign(Handler.prototype, PortletMixiner.prototype);

function Portlet (params = {}) {
  const { packageName, loggingFactory, portletConfig, portletName } = params;
  const { errorManager, permissionChecker, tracelogService } = params;

  const L = loggingFactory.getLogger();
  const T = loggingFactory.getTracer();
  const blockRef = chores.getBlockRef(__filename, packageName);

  L && L.has("silly") && L.log("silly", T && T.add({ portletName }).toMessage({
    tags: [ blockRef ],
    text: "The Portlet[${portletName}] is available"
  }));

  const bypassingRules = extractBypassingRules(portletConfig);
  L && L.has("silly") && L.log("silly", T && T.add({ bypassingRules }).toMessage({
    tmpl: "The bypassingRules: ${bypassingRules}"
  }));

  const errorBuilder = errorManager.register(packageName, {
    errorCodes: portletConfig.errorCodes
  });

  const secretKeys = [];
  if (lodash.isString(portletConfig.secretKey)) {
    secretKeys.push(portletConfig.secretKey);
  }
  const sandboxConfig_deprecatedKeys = nodash.stringToArray(portletConfig.deprecatedKeys);
  if (lodash.isArray(sandboxConfig_deprecatedKeys)) {
    for (const deprecatedKey of sandboxConfig_deprecatedKeys) {
      if (deprecatedKey !== portletConfig.secretKey) {
        secretKeys.push(deprecatedKey);
      }
    }
  }

  const serviceContext = { L, T, portletConfig, secretKeys, errorBuilder, tracelogService };

  this.definePermCheckerMiddleware = function () {
    return function (req, res, next) {
      if (portletConfig.enabled === false) {
        return next();
      }
      if (req[portletConfig.allowPublicAccessName]) {
        return next();
      }
      const passed = permissionChecker.checkPermissions(req);
      passed.then(passed => {
        if (passed === null) return next();
        if (passed) return next();
        processError(res, errorBuilder.newError(REG_InsufficientError, {
          language: extractLangCode(req)
        }));
      });
    };
  };

  this.defineAccessTokenMiddleware = function () {
    const self = this;
    return function (req, res, next) {
      if (portletConfig.enabled === false) {
        return next();
      }
      if (req[portletConfig.allowPublicAccessName]) {
        return next();
      }
      if (isBypassed(req, bypassingRules)) {
        return next();
      }
      return self.verifyAccessToken(req, { promiseEnabled: true })
      .then(function () {
        next();
      })
      .catch(function (err) {
        processError(res, err);
      });
    };
  };

  this.verifyAccessToken = function (req, { promiseEnabled }) {
    const result = verifyAccessToken(req, serviceContext);
    if (promiseEnabled) {
      if (result.error) {
        return Promise.reject(result.error);
      }
      return Promise.resolve(result.token);
    } else {
      return result;
    }
  };
}

Handler.referenceHash = {
  configPortletifier: "portletifier",
  permissionChecker: "checker",
  errorManager: "app-errorlist/manager",
  tracelogService: "app-tracelog/tracelogService",
};

function extractLangCode (req) {
  return req.get("X-Lang-Code") || req.get("X-Language-Code") || req.get("X-Language");
}

const RULE_FIELD_HOSTNAMES = "hostnames";
const RULE_FIELD_IPS = "ips";

function extractBypassingRules (portletConfig) {
  let bypassingRules = lodash.get(portletConfig, ["bypassingRules"], {});
  bypassingRules = lodash.pick(bypassingRules, ["enabled", "exclusion", "inclusion"]);
  for (const filterName of ["exclusion", "inclusion"]) {
    for (const ruleName of [RULE_FIELD_HOSTNAMES, RULE_FIELD_IPS]) {
      if (bypassingRules[filterName]) {
        const ruleValue = bypassingRules[filterName][ruleName];
        if (lodash.isArray(ruleValue)) {
          continue;
        }
        if (lodash.isString(ruleValue)) {
          if (ruleName === RULE_FIELD_HOSTNAMES) {
            bypassingRules[filterName][ruleName] = new RegExp(ruleValue);
            continue;
          }
        }
        if (ruleValue instanceof RegExp) {
          if (ruleName === RULE_FIELD_HOSTNAMES) {
            continue;
          }
        }
        bypassingRules[filterName][ruleName] = null;
      }
    }
  }
  return bypassingRules;
}

function matchFilter (req, bypassingFilter) {
  let matched = false;
  if (bypassingFilter) {
    if (bypassingFilter[RULE_FIELD_HOSTNAMES]) {
      if (bypassingFilter[RULE_FIELD_HOSTNAMES] instanceof RegExp) {
        if (typeof req.hostname === "string") {
          if (req.hostname.match(bypassingFilter[RULE_FIELD_HOSTNAMES])) {
            matched = true;
          }
        }
      }
      if (!matched && Array.isArray(bypassingFilter[RULE_FIELD_HOSTNAMES])) {
        if (bypassingFilter[RULE_FIELD_HOSTNAMES].indexOf(req.hostname) >= 0) {
          matched = true;
        }
      }
    }
    if (!matched && bypassingFilter[RULE_FIELD_IPS]) {
      if (Array.isArray(bypassingFilter[RULE_FIELD_IPS])) {
        if (bypassingFilter[RULE_FIELD_IPS].indexOf(req.ip) >= 0) {
          matched = true;
        }
      }
    }
  }
  return matched;
}

function isBypassed (req, bypassingRules) {
  if (bypassingRules.enabled === false) {
    return false;
  }

  let incl = null;
  if ("inclusion" in bypassingRules) {
    if (matchFilter(req, bypassingRules["inclusion"])) {
      incl = true;
    } else {
      incl = false;
    }
  }

  let excl = null;
  if ("exclusion" in bypassingRules) {
    if (matchFilter(req, bypassingRules["exclusion"])) {
      excl = true;
    } else {
      excl = false;
    }
  }

  if (incl === null && excl === null) {
    return false;
  }
  if (incl === null) {
    return !excl;
  }
  if (excl === null) {
    return incl;
  }
  return incl && !excl;
}

function processError (res, err) {
  if (err.packageRef) {
    res.set("X-Package-Ref", err.packageRef);
  }
  if (err.returnCode) {
    res.set("X-Return-Code", err.returnCode);
  }
  const body = {
    name: err.name,
    message: err.message
  };
  if (err.payload) {
    body.payload = err.payload;
  }
  res.status(err.statusCode || 500).send(body);
}

function verifyAccessToken (req, serviceContext) {
  const { secretKeys, portletConfig, errorBuilder, tracelogService, L, T } = serviceContext;
  const requestId = tracelogService.getRequestId(req);
  L.has("silly") && L.log("silly", T.add({ requestId }).toMessage({
    tmpl: "Req[${requestId}] - check header/url-params/post-body for access-token"
  }));
  function trySecretKey (token, tokenOpts, secretKey) {
    try {
      let tokenObject = tokenHandler.verify(token, secretKey, tokenOpts);
      L.has("debug") && L.log("debug", T.add({ requestId, tokenObject }).toMessage({
        tmpl: "Req[${requestId}] - Verification passed, token: ${tokenObject}"
      }));
      if (lodash.isFunction(portletConfig.accessTokenTransform)) {
        tokenObject = portletConfig.accessTokenTransform(tokenObject);
        L.has("debug") && L.log("debug", T.add({ requestId, tokenObject }).toMessage({
          tmpl: "Req[${requestId}] - transformed token: ${tokenObject}"
        }));
      }
      req[portletConfig.accessTokenObjectName] = tokenObject;
      return { token: tokenObject };
    } catch (error) {
      const language = extractLangCode(req);
      L.has("debug") && L.log("debug", T.add({
        requestId,
        language,
        error: { name: error.name, message: error.message }
      }).toMessage({
        tmpl: "Req[${requestId}] - Verification failed, error: ${error}"
      }));
      if (error.name === JWT_TokenExpiredError) {
        return {
          error: errorBuilder.newError(REG_TokenExpiredError, { language })
        };
      }
      if (error.name === JWT_JsonWebTokenError) {
        return {
          error: errorBuilder.newError(REG_JsonWebTokenError, { language })
        };
      }
      return {
        error: errorBuilder.newError(REG_JwtUnknownError, { language })
      };
    }
  }
  let token = req.get(portletConfig.accessTokenHeaderName) ||
      req.query[portletConfig.accessTokenParamsName] ||
      req.params[portletConfig.accessTokenParamsName] ||
      (req.body && req.body[portletConfig.accessTokenParamsName]);
  if (token) {
    L.has("debug") && L.log("debug", T.add({ requestId, token }).toMessage({
      tmpl: "Req[${requestId}] - access-token found: [${token}]"
    }));
    let tokenOpts = {
      ignoreExpiration: portletConfig.ignoreExpiration || false
    };
    L.has("debug") && L.log("debug", T.add({ requestId, tokenOpts }).toMessage({
      tmpl: "Req[${requestId}] - Call tokenHandler.verify() with options: ${tokenOpts}"
    }));
    let result;
    for (const secretKey of secretKeys) {
      result = trySecretKey(token, tokenOpts, secretKey);
      if (!(result && result.error && result.error.name === REG_JsonWebTokenError)) {
        break;
      }
    }
    return result;
  } else {
    const language = extractLangCode(req);
    L.has("debug") && L.log("debug", T.add({ requestId }).toMessage({
      tmpl: "Req[${requestId}] - access-token not found"
    }));
    return {
      error: errorBuilder.newError(REG_TokenNotFoundError, { language })
    };
  }
}

module.exports = Handler;
