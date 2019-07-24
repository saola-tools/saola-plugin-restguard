module.exports = {
  plugins: {
    appRestguard: {
      enabled: true,
      contextPath: '/restguard',
      accessTokenObjectName: 'accessToken',
      accessTokenHeaderName: 'x-access-token',
      accessTokenParamsName: 'token',
      ignoreExpiration: false,
      secretKey: 'changeme'
    }
  }
};
