"use strict";

module.exports = {
  plugins: {
    pluginRestguard: {
      portlets: {
        default: {},
        manager: {}
      }
    },
    pluginLogtracer: {
      portlets: {
        default: {},
        manager: {}
      }
    },
    pluginWebweaver: {
      portlets: {
        default: {},
        manager: {}
      }
    },
    pluginWebserver: {
      portlets: {
        default: {
          port: 7979
        },
        manager: {
          port: 9797
        }
      }
    }
  }
};
