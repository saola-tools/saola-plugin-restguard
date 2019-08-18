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
    const result = verifyAccessToken(req);
    if (promiseEnabled) {
      if (result.error) {
        return Promise.reject(result.error);
      }
      return Promise.resolve(result.token);
    } else {
      return result;
    }
  }

  const verifyAccessToken = function (req) {
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
