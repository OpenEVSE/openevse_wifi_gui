/* global ko, OpenEVSE, TimeViewModel */
/* exported OpenEvseViewModel */


function DummyRequest()
{
  var self = this;
  self.always = function(fn) {
    fn();
    return self;
  };
}

function OpenEvseViewModel(baseEndpoint, config, status) {
  "use strict";
  var self = this;
  var endpoint = ko.pureComputed(function () { return baseEndpoint() + "/r"; });
  self.openevse = new OpenEVSE(endpoint());
  endpoint.subscribe(function (end) {
    self.openevse.setEndpoint(end);
  });

  self.time = new TimeViewModel(status);

  self.createCurrentArray = (min, max) => {
    return Array((max - min) + 1).fill().map((_, i) => { return { name: (min+i)+" A", value: (min+i)}});
  };

  // Option lists
  self.serviceLevels = [
    { name: "Auto", value: 0 },
    { name: "1", value: 1 },
    { name: "2", value: 2 }];
  self.currentLevels = ko.observableArray(self.createCurrentArray(6, 80));
  self.timeLimits = [
    { name: "none", value: 0 },
    { name: "15 min", value: 15 },
    { name: "30 min", value: 30 },
    { name: "45 min", value: 45 },
    { name: "1 hour", value: 60 },
    { name: "1.5 hours", value: 1.5 * 60 },
    { name: "2 hours", value: 2 * 60 },
    { name: "2.5 hours", value: 2.5 * 60 },
    { name: "3 hours", value: 3 * 60 },
    { name: "4 hours", value: 4 * 60 },
    { name: "5 hours", value: 5 * 60 },
    { name: "6 hours", value: 6 * 60 },
    { name: "7 hours", value: 7 * 60 },
    { name: "8 hours", value: 8 * 60 }];

  self.chargeLimits = [
    { name: "none", value: 0 },
    { name: "1 kWh", value: 1 },
    { name: "2 kWh", value: 2 },
    { name: "3 kWh", value: 3 },
    { name: "4 kWh", value: 4 },
    { name: "5 kWh", value: 5 },
    { name: "6 kWh", value: 6 },
    { name: "7 kWh", value: 7 },
    { name: "8 kWh", value: 8 },
    { name: "9 kWh", value: 9 },
    { name: "10 kWh", value: 10 },
    { name: "15 kWh", value: 11 },
    { name: "20 kWh", value: 12 },
    { name: "25 kWh", value: 25 },
    { name: "30 kWh", value: 30 },
    { name: "35 kWh", value: 35 },
    { name: "40 kWh", value: 40 },
    { name: "45 kWh", value: 45 },
    { name: "50 kWh", value: 50 },
    { name: "55 kWh", value: 55 },
    { name: "60 kWh", value: 60 },
    { name: "70 kWh", value: 70 },
    { name: "80 kWh", value: 80 },
    { name: "90 kWh", value: 90 }];

  self.timeLimit = ko.observable(-1);
  self.chargeLimit = ko.observable(-1);

  // helper to select an appropriate value for time limit
  self.selectTimeLimit = function(limit)
  {
    if(self.timeLimit() === limit) {
      return;
    }

    for(var i = 0; i < self.timeLimits.length; i++) {
      var time = self.timeLimits[i];
      if(time.value >= limit) {
        self.timeLimit(time.value);
        break;
      }
    }
  };

  // helper to select an appropriate value for charge limit
  self.selectChargeLimit = function(limit)
  {
    if(self.chargeLimit() === limit) {
      return;
    }

    for(var i = 0; i < self.chargeLimits.length; i++) {
      var charge = self.chargeLimits[i];
      if(charge.value >= limit) {
        self.chargeLimit(charge.value);
        break;
      }
    }
  };

  // List of items to update on calling update(). The list will be processed one item at
  // a time.
  var updateList = [
    function () {
      if(false === status.time()) {
        return self.openevse.time(self.time.timeUpdate);
      }
      return new DummyRequest();
    },
    function () { return self.openevse.time_limit(function (limit) {
      self.selectTimeLimit(limit);
    }); },
    function () { return self.openevse.charge_limit(function (limit) {
      self.selectChargeLimit(limit);
    }); }
  ];
  self.updateCount = ko.observable(0);
  self.updateTotal = ko.observable(updateList.length);

  self.updatingTimeLimit = ko.observable(false);
  self.savedTimeLimit = ko.observable(false);
  self.updatingChargeLimit = ko.observable(false);
  self.savedChargeLimit = ko.observable(false);

  self.setForTime = function (flag, time) {
    flag(true);
    setTimeout(function () { flag(false); }, time);
  };

  self.generateCurrentList = () => {
    let min = config.min_current_hard();
    let max = config.max_current_hard();
    var list = self.createCurrentArray(min, max);
    ko.mapping.fromJS(list, {}, self.currentLevels);
  };

  var subscribed = false;
  self.subscribe = function ()
  {
    if(subscribed) {
      return;
    }

    status.service_level.subscribe(() => {
      self.generateCurrentList();
    });
    self.generateCurrentList();

    // Updates to the time limit
    self.timeLimit.subscribe(function (val) {
      self.updatingTimeLimit(true);
      self.openevse.time_limit(function (limit) {
        self.setForTime(self.savedTimeLimit, 2000);
        if(val !== limit) {
          self.selectTimeLimit(limit);
        }
      }, val).always(function() {
        self.updatingTimeLimit(false);
      });
    });

    // Updates to the charge limit
    self.chargeLimit.subscribe(function (val) {
      self.updatingChargeLimit(true);
      self.openevse.charge_limit(function (limit) {
        self.setForTime(self.savedChargeLimit, 2000);
        if(val !== limit) {
          self.selectChargeLimit(limit);
        }
      }, val).always(function() {
        self.updatingChargeLimit(false);
      });
    });

    subscribed = true;
  };

  self.update = function (after = function () { }) {
    self.updateCount(0);
    self.nextUpdate(after);
  };

  self.nextUpdate = function (after) {
    var updateFn = updateList[self.updateCount()];
    updateFn().always(function () {
      self.updateCount(self.updateCount() + 1);
      if(self.updateCount() < updateList.length) {
        self.nextUpdate(after);
      } else {
        self.subscribe();
        after();
      }
    });
  };

  // delay timer logic
  function isTime(val) {
    var timeRegex = /([01]\d|2[0-3]):([0-5]\d)/;
    return timeRegex.test(val);
  }
  self.delayTimerValid = ko.pureComputed(function () {
    return isTime(self.delayTimerStart()) && isTime(self.delayTimerStop());
  });
  self.startDelayTimer = function () {
    self.updatingDelayTimer(true);
    self.openevse.timer(function () {
      self.delayTimerEnabled(true);
    }, self.delayTimerStart(), self.delayTimerStop()).always(function() {
      self.updatingDelayTimer(false);
    });
  };
  self.stopDelayTimer = function () {
    self.updatingDelayTimer(true);
    self.openevse.cancelTimer(function () {
      self.delayTimerEnabled(false);
    }).always(function() {
      self.updatingDelayTimer(false);
    });
  };

  // Support for restarting the OpenEVSE
  self.restartFetching = ko.observable(false);
  self.restart = function() {
    if (confirm("Restart OpenEVSE? Current config will be saved, takes approximately 10s.")) {
      self.restartFetching(true);
      self.openevse.reset().always(function () {
        self.restartFetching(false);
      });
    }
  };
}
