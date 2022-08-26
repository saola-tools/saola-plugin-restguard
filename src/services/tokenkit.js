'use strict';

const lodash = require('lodash');
const jwt = require('jsonwebtoken');
const moment = require('moment');

function Service (params = {}) {
  const { sandboxConfig, loggingFactory } = params;
  const L = loggingFactory.getLogger();
  const T = loggingFactory.getTracer();

  const config = lodash.pick(sandboxConfig, ['expiredIn', 'secretKey']);
  config.secretKey = config.secretKey || 't0ps3cr3t'
  config.expiredIn = config.expiredIn || 60 * 60; // expires in 1 hour

  this.encode = function(data, more) {
    const now = moment();
    const expiredIn = config.expiredIn;
    const expiredTime = now.add(expiredIn, "seconds").toDate();
    //
    const accessObject = Object.assign({}, data, {
      expiredIn,
      expiredTime
    });
    //
    const auth = {
      access_token: jwt.sign(accessObject, config.secretKey, {
        expiresIn: data.expiredIn || config.expiredIn
      }),
      expires_in: expiredIn,
      expired_time: expiredTime
    };
    //
    return auth;
  }

  this.decode = function(token, opts) {
    return jwt.verify(token, config.secretKey, opts);
  }
}

Service.referenceHash = {};

module.exports = Service;
