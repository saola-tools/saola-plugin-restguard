'use strict';

const Devebot = require('devebot');
const Promise = Devebot.require('bluebird');
const jwt = require('jsonwebtoken');

function Handler(params = {}) {
  const { sandboxConfig, tracelogService } = params;
  const L = params.loggingFactory.getLogger();
  const T = params.loggingFactory.getTracer();

  const jwtCfg = sandboxConfig || {};

  this.defineAccessTokenMiddleware = function () {
    const self = this;
    return function (req, res, next) {
      const requestId = tracelogService.getRequestId(req);
      return self.verifyAccessToken(req, { promiseEnabled: true })
      .then(function () {
        L.has('debug') && L.log('debug', 'Req[%s] - verification passed', requestId);
        next();
      })
      .catch(function (err) {
        L.has('debug') && L.log('debug', 'Req[%s] - verification failed, return 403', requestId);
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
      tmpl: 'Req[${requestId}] - check header/url-params/post-body for JWT token'
    }));
    let token = req.get(jwtCfg.accessTokenHeaderName) || req.param(jwtCfg.accessTokenParamsName);
    if (token) {
      L.has('debug') && L.log('debug', 'Req[%s] JWT token found: [%s]', requestId, token);
      let tokenOpts = {
        ignoreExpiration: jwtCfg.ignoreExpiration || false
      };
      L.has('debug') && L.log('debug', T.add({ requestId, tokenOpts }).toMessage({
        tmpl: 'Req[${requestId}] - Call jwt.verify() with options: ${tokenOpts}'
      }));
      try {
        const tokenObject = jwt.verify(token, jwtCfg.secretKey, tokenOpts);
        L.has('debug') && L.log('debug', 'Req[%s] - Verification success, token: %s', requestId, JSON.stringify(decoded));
        req[sandboxConfig.accessTokenObjectName] = tokenObject;
        return { token: tokenObject };
      } catch (err) {
        L.has('debug') && L.log('debug', 'Req[%s] - Verification failed, error: %s', requestId, JSON.stringify(err));
        if (err.name === 'TokenExpiredError') {
          return { error: new Error('access-token is expired') };
        }
        return { error: new Error('access-token is invalid') };
      }
    } else {
      L.has('debug') && L.log('debug', 'Req[%s] - JWT token not found', requestId);
      return { error: new Error('access-token not found') };
    }
  }
}

Handler.referenceHash = {
  tracelogService: 'app-tracelog/tracelogService'
};

module.exports = Handler;

function tripBearer(bearerHeader) {
  if (typeof(bearerHeader) !== 'string') return bearerHeader;
  return bearerHeader.replace("Bearer", "").trim();
}
