"use strict";

const Devebot = require("@saola/core");
const chores = Devebot.require("chores");
const lodash = Devebot.require("lodash");

const { PortletMixiner } = require("@saola/plugin-webserver").require("portlet");

function Checker (params = {}) {
  const { configPortletifier, packageName, loggingFactory, restfetchResolver, webweaverService } = params;

  PortletMixiner.call(this, {
    portletBaseConfig: configPortletifier.getPortletBaseConfig(),
    portletDescriptors: configPortletifier.getPortletDescriptors(),
    portletReferenceHolders: { webweaverService },
    portletArguments: { packageName, loggingFactory, restfetchResolver },
    PortletConstructor: Portlet,
  });

  // @deprecated
  this.checkPermissions = function(req) {
    return this.hasPortlet() && this.getPortlet().checkPermissions(req) || undefined;
  };
}

Object.assign(Checker.prototype, PortletMixiner.prototype);

Checker.referenceHash = {
  configPortletifier: "portletifier",
  restfetchResolver: "@saola/plugin-restfetch/resolver",
  webweaverService: "@saola/plugin-webweaver/webweaverService"
};

function Portlet (params = {}) {
  const { packageName, loggingFactory, portletConfig, portletName, restfetchResolver } = params;

  const L = loggingFactory.getLogger();
  const T = loggingFactory.getTracer();
  const blockRef = chores.getBlockRef(__filename, packageName);

  L && L.has("silly") && L.log("silly", T && T.add({ blockRef, portletName }).toMessage({
    tags: [ blockRef ],
    text: "The Portlet[${blockRef}][${portletName}] is loading"
  }));

  let handshake = restfetchResolver.lookupService("handshake/handshake");

  const authorizationCfg = portletConfig.authorization || {};
  const accessTokenObjectName = portletConfig.accessTokenObjectName;

  const declaredRules = authorizationCfg.permissionRules || [];
  const compiledRules = [];
  lodash.forEach(declaredRules, function(rule) {
    if (rule.enabled != false) {
      const compiledRule = lodash.omit(rule, ["url"]);
      compiledRule.urlPattern = new RegExp(rule.url || "/(.*)");
      compiledRules.push(compiledRule);
    }
  });

  let permissionExtractor = null;
  let permissionLocation = authorizationCfg.permissionLocation;
  let permissionGroupLocation = authorizationCfg.permissionGroupLocation;
  if ((lodash.isArray(permissionLocation) && !lodash.isEmpty(permissionLocation)) ||
      (lodash.isArray(permissionGroupLocation) && !lodash.isEmpty(permissionGroupLocation))) {
    L.has("silly") && L.log("silly", T.add({ permissionLocation, permissionGroupLocation }).toMessage({
      tmpl: "The path to permissions list: ${permissionLocation} and permissionGroups list: ${permissionGroupLocation}",
    }));
    permissionExtractor = function(req) {
      let permissions = lodash.get(req[accessTokenObjectName], permissionLocation, []);
      let permissionGroupExtractor = lodash.get(req[accessTokenObjectName], permissionGroupLocation, []);
      if (handshake && lodash.isFunction(handshake.getPermissionByGroups)) {
        return handshake.getPermissionByGroups(permissionGroupExtractor).then(permissionByGroups => {
          if (!lodash.isEmpty(permissionByGroups) && lodash.isArray(permissionByGroups)) {
            permissions = lodash.concat(permissions, permissionByGroups);
          }
          return permissions;
        }).catch(() => {
          return permissions;
        });
      } else {
        return Promise.resolve(permissions);
      }
    };
  } else if (lodash.isFunction(authorizationCfg.permissionExtractor)) {
    L.has("silly") && L.log("silly", T.toMessage({
      text: "use the provided permissionExtractor() function"
    }));
    permissionExtractor = function(req) { return Promise.resolve(authorizationCfg.permissionExtractor(req)); };
  } else {
    L.has("silly") && L.log("silly", T.toMessage({
      text: "use the null returned permissionExtractor() function"
    }));
    permissionExtractor = function(req) { return Promise.resolve(null); };
  }

  this.checkPermissions = function(req) {
    if (authorizationCfg.enabled === false) {
      return Promise.resolve(null);
    }
    return permissionExtractor(req).then(permissions => {
      for (let i = 0; i < compiledRules.length; i++) {
        const rule = compiledRules[i];
        if (req.url && req.url.match(rule.urlPattern)) {
          if (lodash.isEmpty(rule.methods) || (req.method && rule.methods.indexOf(req.method) >= 0)) {
            L.has("silly") && L.log("silly", T.add({ permissions }).toMessage({
              tmpl: "extracted permissions: ${permissions}"
            }));
            if (lodash.isEmpty(rule.permission)) {
              L.has("silly") && L.log("silly", T.toMessage({
                text: "permission is empty, passed"
              }));
              return true;
            }
            if (lodash.isArray(permissions) && permissions.indexOf(rule.permission) >= 0) {
              L.has("silly") && L.log("silly", T.add({ permission: rule.permission }).toMessage({
                tmpl: "permission accepted: ${permission}"
              }));
              return true;
            }
            return false;
          }
        }
      }
      return null;
    });
  };
}

module.exports = Checker;
