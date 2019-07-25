'use strict';

const Devebot = require('devebot');
const Promise = Devebot.require('bluebird');
const lodash = Devebot.require('lodash');
const jwt = require('jsonwebtoken');

function Handler(params = {}) {
  const { sandboxConfig, tracelogService } = params;
  const L = params.loggingFactory.getLogger();
  const T = params.loggingFactory.getTracer();

  const jwtCfg = sandboxConfig || {};

  this.defineAccessTokenMiddleware = function () {
    const self = this;
    return function (req, res, next) {
      if (sandboxConfig.enabled === false) {
        return next();
      }
      return self.verifyAccessToken(req, { promiseEnabled: true })
      .then(function () {
        next();
      })
      .catch(function (err) {
        res.status(403).send({
          message: err.message || 'access-token not found or invalid'
        });
      })
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
    let token = req.get(jwtCfg.accessTokenHeaderName) || req.param(jwtCfg.accessTokenParamsName);
    if (token) {
      L.has('debug') && L.log('debug', T.add({ requestId, token }).toMessage({
        tmpl: 'Req[${requestId}] - access-token found: [${token}]'
      }));
      let tokenOpts = {
        ignoreExpiration: jwtCfg.ignoreExpiration || false
      };
      L.has('debug') && L.log('debug', T.add({ requestId, tokenOpts }).toMessage({
        tmpl: 'Req[${requestId}] - Call jwt.verify() with options: ${tokenOpts}'
      }));
      try {
        let tokenObject = jwt.verify(token, jwtCfg.secretKey, tokenOpts);
        L.has('debug') && L.log('debug', T.add({ requestId, tokenObject }).toMessage({
          tmpl: 'Req[${requestId}] - Verification passed, token: ${tokenObject}'
        }));
        if (lodash.isFunction(sandboxConfig.accessTokenTransform)) {
          tokenObject = sandboxConfig.accessTokenTransform(tokenObject);
        }
        req[sandboxConfig.accessTokenObjectName] = tokenObject;
        return { token: tokenObject };
      } catch (error) {
        L.has('debug') && L.log('debug', T.add({
          requestId,
          error: { name: error.name, message: error.message }
        }).toMessage({
          tmpl: 'Req[${requestId}] - Verification failed, error: ${error}'
        }));
        if (error.name === 'TokenExpiredError') {
          return { error: new Error('access-token is expired') };
        }
        if (error.name === 'JsonWebTokenError') {
          return { error: new Error('access-token is invalid') };
        }
        return { error: new Error('jwt.verify() unknown error') };
      }
    } else {
      L.has('debug') && L.log('debug', T.add({ requestId }).toMessage({
        tmpl: 'Req[${requestId}] - access-token not found'
      }));
      return { error: new Error('access-token not found') };
    }
  }
}

Handler.referenceHash = {
  tracelogService: 'app-tracelog/tracelogService'
};

module.exports = Handler;
