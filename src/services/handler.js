'use strict';

const Devebot = require('devebot');
const Promise = Devebot.require('bluebird');
const lodash = Devebot.require('lodash');
const jwt = require('jsonwebtoken');

function Handler(params = {}) {
  const { sandboxConfig, tracelogService, permissionChecker } = params;
  const L = params.loggingFactory.getLogger();
  const T = params.loggingFactory.getTracer();
  const errorCodes = sandboxConfig.errorCodes;

  this.definePermCheckerMiddleware = function () {
    return function (req, res, next) {
      const passed = permissionChecker.checkPermissions(req);
      if (passed === null) return next();
      if (passed) return next();
      const err = errorCodes['InsufficientError'] || {};
      if (err.returnCode) {
        res.set('X-Return-Code', err.returnCode);
      }
      return res.status(err.statusCode || 403).json({
        message: err.message || 'not sufficient permissions'
      });
    }
  }

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
        if (err.returnCode) {
          res.set('X-Return-Code', err.returnCode);
        }
        res.status(err.statusCode || 500).send({
          name: err.name,
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
    let token = req.get(sandboxConfig.accessTokenHeaderName) || req.param(sandboxConfig.accessTokenParamsName);
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
        L.has('debug') && L.log('debug', T.add({
          requestId,
          error: { name: error.name, message: error.message }
        }).toMessage({
          tmpl: 'Req[${requestId}] - Verification failed, error: ${error}'
        }));
        if (error.name === 'TokenExpiredError') {
          return { error: createError('TokenExpiredError') };
        }
        if (error.name === 'JsonWebTokenError') {
          return { error: createError('JsonWebTokenError') };
        }
        return { error: createError('JwtVerifyUnknownError') };
      }
    } else {
      L.has('debug') && L.log('debug', T.add({ requestId }).toMessage({
        tmpl: 'Req[${requestId}] - access-token not found'
      }));
      return { error: createError('TokenNotFoundError') };
    }
  }

  const createError = function (errorName) {
    const errInfo = lodash.get(errorCodes, errorName);
    if (errInfo == null) {
      const err = new Error('Unsupported error[' + errorName + ']');
      err.returnCode = -1;
      err.statusCode = 500;
      return err;
    }
    const err = new Error(errInfo.message);
    err.name = errorName;
    err.returnCode = errInfo.returnCode;
    err.statusCode = errInfo.statusCode;
    return err;
  }
}

Handler.referenceHash = {
  permissionChecker: 'checker',
  tracelogService: 'app-tracelog/tracelogService'
};

module.exports = Handler;
