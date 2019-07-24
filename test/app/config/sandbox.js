'use strict';

var contextPath = '/example';
var accessTokenObject = 'tokenify';

module.exports = {
  application: {
    contextPath: contextPath,
    accessTokenObject: accessTokenObject
  },
  plugins: {
    appRestguard: {
      contextPath: contextPath,
      accessTokenObject: accessTokenObject,
      jwt: {
        protectedPaths: [
          contextPath + '/jwt/session-info',
          contextPath + '/jwt/authorized*'
        ],
        secretKey: 'dobietday'
      },
    },
    appTracelog: {
      tracingPaths: [ contextPath ],
      tracingBoundaryEnabled: true
    }
  }
};
