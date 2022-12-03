'use strict';

const assert = require('chai').assert;
const mockit = require('liberica').mockit;
const timekeeper = require('timekeeper');

describe('toolkit', function() {
  const loggingFactory = mockit.createLoggingFactoryMock({ captureMethodCall: false });

  describe('toolkit.verify()', function() {
    let Toolkit, toolkit;

    const sandboxConfig = {
      expiresIn: 60,
      ignoreExpiration: false,
      secretKey: "dobietday",
    }

    const tc = {
      "current": "2020-07-17T11:22:33.123Z",
      "expiredTime": "2020-07-17T11:23:33.123Z",
      "expiredTime_plus_2": "2020-07-17T11:23:35.123Z",
      "data": {
        "message": "example"
      },
      "token": 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'
          + '.eyJtZXNzYWdlIjoiZXhhbXBsZSIsImlhdCI6MTU5NDk4NDk1MywiZXhwIjoxNTk0OTg1MDEzfQ'
          + '.lB8BCCbIyF1WB9qRvvNR4UuNTMCWInWe9Yr-ArqoMmw',
      "iat": 1594984953,
      "exp": 1594985013
    }

    describe('toolkit.verify() - signature', function() {
      beforeEach(function() {
        Toolkit = mockit.acquire('toolkit', { libraryDir: '../lib' });
        timekeeper.freeze(new Date(tc.current));
      });

      afterEach(function() {
        timekeeper.reset();
      });

      it('return ok when a valid jwt token provided', function () {
        toolkit = new Toolkit({ sandboxConfig, loggingFactory });
        const result = toolkit.verify(tc.token);
        assert.isObject(result);
        assert.deepInclude(result, tc.data);
      });

      it('use the secretKey from the options first (passed)', function () {
        toolkit = new Toolkit({ 
          sandboxConfig: Object.assign({}, sandboxConfig, { secretKey: "invalid" }),
          loggingFactory
        });
        const result = toolkit.verify(tc.token, { secretKey: sandboxConfig.secretKey });
        assert.isObject(result);
        assert.deepInclude(result, tc.data);
      });

      it('use the secretKey from the options first (failed)', function () {
        toolkit = new Toolkit({ sandboxConfig, loggingFactory });
        assert.throws(function() {
          const result = toolkit.verify(tc.token, { secretKey: "invalid" });
        }, Error, "invalid signature")
      });
    });

    describe('toolkit.verify() - expiration', function() {
      beforeEach(function() {
        Toolkit = mockit.acquire('toolkit', { libraryDir: '../lib' });
        timekeeper.freeze(new Date(tc.expiredTime_plus_2));
      });

      afterEach(function() {
        timekeeper.reset();
      });

      it('expiration error occured', function () {
        toolkit = new Toolkit({ sandboxConfig, loggingFactory });
        assert.throws(function() {
          const result = toolkit.verify(tc.token);
        }, Error, "jwt expired")
      });

      it('ignoreExpiration affected (from options)', function () {
        toolkit = new Toolkit({ sandboxConfig, loggingFactory });
        const result = toolkit.verify(tc.token, { ignoreExpiration: true });
        assert.isObject(result);
        assert.deepInclude(result, tc.data);
      });

      it('ignoreExpiration affected (from config)', function () {
        toolkit = new Toolkit({ 
          sandboxConfig: Object.assign({}, sandboxConfig, { ignoreExpiration: true }),
          loggingFactory
        });
        const result = toolkit.verify(tc.token);
        assert.isObject(result);
        assert.deepInclude(result, tc.data);
      });
    });
  });
});
