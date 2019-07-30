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
  let permPath = authorizationCfg.permissionPath;
  if (lodash.isArray(permPath) && !lodash.isEmpty(permPath)) {
    L.has('silly') && L.log('silly', T.add({ permPath }).toMessage({
      tmpl: 'permissionPath: ${permPath}',
    }));
    permissionExtractor = function (req) {
      return lodash.get(req[accessTokenObjectName], permPath, []);
    }
  } else if (lodash.isFunction(authorizationCfg.permissionExtractor)) {
    L.has('silly') && L.log('silly', T.toMessage({
      text: 'use the configured permissionExtractor() function'
    }));
    permissionExtractor = authorizationCfg.permissionExtractor;
  } else {
    L.has('silly') && L.log('silly', T.toMessage({
      text: 'use the null returned permissionExtractor() function'
    }));
    permissionExtractor = function (req) { return null; }
  }

  this.checkPermissions = function(req) {
    let passed = null;
    for (let i = 0; i < compiledRules.length; i++) {
      let rule = compiledRules[i];
      if (req.url && req.url.match(rule.urlPattern)) {
        if (lodash.isEmpty(rule.methods) || (req.method && rule.methods.indexOf(req.method) >= 0)) {
          let permissions = permissionExtractor(req);
          L.has('silly') && L.log('silly', 'extracted permissions: %s', JSON.stringify(permissions));
          if (lodash.isEmpty(rule.permission) || (lodash.isArray(permissions) && permissions.indexOf(rule.permission) >= 0)) {
            L.has('silly') && L.log('silly', 'permission accepted: %s', rule.permission);
            passed = true;
          } else {
            passed = false;
          }
          break;
        }
      }
    }
    return passed;
  }
};

module.exports = Checker;
