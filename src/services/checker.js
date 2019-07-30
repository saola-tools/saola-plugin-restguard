'use strict';

const Devebot = require('devebot');
const lodash = Devebot.require('lodash');

function Checker({loggingFactory, sandboxConfig}) {
  const L = loggingFactory.getLogger();
  const T = loggingFactory.getTracer();
  const authorizationCfg = sandboxConfig.authorization || {};
  const accessTokenObjectName = sandboxConfig.accessTokenObjectName;

  const declaredRules = authorizationCfg.permissionRules || [];
  const compiledRules = [];
  lodash.forEach(declaredRules, function (rule) {
    if (rule.enabled != false) {
      const compiledRule = lodash.omit(rule, ['url']);
      compiledRule.urlPattern = new RegExp(rule.url || '/(.*)');
      compiledRules.push(compiledRule);
    }
  });

  let permissionExtractor = null;
  let permissionLocation = authorizationCfg.permissionLocation;
  if (lodash.isArray(permissionLocation) && !lodash.isEmpty(permissionLocation)) {
    L.has('silly') && L.log('silly', T.add({ permissionLocation }).toMessage({
      tmpl: 'The path to permissions list: ${permissionLocation}',
    }));
    permissionExtractor = function (req) {
      return lodash.get(req[accessTokenObjectName], permPath, []);
    }
  } else if (lodash.isFunction(authorizationCfg.permissionExtractor)) {
    L.has('silly') && L.log('silly', T.toMessage({
      text: 'use the provided permissionExtractor() function'
    }));
    permissionExtractor = authorizationCfg.permissionExtractor;
  } else {
    L.has('silly') && L.log('silly', T.toMessage({
      text: 'use the null returned permissionExtractor() function'
    }));
    permissionExtractor = function (req) { return null; }
  }

  this.checkPermissions = function(req) {
    if (authorizationCfg.enabled === false) {
      return null;
    }
    for (let i = 0; i < compiledRules.length; i++) {
      const rule = compiledRules[i];
      if (req.url && req.url.match(rule.urlPattern)) {
        if (lodash.isEmpty(rule.methods) || (req.method && rule.methods.indexOf(req.method) >= 0)) {
          const permissions = permissionExtractor(req);
          L.has('silly') && L.log('silly', T.add({ permissions }).toMessage({
            tmpl: 'extracted permissions: ${permissions}'
          }));
          if (lodash.isEmpty(rule.permission)) {
            L.has('silly') && L.log('silly', T.toMessage({
              text: 'permission is empty, passed'
            }));
            return true;
          }
          if (lodash.isArray(permissions) && permissions.indexOf(rule.permission) >= 0) {
            L.has('silly') && L.log('silly', T.add({ permission: rule.permission }).toMessage({
              tmpl: 'permission accepted: ${permission}'
            }));
            return true;
          }
          return false;
        }
      }
    }
    return null;
  }
};

module.exports = Checker;
