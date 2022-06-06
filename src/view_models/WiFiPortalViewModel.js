/* global ko, ConfigViewModel, StatusViewModel, WiFiScanViewModel, WiFiConfigViewModel, PasswordViewModel, TimeViewModel */
/* exported WiFiPortalViewModel */

function WiFiPortalViewModel(baseHost, basePort)
{
  "use strict";
  var self = this;

  self.baseHost = ko.observable("" !== baseHost ? baseHost : "openevse.local");
  self.basePort = ko.observable(basePort);
  self.baseEndpoint = ko.pureComputed(function () {
    var endpoint = "//" + self.baseHost();
    if(80 !== self.basePort()) {
      endpoint += ":"+self.basePort();
    }
    return endpoint;
  });

  self.config = new ConfigViewModel(self.baseEndpoint);
  self.status = new StatusViewModel(self.baseEndpoint);
  self.scan = new WiFiScanViewModel(self.baseEndpoint);
  self.wifi = new WiFiConfigViewModel(self.baseEndpoint, self.config, self.status, self.scan);
  self.time = new TimeViewModel(self.status);

  self.initialised = ko.observable(false);
  self.updating = ko.observable(false);
  self.wifi.selectedNet.subscribe((net) => {
    if(false !== net) {
      self.config.ssid(net.ssid());
    }
  });

  self.config.ssid.subscribe((ssid) => {
    self.wifi.setSsid(ssid);
  });

  // Show/hide password state
  self.wifiPassword = new PasswordViewModel(self.config.pass);

  var updateTimer = null;
  var updateTime = 5 * 1000;

  // -----------------------------------------------------------------------
  // Initialise the app
  // -----------------------------------------------------------------------
  self.start = function () {
    self.updating(true);
    self.config.update(function () {
      self.status.update(function () {
        self.initialised(true);
        updateTimer = setTimeout(self.update, updateTime);
        self.updating(false);

        self.status.connect();

        self.config.min_current_hard.subscribe(() => {
          self.generateCurrentList();
        });
        self.config.max_current_hard.subscribe(() => {
          self.generateCurrentList();
        });
        self.generateCurrentList();
      });
    });
  };

  // -----------------------------------------------------------------------
  // Get the updated state from the ESP
  // -----------------------------------------------------------------------
  self.update = function () {
    if (self.updating()) {
      return;
    }
    self.updating(true);
    if (null !== updateTimer) {
      clearTimeout(updateTimer);
      updateTimer = null;
    }
    self.status.update(function () {
      updateTimer = setTimeout(self.update, updateTime);
      self.updating(false);
    });
  };

  // -----------------------------------------------------------------------
  // Event: OpenEVSE settings save
  // -----------------------------------------------------------------------

  self.openEvseSetting = (name) =>
  {
    let setting = self.config[name];

    var optGroup = new ConfigGroupViewModel(self.baseEndpoint, () =>
    {
      let data = {};
      data[name] = setting();
      return data;
    });
    setting.subscribe(() =>
    {
      if(self.config.loaded()) {
        optGroup.save();
      }
    });

    return optGroup;
  };

  self.openEvseService = self.openEvseSetting("service");
  self.openEvseMaxCurrentSoft = self.openEvseSetting("max_current_soft");

  self.createCurrentArray = (min, max) => {
    return Array((max - min) + 1).fill().map((_, i) => { return { name: (min+i)+" A", value: (min+i)}});
  };

  self.generateCurrentList = () => {
    let min = self.config.min_current_hard();
    let max = self.config.max_current_hard();
    var list = self.createCurrentArray(min, max);
    ko.mapping.fromJS(list, {}, self.currentLevels);
  };

  self.serviceLevels = [
    { name: "Auto", value: 0 },
    { name: "1", value: 1 },
    { name: "2", value: 2 }];
  self.currentLevels = ko.observableArray(self.createCurrentArray(self.config.min_current_hard(), 80));

}

