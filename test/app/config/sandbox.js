'use strict';

var contextPath = '/example';
var accessTokenObjectName = 'ACCESS_TOKEN';

module.exports = {
  application: {
    contextPath: contextPath,
    accessTokenObjectName: accessTokenObjectName
  },
  plugins: {
    appRestguard: {
      contextPath: contextPath,
      accessTokenObjectName: accessTokenObjectName,
      protectedPaths: [
        contextPath + '/jwt/session-info',
        contextPath + '/jwt/authorized*',
      ],
      secretKey: 'dobietday',
    },
    appTracelog: {
      tracingPaths: [ contextPath ],
      tracingBoundaryEnabled: true
    }
  }
};
