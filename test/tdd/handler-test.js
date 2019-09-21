'use strict';

var devebot = require('devebot');
var Promise = devebot.require('bluebird');
var lodash = devebot.require('lodash');
var jwt = require('jsonwebtoken');
var path = require('path');
var assert = require('chai').assert;
var dtk = require('liberica').mockit;

describe('handler', function() {
  var loggingFactory = dtk.createLoggingFactoryMock({ captureMethodCall: false });
  var ctx = {
    L: loggingFactory.getLogger(),
    T: loggingFactory.getTracer(),
    blockRef: 'app-restguard/handler',
  }

  describe('extractBypassingRules()', function() {
    var Handler, extractBypassingRules;

    beforeEach(function() {
      Handler = dtk.acquire('handler');
      extractBypassingRules = dtk.get(Handler, 'extractBypassingRules');
    });

    it('should transform the bypassingRules configuration properly', function () {
      assert.deepEqual(extractBypassingRules({}), {});
      assert.deepEqual(extractBypassingRules({bypassingRules: 1024 }), {});
      assert.deepEqual(extractBypassingRules({bypassingRules: { abc: 1, def: 2 } }), {});
      assert.deepEqual(extractBypassingRules({
        bypassingRules: {
          inclusion: {
            hostnames: 'example.*',
            ips: '127.0.0.1'
          },
          def: 2
        }
      }), {
        inclusion: {
          hostnames: /example.*/,
          ips: null
        }
      });

      assert.deepEqual(extractBypassingRules({
        bypassingRules: {
          inclusion: {
            hostnames: "example\\.(com|net|org)"
          },
          exclusion: {
            hostnames: ['example.com'],
            ips: ['127.0.0.1']
          }
        }
      }), {
        inclusion: {
          hostnames: /example\.(com|net|org)/,
          ips: null
        },
        exclusion: {
          hostnames: ['example.com'],
          ips: ['127.0.0.1']
        }
      });
    })
  });

  describe('isBypassed()', function() {
    var Handler, isBypassed;

    beforeEach(function() {
      Handler = dtk.acquire('handler');
      isBypassed = dtk.get(Handler, 'isBypassed');
    });

    it('should skip bypassing if the enabled is false', function () {
      var bypassingRules = {
        enabled: false,
        exclusion: {
          hostnames: ['example.com'],
          ips: ['192.168.1.1']
        }
      };
      assert.isFalse(isBypassed({ hostname: 'example.com', ip: '127.0.0.1' }, bypassingRules));
      assert.isFalse(isBypassed({ hostname: 'example.com', ip: '192.168.1.1' }, bypassingRules));
      assert.isFalse(isBypassed({ hostname: 'devebot.com', ip: '192.168.1.1' }, bypassingRules));
      assert.isFalse(isBypassed({ hostname: 'devebot.com', ip: '127.0.0.1' }, bypassingRules));
    });

    it('should satisfy the exclusion bypassing rules (array)', function () {
      var bypassingRules = {
        exclusion: {
          hostnames: ['example.com'],
          ips: ['192.168.1.101', '192.168.1.102']
        }
      };
      assert.isFalse(isBypassed({ hostname: 'example.com', ip: '127.0.0.1' }, bypassingRules));
      assert.isFalse(isBypassed({ hostname: 'example.com', ip: '192.168.1.102' }, bypassingRules));
      assert.isFalse(isBypassed({ hostname: 'devebot.com', ip: '192.168.1.102' }, bypassingRules));
      assert.isTrue(isBypassed({ hostname: 'devebot.com', ip: '127.0.0.1' }, bypassingRules));
    });

    it('should satisfy the exclusion bypassing rules (regexp)', function () {
      var bypassingRules = {
        exclusion: {
          hostnames: /example\.(com|net|org)/,
          ips: ['192.168.1.101', '192.168.1.102']
        }
      };
      assert.isFalse(isBypassed({ hostname: 'example.com', ip: '127.0.0.1' }, bypassingRules));
      assert.isFalse(isBypassed({ hostname: 'www.example.org', ip: '127.0.0.1' }, bypassingRules));
      assert.isFalse(isBypassed({ hostname: 'example.net', ip: '192.168.1.102' }, bypassingRules));
      assert.isFalse(isBypassed({ hostname: 'devebot.com', ip: '192.168.1.102' }, bypassingRules));
      assert.isTrue(isBypassed({ hostname: 'devebot.com', ip: '127.0.0.1' }, bypassingRules));
    });

    it('should satisfy the inclusion bypassing rules (array)', function () {
      var bypassingRules = {
        inclusion: {
          hostnames: ['example.com'],
          ips: ['192.168.1.101', '192.168.1.102']
        }
      };
      assert.isTrue(isBypassed({ hostname: 'example.com', ip: '127.0.0.1' }, bypassingRules));
      assert.isTrue(isBypassed({ hostname: 'example.com', ip: '192.168.1.102' }, bypassingRules));
      assert.isTrue(isBypassed({ hostname: 'devebot.com', ip: '192.168.1.102' }, bypassingRules));
      assert.isFalse(isBypassed({ hostname: 'devebot.com', ip: '127.0.0.1' }, bypassingRules));
    });

    it('should satisfy the inclusion bypassing rules (regexp)', function () {
      var bypassingRules = {
        inclusion: {
          hostnames: /example\.(com|net|org)/,
          ips: ['192.168.1.101', '192.168.1.102']
        }
      };
      assert.isTrue(isBypassed({ hostname: 'example.com', ip: '127.0.0.1' }, bypassingRules));
      assert.isTrue(isBypassed({ hostname: 'www.example.org', ip: '127.0.0.1' }, bypassingRules));
      assert.isTrue(isBypassed({ hostname: 'example.net', ip: '192.168.1.102' }, bypassingRules));
      assert.isTrue(isBypassed({ hostname: 'devebot.com', ip: '192.168.1.102' }, bypassingRules));
      assert.isFalse(isBypassed({ hostname: 'devebot.com', ip: '127.0.0.1' }, bypassingRules));
    });

    it('should satisfy the both of inclusion and exclusion bypassing rules', function () {
      var bypassingRules = {
        exclusion: {
          hostnames: ['example.com', 'testing.com'],
          ips: ['192.168.1.101', '192.168.1.102']
        },
        inclusion: {
          hostnames: /example\.(com|net|org)/,
          ips: ['192.168.1.102', '192.168.1.103']
        }
      };
      assert.isFalse(isBypassed({ hostname: 'example.com', ip: '127.0.0.1' }, bypassingRules));
      assert.isFalse(isBypassed({ hostname: 'unknown.com', ip: '192.168.1.102' }, bypassingRules));
      assert.isFalse(isBypassed({ hostname: 'booking.net', ip: '127.0.0.1' }, bypassingRules));
      assert.isFalse(isBypassed({ hostname: 'devebot.com', ip: '192.168.1.101' }, bypassingRules));
      assert.isTrue(isBypassed({ hostname: 'devebot.com', ip: '192.168.1.103' }, bypassingRules));
    });
  });

  var app = require(path.join(__dirname, '../app'));
  var sandboxConfig = lodash.get(app.config, ['sandbox', 'default', 'plugins', 'appRestguard']);
  var tracelogService = app.runner.getSandboxService('app-tracelog/tracelogService');
  var errorManager = app.runner.getSandboxService('app-errorlist/manager');
  var errorBuilder = errorManager.register('app-restguard', sandboxConfig);
  var secretKeys = [ sandboxConfig.secretKey ];

  describe('verifyAccessToken()', function() {
    var Handler, verifyAccessToken;
    var serviceContext = lodash.assign({ sandboxConfig, secretKeys, errorBuilder, tracelogService }, ctx);

    beforeEach(function() {
      Handler = dtk.acquire('handler');
      verifyAccessToken = dtk.get(Handler, 'verifyAccessToken');
    });

    it('return ok when a valid accessToken provided', function () {
      var data = { message: 'example' };
      var req = new ExpressRequestMock({
        headers: {
          'X-Access-Token': createAccessToken(data, sandboxConfig.secretKey, 120000)
        }
      });
      var result = verifyAccessToken(req, serviceContext);
      assert.isObject(result.token);
      assert.deepInclude(result.token, data);
      assert.isUndefined(result.error);
    });

    it('support using multiple secretKeys to validate a accessToken (passed)', function () {
      var data = { message: 'example' };
      var req = new ExpressRequestMock({
        headers: {
          'X-Access-Token': createAccessToken(data, sandboxConfig.secretKey, 120000)
        }
      });
      var serviceContextCopied = lodash.cloneDeep(serviceContext);
      serviceContextCopied.secretKeys = [
        'unknown',
        'invalid',
        serviceContextCopied.sandboxConfig.secretKey
      ];
      var result = verifyAccessToken(req, serviceContextCopied);
      assert.isObject(result.token);
      assert.deepInclude(result.token, data);
      assert.isUndefined(result.error);
    });

    it('support using multiple secretKeys to validate a accessToken (failed)', function () {
      var data = { message: 'example' };
      var req = new ExpressRequestMock({
        headers: {
          'X-Access-Token': createAccessToken(data, sandboxConfig.secretKey, 120000)
        }
      });
      var serviceContextCopied = lodash.cloneDeep(serviceContext);
      serviceContextCopied.secretKeys = [
        'invalid',
        'unmatched',
        'unknown'
      ];
      var result = verifyAccessToken(req, serviceContextCopied);
      assert.isUndefined(result.token);
      assert.isObject(result.error);
      assert.equal(result.error.name, 'JsonWebTokenError');
    });

    it('throw a JsonWebTokenError if an unmatched secretKey provided', function () {
      var req = new ExpressRequestMock({
        headers: {
          'X-Access-Token': createAccessToken({}, 'changeme', 120000)
        }
      });
      var result = verifyAccessToken(req, serviceContext);
      assert.isUndefined(result.token);
      assert.isObject(result.error);
      assert.equal(result.error.name, 'JsonWebTokenError');
    });

    it('throw a TokenExpiredError if the access-token has expired', function () {
      var data = { message: 'example' };
      var req = new ExpressRequestMock({
        headers: {
          'X-Access-Token': createAccessToken(data, sandboxConfig.secretKey, 1) // 1 second
        }
      });
      return Promise.resolve().delay(1100).then(function() {
        var serviceContextCopied = lodash.cloneDeep(serviceContext);
        serviceContextCopied.secretKeys = [
          sandboxConfig.secretKey
        ];
        var result = verifyAccessToken(req, serviceContextCopied);
        assert.isUndefined(result.token);
        assert.isObject(result.error);
        assert.equal(result.error.name, 'TokenExpiredError');
      })
    });

    it('throw a TokenNotFoundError if a token could not be found in header, query or body', function () {
      var req = new ExpressRequestMock();
      var result = verifyAccessToken(req, serviceContext);
      assert.isUndefined(result.token);
      assert.isObject(result.error);
      assert.equal(result.error.name, 'TokenNotFoundError');
    });
  });
});

function createAccessToken (data = {}, secretKey, expiresIn) {
  const token = jwt.sign(data, secretKey || 't0ps3cr3t', {
    expiresIn: expiresIn || 60 * 1000
  });
  return token;
}

function ExpressRequestMock(kwargs = {}) {
  var store = { };

  store.headers = lodash.mapKeys(kwargs.headers, function(value, key) {
    return lodash.lowerCase(key);
  });

  var self = this;
  lodash.forEach (['query', 'params'], function(fieldName) {
    self[fieldName] = {};
    if (fieldName in kwargs) {
      if (kwargs[fieldName] && lodash.isObject(kwargs[fieldName])) {
        self[fieldName] = lodash.cloneDeep(kwargs[fieldName]);
      } else {
        throw Error('ExpressRequestMock[' + fieldName + '] must be an object');
      }
    }
  });

  this.get = function(name) {
    return store.headers[lodash.lowerCase(name)];
  }
}
