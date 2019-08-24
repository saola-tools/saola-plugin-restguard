'use strict';

const Devebot = require('devebot');
const Promise = Devebot.require('bluebird');
const lodash = Devebot.require('lodash');
const jwt = require('jsonwebtoken');

function Handler(params = {}) {
  const { loggingFactory, packageName, sandboxConfig } = params;
  const { errorManager, tracelogService, permissionChecker } = params;

  const L = loggingFactory.getLogger();
  const T = loggingFactory.getTracer();

  const bypassingRules = extractBypassingRules(sandboxConfig);

  const errorBuilder = errorManager.register(packageName, {
    errorCodes: sandboxConfig.errorCodes
  });

  this.definePermCheckerMiddleware = function () {
    return function (req, res, next) {
      if (sandboxConfig.enabled === false) {
        return next();
      }
      if (req[sandboxConfig.allowPublicAccessName]) {
        return next();
      }
      const passed = permissionChecker.checkPermissions(req);
      if (passed === null) return next();
      if (passed) return next();
      processError(res, errorBuilder.newError('InsufficientError', {
        language: extractLangCode(req)
      }));
    }
  }

  this.defineAccessTokenMiddleware = function () {
    const self = this;
    return function (req, res, next) {
      if (sandboxConfig.enabled === false) {
        return next();
      }
      if (req[sandboxConfig.allowPublicAccessName]) {
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
    }
  }

  this.verifyAccessToken = function (req, { promiseEnabled }) {
    const result = verifyAccessToken(req, sandboxConfig, errorBuilder, tracelogService, L, T);
    if (promiseEnabled) {
      if (result.error) {
        return Promise.reject(result.error);
      }
      return Promise.resolve(result.token);
    } else {
      return result;
    }
  }
}

Handler.referenceHash = {
  permissionChecker: 'checker',
  tracelogService: 'app-tracelog/tracelogService',
  errorManager: 'app-errorlist/manager',
};

module.exports = Handler;

function extractLangCode (req) {
  return req.get('X-Lang-Code') || req.get('X-Language-Code') || req.get('X-Language');
}

const RULE_FIELD_HOSTNAMES = 'hostnames';
const RULE_FIELD_IPS = 'ips';

function extractBypassingRules (sandboxConfig) {
  let bypassingRules = lodash.get(sandboxConfig, ['bypassingRules'], {});
  bypassingRules = lodash.pick(bypassingRules, ['enabled', 'exclusion', 'inclusion']);
  for (const filterName of ['exclusion', 'inclusion']) {
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
    };
  }
  return bypassingRules;
}

function matchFilter (req, bypassingFilter) {
  let matched = false;
  if (bypassingFilter) {
    if (bypassingFilter[RULE_FIELD_HOSTNAMES]) {
      if (bypassingFilter[RULE_FIELD_HOSTNAMES] instanceof RegExp) {
        if (typeof req.hostname === 'string') {
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
  if ('inclusion' in bypassingRules) {
    if (matchFilter(req, bypassingRules['inclusion'])) {
      incl = true;
    } else {
      incl = false;
    }
  }

  let excl = null;
  if ('exclusion' in bypassingRules) {
    if (!matchFilter(req, bypassingRules['exclusion'])) {
      excl = true;
    } else {
      excl = false;
    }
  }

  if (incl === null && excl === null) {
    return false;
  }
  if (incl === null) {
    return excl;
  }
  if (excl === null) {
    return incl;
  }
  return incl && excl;
}

function processError (res, err) {
  if (err.packageRef) {
    res.set('X-Package-Ref', err.packageRef);
  }
  if (err.returnCode) {
    res.set('X-Return-Code', err.returnCode);
  }
  const body = {
    name: err.name,
    message: err.message
  }
  if (err.payload) {
    body.payload = err.payload;
  }
  res.status(err.statusCode || 500).send(body);
}

const verifyAccessToken = function (req, sandboxConfig, errorBuilder, tracelogService, L, T) {
  const requestId = tracelogService.getRequestId(req);
  L.has('silly') && L.log('silly', T.add({ requestId }).toMessage({
    tmpl: 'Req[${requestId}] - check header/url-params/post-body for access-token'
  }));
  let token = req.get(sandboxConfig.accessTokenHeaderName) ||
      req.query[sandboxConfig.accessTokenParamsName] ||
      req.params[sandboxConfig.accessTokenParamsName] ||
      (req.body && req.body[sandboxConfig.accessTokenParamsName]);
  if (token) {
    L.has('debug') && L.log('debug', T.add({ requestId, token }).toMessage({
      tmpl: 'Req[${requestId}] - access-token found: [${token}]'
    }));
    let tokenOpts = {
      ignoreExpiration: sandboxConfig.ignoreExpiration || false
    };
    L.has('debug') && L.log('debug', T.add({ requestId, tokenOpts }).toMessage({
      tmpl: 'Req[${requestId}] - Call jwt.verify() with options: ${tokenOpts}'
    }));
    try {
      let tokenObject = jwt.verify(token, sandboxConfig.secretKey, tokenOpts);
      L.has('debug') && L.log('debug', T.add({ requestId, tokenObject }).toMessage({
        tmpl: 'Req[${requestId}] - Verification passed, token: ${tokenObject}'
      }));
      if (lodash.isFunction(sandboxConfig.accessTokenTransform)) {
        tokenObject = sandboxConfig.accessTokenTransform(tokenObject);
        L.has('debug') && L.log('debug', T.add({ requestId, tokenObject }).toMessage({
          tmpl: 'Req[${requestId}] - transformed token: ${tokenObject}'
        }));
      }
      req[sandboxConfig.accessTokenObjectName] = tokenObject;
      return { token: tokenObject };
    } catch (error) {
      const language = extractLangCode(req);
      L.has('debug') && L.log('debug', T.add({
        requestId,
        language,
        error: { name: error.name, message: error.message }
      }).toMessage({
        tmpl: 'Req[${requestId}] - Verification failed, error: ${error}'
      }));
      if (error.name === 'TokenExpiredError') {
        return {
          error: errorBuilder.newError('TokenExpiredError', { language })
        };
      }
      if (error.name === 'JsonWebTokenError') {
        return {
          error: errorBuilder.newError('JsonWebTokenError', { language })
        };
      }
      return {
        error: errorBuilder.newError('JwtVerifyUnknownError', { language })
      };
    }
  } else {
    const language = extractLangCode(req);
    L.has('debug') && L.log('debug', T.add({ requestId }).toMessage({
      tmpl: 'Req[${requestId}] - access-token not found'
    }));
    return {
      error: errorBuilder.newError('TokenNotFoundError', { language })
    };
  }
}