"use strict";

const Devebot = require("@saola/core");
const lodash = Devebot.require("lodash");
const chores = require("../../../lib/utils/chores.js");
const contextPath = "/example";
const accessTokenObjectName = "ACCESS_TOKEN"; // default: 'accessToken'

module.exports = {
  application: {
    contextPath: contextPath,
    accessTokenObjectName: accessTokenObjectName
  },
  plugins: {
    pluginRestguard: {
      enabled: true,
      accessTokenDetailPath: "/-access-token-",
      accessTokenObjectName: accessTokenObjectName,
      accessTokenTransform: function (data) {
        if (data && data.appType === "adminApp") {
          return chores.renameJsonFields(data, {
            "holderId": "operatorId"
          });
        }
        if (data && data.appType === "agentApp") {
          return chores.renameJsonFields(data, {
            "holderId": "commissionerId"
          });
        }
        return data;
      },
      protectedPaths: [
        contextPath + "/jwt/session-info",
        contextPath + "/jwt/authorized*",
      ],
      bypassingRules: {
        inclusion: {
          hostnames: /.+\.internal$/
        },
        exclusion: {
          hostnames: [ "example.com" ]
        }
      },
      ignoreExpiration: false,
      secretKey: "dobietday-skipped",
      deprecatedKeys: [
        "invalid",
        "dobietday",
        "deprecated"
      ],
      authorization: {
        enabled: true,
        permissionLocation: ["permissions"],
        permissionExtractor: function(req) {
          return lodash.get(req, [accessTokenObjectName, "permissions"], []);
        },
        permissionRules: [
          {
            enabled: true,
            url: "/jwt/authorized(.*)",
            paths: [ "/jwt/authorized/:code" ],
            methods: ["GET", "POST"],
            permission: "VIEW_APPLICATION"
          }
        ]
      }
    },
    appTracelog: {
      tracingPaths: [ contextPath ],
      tracingBoundaryEnabled: true
    },
    pluginWebweaver: {
      printRequestInfo: true
    },
    pluginWebserver: {
      port: 7878
    }
  }
};
