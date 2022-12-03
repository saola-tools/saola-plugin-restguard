'use strict';

const Devebot = require('devebot');
const lodash = Devebot.require('lodash');

function Chores() {
  this.stringToArray = function (labels) {
    labels = labels || '';
    if (typeof labels === 'string') {
      return labels.split(',').map(function(item) {
        return item.trim();
      }).filter(function(item) {
        return item.length > 0;
      });
    }
    return labels;
  };
  //
  this.renameJsonFields = function (data, nameMappings) {
    if (nameMappings && lodash.isObject(nameMappings)) {
      for (const oldName in nameMappings) {
        const val = lodash.get(data, oldName);
        if (!lodash.isUndefined(val)) {
          const newName = nameMappings[oldName];
          lodash.unset(data, oldName);
          lodash.set(data, newName, val);
        }
      }
    }
    return data;
  }
}

module.exports = new Chores();
