module.exports = {
  "config": {
    "validation": {
      "schema": {
        "type": "object",
        "properties": {
          "enabled": {
            "type": "boolean"
          },
          "contextPath": {
            "type": "string"
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
        },
        "additionalProperties": false
      }
    }
  }
};
