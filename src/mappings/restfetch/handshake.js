'use strict';

/** Import **/
const HANDSHAKE_URL = process.env.HANDSHAKE_URL;
const APP_TYPE = process.env.APP_TYPE;
const HEADERS = {
  "Content-Type": "application/json",
  "Accept": "application/json",
};
const TIMEOUT = process.env.TIMEOUT || 65000;

const conf = {
  methods: {}
};

if (HANDSHAKE_URL) {
  conf.methods.getPermissionByGroups = {
    method: 'POST',
    url: `${HANDSHAKE_URL}/handshake/auth/permission-groups/getPermission/${APP_TYPE}`,
    timeout: TIMEOUT,
    arguments: {
      default: {
        headers: HEADERS
      },
      transform: function(groups) {
        return {
          body: {
            "groups": groups
          }
        };
      }
    }
  }
}

module.exports = conf;
