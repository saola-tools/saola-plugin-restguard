"use strict";

function Service (params = {}) {
  const { restguardToolkit } = params;

  this.encode = function(data, opts) {
    return restguardToolkit.encode(data, opts);
  };

  this.decode = function(token, opts) {
    return restguardToolkit.verify(token, opts);
  };
}

Service.referenceHash = {
  restguardToolkit: "toolkit",
};

module.exports = Service;
