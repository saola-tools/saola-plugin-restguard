'use strict';

var lodash = Devebot.require('lodash');

module.exports = {
  "config": {
    "validation": {
      "checkConstraints": function (cfg) {
        var secretKey = lodash.get(cfg, ['plugins', 'appRestguard', 'secretKey']);
        return secretKey !== 'changeme';
      },
      "schema": {
        "type": "object",
        "properties": {
          "enabled": {
            "type": "boolean"
          },
          "contextPath": {
            "type": "string"
          },
          "accessTokenTransform": {
          },
          "accessTokenObjectName": {
            "type": "string"
          },
          "accessTokenHeaderName": {
            "type": "string"
          },
          "accessTokenParamsName": {
            "type": "string"
          },
          "secretKey": {
            "type": "string"
          },
          "ignoreExpiration": {
            "type": "boolean"
          },
          "protectedPaths": {
            "type": "array"
          },
          "errorCodes": {
            "type": "object",
            "patternProperties": {
              ".+": {
                "type": "object",
                "properties": {
                  "message": {
                    "type": "string"
                  },
                  "returnCode": {
                    "oneOf": [
                      {
                        "type": "number"
                      },
                      {
                        "type": "string"
                      }
                    ]
                  },
                  "statusCode": {
                    "type": "number"
                  }
                },
                "additionalProperties": false
              }
            }
          },
          "autowired": {
            "type": "boolean"
          },
          "priority": {
            "type": "number"
          },
        },
        "additionalProperties": false
      }
    }
  }
};
