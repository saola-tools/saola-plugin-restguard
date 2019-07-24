'use strict';

var Devebot = require('devebot');
var lodash = Devebot.require('lodash');
var debug = Devebot.require('pinbug');
var debuglog = debug('example:app-restguard:example');

function Example(params) {
  params = params || {};

  var restguardService = params.restguardService;
  var express = params.webweaverService.express;

  var pluginCfg = lodash.get(params, ['sandboxConfig'], {});
  var contextPath = pluginCfg.contextPath || '/example';
  var layers = [];

  var router_jwt = express.Router();
  router_jwt.route('/authorized').get(function(req, res, next) {
    debuglog.enabled && debuglog(' - request /jwt/authorized ...');
    res.json({ status: 200, message: 'authorized' });
  });
  router_jwt.route('/session-info').get(function(req, res, next) {
    if (lodash.isObject(req[pluginCfg.accessTokenObject])) {
      res.json(req[pluginCfg.accessTokenObject]);
    } else {
      res.status(404).json({});
    }
  });
  router_jwt.route('/*').get(function(req, res, next) {
    debuglog.enabled && debuglog(' - request /jwt public resources ...');
    res.json({ status: 200, message: 'public' });
  });
  layers.push({
    name: 'app-restguard-example-jwt',
    path: contextPath + '/jwt',
    middleware: router_jwt
  });
  restguardService.push(layers);
};

Example.referenceHash = {
  restguardService: 'app-restguard/service',
  webweaverService: 'webweaverService'
};

module.exports = Example;
