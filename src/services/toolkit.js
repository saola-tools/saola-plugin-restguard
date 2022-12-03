'use strict';

const Devebot = require('devebot');
const lodash = Devebot.require('lodash');
const { momentHelper, tokenHandler } = require('tokenlib');

function Service (params = {}) {
  const { sandboxConfig, loggingFactory } = params;
  const L = loggingFactory.getLogger();
  const T = loggingFactory.getTracer();

  const expiresInFieldName = sandboxConfig.expiresInFieldName || 'expiredIn';

  const config = lodash.pick(sandboxConfig, ['secretKey', 'expiresIn', 'ignoreExpiration']);
  config.secretKey = config.secretKey || 't0ps3cr3t'
  config.expiresIn = config.expiresIn || 60 * 60; // expires in 1 hour

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
  }

  this.decode = function(token, opts) {
    opts = opts || {};
    return tokenHandler.decode(token, opts);
  }

  this.verify = function(token, opts) {
    opts = opts || {};
    return tokenHandler.verify(token, opts.secretKey || config.secretKey, opts, config);
  }
}

Service.referenceHash = {};

module.exports = Service;
