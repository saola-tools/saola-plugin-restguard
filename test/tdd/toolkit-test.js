"use strict";

const { assert, mockit } = require("liberica");
const timekeeper = require("timekeeper");

const servicesLocation = { libraryDir: "../lib" };

describe("toolkit", function() {
  const loggingFactory = mockit.createLoggingFactoryMock({ captureMethodCall: false });

  const Portletifier = mockit.acquire("portletifier", servicesLocation);

  describe("toolkit.verify()", function() {
    let Toolkit, toolkit;

    const sandboxConfig = {
      expiresIn: 60,
      ignoreExpiration: false,
      secretKey: "dobietday",
    };

    const tc = {
      "current": "2020-07-17T11:22:33.123Z",
      "expiredTime": "2020-07-17T11:23:33.123Z",
      "expiredTime_plus_2": "2020-07-17T11:23:35.123Z",
      "data": {
        "message": "example"
      },
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" +
          ".eyJtZXNzYWdlIjoiZXhhbXBsZSIsImlhdCI6MTU5NDk4NDk1MywiZXhwIjoxNTk0OTg1MDEzfQ" +
          ".lB8BCCbIyF1WB9qRvvNR4UuNTMCWInWe9Yr-ArqoMmw",
      "iat": 1594984953,
      "exp": 1594985013
    };

    describe("toolkit.verify() - signature", function() {
      beforeEach(function() {
        Toolkit = mockit.acquire("toolkit", servicesLocation);
        timekeeper.freeze(new Date(tc.current));
      });

      afterEach(function() {
        timekeeper.reset();
      });

      it("return ok when a valid jwt token provided", function () {
        const configPortletifier = new Portletifier({ sandboxConfig });
        toolkit = new Toolkit({ configPortletifier, loggingFactory });
        const result = toolkit.verify(tc.token);
        assert.isObject(result);
        assert.deepInclude(result, tc.data);
      });

      it("use the secretKey from the options first (passed)", function () {
        const configPortletifier = new Portletifier({
          sandboxConfig: Object.assign({}, sandboxConfig, { secretKey: "invalid" })
        });
        toolkit = new Toolkit({ configPortletifier, loggingFactory });
        const result = toolkit.verify(tc.token, { secretKey: sandboxConfig.secretKey });
        assert.isObject(result);
        assert.deepInclude(result, tc.data);
      });

      it("use the secretKey from the options first (failed)", function () {
        const configPortletifier = new Portletifier({ sandboxConfig });
        toolkit = new Toolkit({ configPortletifier, loggingFactory });
        assert.throws(function() {
          toolkit.verify(tc.token, { secretKey: "invalid" });
        }, Error, "invalid signature");
      });
    });

    describe("toolkit.verify() - expiration", function() {
      beforeEach(function() {
        Toolkit = mockit.acquire("toolkit", servicesLocation);
        timekeeper.freeze(new Date(tc.expiredTime_plus_2));
      });

      afterEach(function() {
        timekeeper.reset();
      });

      it("expiration error occured", function () {
        const configPortletifier = new Portletifier({ sandboxConfig });
        toolkit = new Toolkit({ configPortletifier, loggingFactory });
        assert.throws(function() {
          toolkit.verify(tc.token);
        }, Error, "jwt expired");
      });

      it("ignoreExpiration affected (from options)", function () {
        const configPortletifier = new Portletifier({ sandboxConfig });
        toolkit = new Toolkit({ configPortletifier, loggingFactory });
        const result = toolkit.verify(tc.token, { ignoreExpiration: true });
        assert.isObject(result);
        assert.deepInclude(result, tc.data);
      });

      it("ignoreExpiration affected (from config)", function () {
        const configPortletifier = new Portletifier({
          sandboxConfig: Object.assign({}, sandboxConfig, { ignoreExpiration: true })
        });
        toolkit = new Toolkit({ configPortletifier, loggingFactory });
        const result = toolkit.verify(tc.token);
        assert.isObject(result);
        assert.deepInclude(result, tc.data);
      });
    });
  });
});
