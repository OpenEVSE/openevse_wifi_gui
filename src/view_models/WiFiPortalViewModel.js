/* global ko, $, ConfigViewModel, StatusViewModel, WiFiScanViewModel, WiFiConfigViewModel, PasswordViewModel, TimeViewModel, ConfigGroupViewModel, ScheduleViewModel */
/* exported WiFiPortalViewModel */

function WiFiPortalViewModel(baseHost, basePort)
{
  "use strict";
  var self = this;

  self.baseHost = ko.observable("" !== baseHost ? baseHost : "openevse.local");
  self.basePort = ko.observable(basePort);
  self.baseEndpoint = ko.pureComputed(() => {
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
  self.schedule = new ScheduleViewModel(self.baseEndpoint, self.config);

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
  self.start = () => {
    self.updating(true);
    self.config.update(() => {
      self.status.update(() => {
        self.schedule.update(() => {
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
    });
  };

  // -----------------------------------------------------------------------
  // Get the updated state from the ESP
  // -----------------------------------------------------------------------
  self.update = () => {
    if (self.updating()) {
      return;
    }
    self.updating(true);
    if (null !== updateTimer) {
      clearTimeout(updateTimer);
      updateTimer = null;
    }
    self.status.update(() => {
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

  // -----------------------------------------------------------------------
  // Event: Manual Override
  // -----------------------------------------------------------------------
  self.setOverrideFetching = ko.observable(false);
  self.setOverrideSuccess = ko.observable(false);
  self.setOverride = () =>
  {
    self.setOverrideFetching(true);
    self.setOverrideSuccess(false);

    let props = {
      state: self.status.isPaused() ? "active" : "disabled",
    };

    $.ajax({
      method: "POST",
      url: self.baseEndpoint() + "/override",
      data: JSON.stringify(props),
      contentType: "application/json"
    }).done(() => {
      self.setOverrideSuccess(true);
    }).fail(() => {
      alert("Failed to set manual override");
    }).always(() => {
      self.setOverrideFetching(false);
    });
  };

  self.clearOverrideFetching = ko.observable(false);
  self.clearOverrideSuccess = ko.observable(false);
  self.clearOverride = () =>
  {
    self.clearOverrideFetching(true);
    self.clearOverrideSuccess(false);
    $.ajax({
      method: "DELETE",
      url: self.baseEndpoint() + "/override"
    }).done(() => {
      self.clearOverrideSuccess(true);
    }).fail(() => {
      alert("Failed to clear manual override");
    }).always(() => {
      self.clearOverrideFetching(false);
    });
  };

  // -----------------------------------------------------------------------
  // Event: Update
  // -----------------------------------------------------------------------

  // Support for OTA update of the OpenEVSE
  self.updateFetching = ko.observable(false);
  self.updateComplete = ko.observable(false);
  self.updateError = ko.observable("");
  self.updateFilename = ko.observable("");
  self.updateLoaded = ko.observable(0);
  self.updateTotal = ko.observable(1);
  self.updateProgress = ko.pureComputed(() => {
    return (self.updateLoaded() / self.updateTotal()) * 100;
  });

  self.otaUpdate = () => {
    if("" === self.updateFilename()) {
      self.updateError("Filename not set");
      return;
    }

    self.updateFetching(true);
    self.updateError("");

    var form = $("#upload_form")[0];
    var data = new FormData(form);

    $.ajax({
      url: "/update",
      type: "POST",
      data: data,
      contentType: false,
      processData:false,
      xhr: () => {
        var xhr = new window.XMLHttpRequest();
        xhr.upload.addEventListener("progress", (evt) => {
          if (evt.lengthComputable) {
            self.updateLoaded(evt.loaded);
            self.updateTotal(evt.total);
          }
        }, false);
        return xhr;
      }
    }).done((msg) => {
      console.log(msg);
      if("OK" === msg) {
        self.updateComplete(true);
        setTimeout(() => {
          location.reload();
        }, 2500);
      } else {
        self.updateError(msg);
      }
    }).fail(() => {
      self.updateError("HTTP Update failed");
    }).always(() => {
      self.updateFetching(false);
    });
  };

}

