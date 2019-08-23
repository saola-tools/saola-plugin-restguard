'use strict';

var Devebot = require('devebot');
var lodash = Devebot.require('lodash');

function Example(params) {
  params = params || {};

  const L = params.loggingFactory.getLogger();
  const T = params.loggingFactory.getTracer();

  var restguardService = params.restguardService;
  var express = params.webweaverService.express;

  var pluginCfg = lodash.get(params, ['sandboxConfig'], {});
  var contextPath = pluginCfg.contextPath || '/example';
  var layers = [];

  var router_jwt = express.Router();
  router_jwt.route('/authorized').get(function(req, res, next) {
    L.has('silly') && L.log('silly', ' - request /jwt/authorized ...');
    res.json({ status: 200, message: 'authorized' });
  });
  router_jwt.route('/session-info').get(function(req, res, next) {
    if (lodash.isObject(req[pluginCfg.accessTokenObjectName])) {
      res.json(req[pluginCfg.accessTokenObjectName]);
    } else {
      res.status(404).json({});
    }
  });
  router_jwt.route('/*').get(function(req, res, next) {
    L.has('silly') && L.log('silly', ' - request /jwt public resources ...');
    res.json({ status: 200, message: 'public' });
  });
  layers.push({
    name: 'app-restguard-example-jwt',
    path: contextPath + '/jwt',
    middleware: router_jwt
  });
  restguardService.push(params.webweaverService.getPrintRequestInfoLayer(layers));
};

Example.referenceHash = {
  restguardService: 'app-restguard/service',
  webweaverService: 'webweaverService'
};

module.exports = Example;
