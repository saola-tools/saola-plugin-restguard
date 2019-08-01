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
          "accessTokenDetailPath": {
            "type": "string"
          },
          "allowPublicAccessName": {
            "type": "string"
          },
          "secretKey": {
            "type": "string"
          },
          "ignoreExpiration": {
            "type": "boolean"
          },
          "publicPaths": {
            "type": "array"
          },
          "protectedPaths": {
            "type": "array"
          },
          "authorization": {
            "type": "object",
            "properties": {
              "enabled": {
                "type": "boolean"
              },
              "permissionLocation": {
                "oneOf": [
                  {
                    "type": "string"
                  },
                  {
                    "type": "array",
                    "items": {
                      "type": "string"
                    }
                  }
                ]
              },
              "permissionExtractor": {
              },
              "permissionRules": {
                "type": "array",
                "items": {
                  "type": "object",
                  "properties": {
                    "enabled": {
                      "type": "boolean"
                    },
                    "url": {
                      "type": "string"
                    },
                    "paths": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      }
                    },
                    "methods": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      }
                    },
                    "permission": {
                      "type": "string"
                    },
                  }
                }
              }
            }
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
                  },
                  "description": {
                    "type": "string"
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
