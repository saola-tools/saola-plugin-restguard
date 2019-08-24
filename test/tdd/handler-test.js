'use strict';

var devebot = require('devebot');
var lodash = devebot.require('lodash');
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
  });
});
