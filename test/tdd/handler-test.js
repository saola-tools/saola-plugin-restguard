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
  });
});
