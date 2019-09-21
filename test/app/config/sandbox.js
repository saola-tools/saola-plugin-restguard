'use strict';

var Devebot = require('devebot');
var lodash = Devebot.require('lodash');
var chores = require('../../../lib/utils/chores.js');
var contextPath = '/example';
var accessTokenObjectName = 'ACCESS_TOKEN'; // default: 'accessToken'

module.exports = {
  application: {
    contextPath: contextPath,
    accessTokenObjectName: accessTokenObjectName
  },
  plugins: {
    appRestguard: {
      enabled: true,
      accessTokenDetailPath: '/-access-token-',
      accessTokenObjectName: accessTokenObjectName,
      accessTokenTransform: function (data) {
        if (data && data.appType === 'adminApp') {
          return chores.renameJsonFields(data, {
            "holderId": "operatorId"
          });
        }
        if (data && data.appType === 'agentApp') {
          return chores.renameJsonFields(data, {
            "holderId": "commissionerId"
          });
        }
        return data;
      },
      protectedPaths: [
        contextPath + '/jwt/session-info',
        contextPath + '/jwt/authorized*',
      ],
      bypassingRules: {
        exclusion: {
          hostnames: [ 'example.com' ]
        }
      },
      ignoreExpiration: false,
      secretKey: 'dobietday-skipped',
      deprecatedKeys: [
        'invalid',
        'dobietday',
        'deprecated'
      ],
      authorization: {
        enabled: true,
        permissionLocation: ['permissions'],
        permissionExtractor: function(req) {
          return lodash.get(req, [accessTokenObjectName, 'permissions'], []);
        },
        permissionRules: [
          {
            enabled: true,
            url: '/jwt/authorized(.*)',
            paths: [ '/jwt/authorized/:code' ],
            methods: ['GET', 'POST'],
            permission: 'VIEW_APPLICATION'
          }
        ]
      }
    },
    appTracelog: {
      tracingPaths: [ contextPath ],
      tracingBoundaryEnabled: true
    },
    appWebweaver: {
      printRequestInfo: true
    },
    appWebserver: {
      port: 7878
    }
  }
};
