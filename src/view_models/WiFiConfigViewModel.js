/* global $, ko, ConfigGroupViewModel */
/* exported WiFiConfigViewModel */

function WiFiConfigViewModel(baseEndpoint, config, status, scan) {
  "use strict";
  var self = this;

  self.baseEndpoint = baseEndpoint;
  self.config = config;
  self.status = status;
  self.scan = scan;

  self.scanUpdating = ko.observable(false);

  self.selectedNet = ko.observable(false);
  self.bssid = ko.pureComputed({
    read: () => {
      return (false === self.selectedNet()) ? "" : self.selectedNet().bssid();
    },
    write: (bssid) => {
      for(var i = 0; i < self.scan.results().length; i++) {
        var net = self.scan.results()[i];
        if(bssid === net.bssid()) {
          self.selectedNet(net);
          return;
        }
      }
    }
  });
  self.select = function(item) {
    self.selectedNet(item);
  };

  self.setSsid = function(ssid)
  {
    if(false !== self.selectedNet() && ssid === self.selectedNet().ssid()) {
      return;
    }

    for(var i = 0; i < self.scan.filteredResults().length; i++) {
      var net = self.scan.filteredResults()[i];
      if(ssid === net.ssid()) {
        self.selectedNet(net);
        return;
      }
    }

    for(var i = 0; i < self.scan.results().length; i++) {
      var net = self.scan.results()[i];
      if(ssid === net.ssid()) {
        self.selectedNet(net);
        return;
      }
    }

    self.selectedNet(false);
  }

  var scanTimer = null;
  var scanTime = 3 * 1000;

  // -----------------------------------------------------------------------
  // WiFi scan update
  // -----------------------------------------------------------------------
  var scanEnabled = false;
  self.startScan = function () {
    if (self.scanUpdating()) {
      return;
    }
    scanEnabled = true;
    self.scanUpdating(true);
    if (null !== scanTimer) {
      clearTimeout(scanTimer);
      scanTimer = null;
    }
    self.scan.update(function () {
      if(scanEnabled) {
        scanTimer = setTimeout(self.startScan, scanTime);
      }

      // if bssid is not set see if we have a ssid that matches our configured result
      if("" === self.bssid()) {
        var ssid = self.config.ssid();
        for(var i = 0; i < self.scan.results().length; i++) {
          var net = self.scan.results()[i];
          if(ssid === net.ssid()) {
            self.bssid(net.bssid());
            break;
          }
        }
      }

      self.scanUpdating(false);
    });
  };

  self.stopScan = function() {
    scanEnabled = false;
    if (self.scanUpdating()) {
      return;
    }

    if (null !== scanTimer) {
      clearTimeout(scanTimer);
      scanTimer = null;
    }
  };

  self.enableScan = function (enable) {
    if(enable) {
      self.startScan();
    } else {
      self.stopScan();
    }
  };

  self.forceConfig = ko.observable(false);
  self.canConfigure = ko.pureComputed(function () {
    if(self.status.isWiFiError() || self.wifiConnecting() || self.status.isWired()) {
      return false;
    }

    return !self.status.isWifiClient() || self.forceConfig();
  });

  self.wifiConnecting = ko.observable(false);
  self.canConfigure.subscribe(function (newValue) {
    self.enableScan(newValue);
  });
  self.status.wifi_client_connected.subscribe(function (newValue) {
    if(newValue) {
      self.wifiConnecting(false);
    }
  });
  self.enableScan(self.canConfigure());

  // -----------------------------------------------------------------------
  // Event: WiFi Connect
  // -----------------------------------------------------------------------
  self.networkGroup = new ConfigGroupViewModel(self.baseEndpoint, () => {
    return {
      ssid: self.config.ssid(),
      pass: self.config.pass()
    };
  }).validate((net) => {
    if (net.ssid === "") {
      alert("Please select network");
      return false;
    }

    return true;
  }).done(() => {
    // HACK: Almost certainly won't get a status update with client connected set to false so manually clear it here
    self.status.wifi_client_connected(false);

    // Done with setting the config
    self.forceConfig(false);

    // Wait for a new WiFi connection
    self.wifiConnecting(true);
  });

  // -----------------------------------------------------------------------
  // Event: Turn off Access Point
  // -----------------------------------------------------------------------
  self.turnOffAccessPointFetching = ko.observable(false);
  self.turnOffAccessPointSuccess = ko.observable(false);
  self.turnOffAccessPoint = function () {
    self.turnOffAccessPointFetching(true);
    self.turnOffAccessPointSuccess(false);
    $.post(self.baseEndpoint() + "/apoff", {
    }, function (data) {
      console.log(data);
      if (self.status.ipaddress() !== "") {
        setTimeout(function () {
          window.location = "//" + self.status.ipaddress();
          self.turnOffAccessPointSuccess(true);
        }, 3000);
      } else {
        self.turnOffAccessPointSuccess(true);
      }
    }).fail(function () {
      alert("Failed to turn off Access Point");
    }).always(function () {
      self.turnOffAccessPointFetching(false);
    });
  };
}
