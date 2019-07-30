module.exports = {
  plugins: {
    appRestguard: {
      enabled: true,
      accessTokenObjectName: 'accessToken',
      accessTokenHeaderName: 'x-access-token',
      accessTokenParamsName: 'token',
      ignoreExpiration: false,
      secretKey: 'changeme',
      errorCodes: {
        TokenExpiredError: {
          message: 'access-token is expired',
          returnCode: 1001,
          statusCode: 401
        },
        JsonWebTokenError: {
          message: 'access-token is invalid',
          returnCode: 1002,
          statusCode: 401
        },
        TokenNotFoundError: {
          message: 'access-token not found',
          returnCode: 1003,
          statusCode: 401
        },
        JwtVerifyUnknownError: {
          message: 'jwt.verify() unknown error',
          returnCode: 1004,
          statusCode: 401
        },
        InsufficientError: {
          message: 'Insufficient permissions to access',
          returnCode: 1010,
          statusCode: 403
        },
      }
    }
  }
};
