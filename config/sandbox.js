module.exports = {
  plugins: {
    appRestguard: {
      enabled: true,
      contextPath: '/restguard',
      accessTokenObject: 'tokenify',
      jwt: {
        tokenHeaderName: 'x-access-token',
        tokenQueryName: 'token',
        expiresIn: 86400,
        ignoreExpiration: false,
        secretKey: 'changeme'
      }
    }
  }
};
