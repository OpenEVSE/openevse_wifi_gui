/* global $, ko, ConfigViewModel, StatusViewModel, RapiViewModel, WiFiScanViewModel, WiFiConfigViewModel, OpenEvseViewModel, PasswordViewModel, ZonesViewModel, ConfigGroupViewModel, ScheduleViewModel, VehicleViewModel, EventLogViewModel */
/* exported OpenEvseWiFiViewModel */

function OpenEvseWiFiViewModel(baseHost, basePort, baseProtocol)
{
  "use strict";
  var self = this;

  self.baseHost = ko.observable("" !== baseHost ? baseHost : "openevse.local");
  self.basePort = ko.observable(basePort);
  self.baseProtocol = ko.observable(baseProtocol);

  self.baseEndpoint = ko.pureComputed(function () {
    var endpoint = "//" + self.baseHost();
    if(80 !== self.basePort()) {
      endpoint += ":"+self.basePort();
    }
    return endpoint;
  });

  self.config = new ConfigViewModel(self.baseEndpoint);
  self.status = new StatusViewModel(self.baseEndpoint);
  self.rapi = new RapiViewModel(self.baseEndpoint);
  self.scan = new WiFiScanViewModel(self.baseEndpoint);
  self.wifi = new WiFiConfigViewModel(self.baseEndpoint, self.config, self.status, self.scan);
  self.openevse = new OpenEvseViewModel(self.baseEndpoint, self.config, self.status);
  self.zones = new ZonesViewModel(self.baseEndpoint);
  self.schedule = new ScheduleViewModel(self.baseEndpoint);
  self.vehicle = new VehicleViewModel(self.baseEndpoint, self.config, self.status);
  self.logs = new EventLogViewModel(self.baseEndpoint);
  self.rfid = new RFIDViewModel(self.baseEndpoint, self.status);

  self.initialised = ko.observable(false);
  self.updating = ko.observable(false);
  self.scanUpdating = ko.observable(false);

  self.wifi.selectedNet.subscribe((net) => {
    if(false !== net) {
      self.config.ssid(net.ssid());
    }
  });

  self.config.ssid.subscribe((ssid) => {
    self.wifi.setSsid(ssid);
  });

  // Info text display state
  self.showMqttInfo = ko.observable(false);
  self.showSolarDivert = ko.observable(false);
  self.showSafety = ko.observable(false);
  self.showVehiclePauseStatus = ko.observable(false);
  self.showTeslaAdvancedInfo = ko.observable(false);

  self.vehicle.tesla.advanced.subscribe(() => {
    self.showTeslaAdvancedInfo(false);
  });

  self.toggle = function (flag) {
    flag(!flag());
  };

  self.status.state.subscribe(() => {
    self.logs.addLog(self.status);
  });
  self.status.flags.subscribe(() => {
    self.logs.addLog(self.status);
  });

  // Advanced mode
  self.advancedMode = ko.observable(false);
  self.advancedMode.subscribe(function (val) {
    self.setCookie("advancedMode", val.toString());
  });

  // Developer mode
  self.developerMode = ko.observable(false);
  self.developerMode.subscribe(function (val) {
    self.setCookie("developerMode", val.toString());
    if(val) {
      self.advancedMode(true); // Enabling dev mode implicitly enables advanced mode
    }
  });

  self.waitForRFID = function () {
    this.rfid.startWaiting();
    console.log("Waiting for RFID");
  };

  var updateTimer = null;
  var updateTime = 5 * 1000;

  var scanTimer = null;
  var scanTime = 3 * 1000;

  // Get time update events
  self.status.time.subscribe((time) => {
    self.openevse.time.timeUpdate(new Date(time));
  });

  // Time source
  self.timeSource = ko.computed({
    read: function() {
      return self.config.sntp_enabled() ? "ntp" : (
        self.openevse.time.automaticTime() ? "browser" : "manual"
      );
    },
    write: function(val) {
      switch(val)
      {
        case "ntp":
          self.config.sntp_enabled(true);
          self.openevse.time.automaticTime(true);
          break;
        case "browser":
          self.config.sntp_enabled(false);
          self.openevse.time.automaticTime(true);
          break;
        case "manual":
          self.config.sntp_enabled(false);
          self.openevse.time.automaticTime(false);
          break;
      }
    }
  });

  self.time_zone = ko.computed({
    read: () => {
      return self.config.time_zone();
    },
    write: (val) => {
      if(undefined !== val && false === self.zones.fetching()) {
        self.config.time_zone(val);
      }
    }
  });

  // Tabs
  var tab = "status";
  if("" !== window.location.hash) {
    tab = window.location.hash.substr(1);
  }
  self.tab = ko.observable(tab);
  self.tab.subscribe(function (val) {
    window.location.hash = "#" + val;
  });
  self.isSystem = ko.pureComputed(function() { return "system" === self.tab(); });
  self.isServices = ko.pureComputed(function() { return "services" === self.tab(); });
  self.isStatus = ko.pureComputed(function() { return "status" === self.tab(); });
  self.isRapi = ko.pureComputed(function() { return "rapi" === self.tab(); });
  self.isVehicle = ko.pureComputed(function() { return "vehicle" === self.tab(); });

  // Upgrade URL
  self.upgradeUrl = ko.observable("about:blank");

  // Show/hide password state
  self.wifiPassword = new PasswordViewModel(self.config.pass);
  self.emoncmsApiKey = new PasswordViewModel(self.config.emoncms_apikey);
  self.mqttPassword = new PasswordViewModel(self.config.mqtt_pass);
  self.wwwPassword = new PasswordViewModel(self.config.www_password);

  function split_emoncms_server() {
    var proto = self.config.emoncms_server().split("://", 2);
    if(proto.length > 1) {
      return proto;
    }

    return [
      self.config.http_supported_protocols()[0],
      proto[0]
    ];
  }

  // EmonCMS endpoint config
  self.emoncms_protocol = ko.computed({
    read: function () {
      if(0 == self.config.http_supported_protocols().length) {
        return "";
      }
      return split_emoncms_server()[0];
    },
    write: function(val) {
      if(self.config.http_supported_protocols().length > 0) {
        self.config.emoncms_server(val + "://" + split_emoncms_server()[1]);
      }
    }
  });
  self.emoncms_server = ko.computed({
    read: function () {
      if(0 == self.config.http_supported_protocols().length) {
        return self.config.emoncms_server();
      }
      return split_emoncms_server()[1];
    },
    write: function(val) {
      if(self.config.http_supported_protocols().length > 0) {
        var parts = val.split("://", 2);
        var proto = parts.length > 1 ? parts[0] : split_emoncms_server()[0];
        var host = parts.length > 1 ? parts[1] : val;
        self.config.emoncms_server(proto + "://" + host);
      } else {
        self.config.emoncms_server(val);
      }
    }
  });

  // MQTT port update
  self.config.mqtt_protocol.subscribe((val) => {
    switch(val)
    {
      case "mqtt":
        if(self.config.mqtt_port() == "8883") {
          self.config.mqtt_port("1883");
        }
        break;
      case "mqtts":
        if(self.config.mqtt_port() == "1883") {
          self.config.mqtt_port("8883");
        }
        break;
    }
  });

  // -----------------------------------------------------------------------
  // Initialise the app
  // -----------------------------------------------------------------------
  self.loadedCount = ko.observable(0);
  self.itemsLoaded = ko.pureComputed(function () {
    return self.loadedCount() + self.openevse.updateCount();
  });
  self.itemsTotal = ko.observable(4 + self.openevse.updateTotal());
  self.start = function () {
    self.updating(true);
    self.status.update(function () {
      self.loadedCount(self.loadedCount() + 1);
      self.config.update(function () {
        self.loadedCount(self.loadedCount() + 1);
        self.schedule.update(function () {
          self.loadedCount(self.loadedCount() + 1);
          self.logs.update(() => {
            self.loadedCount(self.loadedCount() + 1);
            if(self.status.rapi_connected()) {
              self.openevse.update(self.finishedStarting);
            } else {
              self.finishedStarting();
              self.status.rapi_connected.subscribe((val) => {
                if(val) {
                  self.config.update(() => {
                    self.openevse.update(() => {
                    });
                  });
                }
              });
            }
          });
        });
      });
      self.status.connect();
    });

    // Set the advanced and developer modes from Cookies
    self.advancedMode(self.getCookie("advancedMode", "false") === "true");
    self.developerMode(self.getCookie("developerMode", "false") === "true");
  };

  self.finishedStarting = function () {
    self.initialised(true);
    updateTimer = setTimeout(self.update, updateTime);

    // Load the upgrade frame
    self.upgradeUrl(self.baseEndpoint() + "/update");

    // Load the images
    var imgDefer = document.getElementsByTagName("img");
    for (var i=0; i<imgDefer.length; i++) {
      if(imgDefer[i].getAttribute("data-src")) {
        imgDefer[i].setAttribute("src", imgDefer[i].getAttribute("data-src"));
      }
    }

    // Load the Time Zone information
    if(false !== self.config.time_zone()) {
      self.zones.initialValue(self.config.time_zone());
      self.zones.update(() => {
        self.config.time_zone.valueHasMutated();
      });
    }

    // Subscribe to config changes
    self.status.config_version.subscribe(() => {
      self.config.update(() => {
        self.status.update();
      });
    });

    self.updating(false);
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

  self.wifiConnecting = ko.observable(false);
  self.status.mode.subscribe(function (newValue) {
    if(newValue === "STA+AP" || newValue === "STA") {
      self.wifiConnecting(false);
    }
    if(newValue === "STA+AP" || newValue === "AP") {
      self.startScan();
    } else {
      self.stopScan();
    }
  });

  // -----------------------------------------------------------------------
  // Event: WiFi Connect
  // -----------------------------------------------------------------------
  self.saveNetworkFetching = ko.observable(false);
  self.saveNetworkSuccess = ko.observable(false);
  self.saveNetwork = function () {
    if (self.config.ssid() === "") {
      alert("Please select network");
    } else {
      self.saveNetworkFetching(true);
      self.saveNetworkSuccess(false);
      $.post(self.baseEndpoint() + "/savenetwork", { ssid: self.config.ssid(), pass: self.config.pass() }, function () {
        self.saveNetworkSuccess(true);
        self.wifiConnecting(true);
      }).fail(function () {
        alert("Failed to save WiFi config");
      }).always(function () {
        self.saveNetworkFetching(false);
      });
    }
  };

  // -----------------------------------------------------------------------
  // Event: Admin save
  // -----------------------------------------------------------------------
  self.saveAdminFetching = ko.observable(false);
  self.saveAdminSuccess = ko.observable(false);
  self.saveAdmin = function () {
    self.saveAdminFetching(true);
    self.saveAdminSuccess(false);
    $.post(self.baseEndpoint() + "/saveadmin", { user: self.config.www_username(), pass: self.config.www_password() }, function () {
      self.saveAdminSuccess(true);
    }).fail(function () {
      alert("Failed to save Admin config");
    }).always(function () {
      self.saveAdminFetching(false);
    });
  };

  // -----------------------------------------------------------------------
  // Event: Advanced save
  // -----------------------------------------------------------------------
  self.advancedGroup = new ConfigGroupViewModel(self.baseEndpoint, () => {
    return {
      hostname: self.config.hostname(),
      sntp_hostname: self.config.sntp_hostname()
    };
  }).done(() => {
    if (confirm("These changes require a reboot to take effect. Reboot now?")) {
      $.post(self.baseEndpoint() + "/restart", { }, function () {
        setTimeout(() => {
          var newLocation = "http://" + self.config.hostname() + ".local";
          if(80 != self.basePort()) {
            newLocation += ":" + self.basePort();
          }
          newLocation += "/";
          window.location.replace(newLocation);
        }, 5*1000);
      }).fail(function () {
        alert("Failed to restart");
      });
    }
  });

  // -----------------------------------------------------------------------
  // Event: Add RFID tag
  // -----------------------------------------------------------------------
  self.addRFIDTag = function(tag) {
    let storage = self.config.rfid_storage();
    if(!storage || !storage.includes(tag)){
      let newStorage = storage + (storage == '' ? '':',') + tag
      self.config.rfid_storage(newStorage);
    }
    self.rfidGroup.save();
  }

  // -----------------------------------------------------------------------
  // Event: Remove RFID tag
  // -----------------------------------------------------------------------
  self.removeRFIDTag = function(tag) {
    var replace = new RegExp(`${tag},?`,"g");
    self.config.rfid_storage(self.config.rfid_storage().replaceAll(replace, ""));
    self.rfidGroup.save();
  };

  // -----------------------------------------------------------------------
  // Event: Clear RFID tags
  // -----------------------------------------------------------------------
  self.clearRFIDTags = function() {
    if (confirm(`You are about to remove all stored tags permanently!`)){
      self.config.rfid_storage("");
      self.rfidGroup.save();
    }
  }

  // -----------------------------------------------------------------------
  // Event: RFID save
  // -----------------------------------------------------------------------
  self.rfidGroup = new ConfigGroupViewModel(self.baseEndpoint, () => {
    return {
      rfid_enabled: self.config.rfid_enabled(),
      rfid_storage: self.config.rfid_storage()
    };
  });

  // -----------------------------------------------------------------------
  // Event: Emoncms save
  // -----------------------------------------------------------------------
  self.saveEmonCmsFetching = ko.observable(false);
  self.saveEmonCmsSuccess = ko.observable(false);
  self.saveEmonCms = function () {
    var emoncms = {
      enable: self.config.emoncms_enabled(),
      server: self.config.emoncms_server(),
      apikey: self.config.emoncms_apikey(),
      node: self.config.emoncms_node(),
      fingerprint: self.config.emoncms_fingerprint()
    };

    if (emoncms.enable && (emoncms.server === "" || emoncms.node === "")) {
      alert("Please enter Emoncms server and node");
    } else if (emoncms.enable && emoncms.apikey.length !== 32 && !self.emoncmsApiKey.isDummy()) {
      alert("Please enter valid Emoncms apikey");
    } else if (emoncms.enable && emoncms.fingerprint !== "" && emoncms.fingerprint.length !== 59) {
      alert("Please enter valid SSL SHA-1 fingerprint");
    } else {
      self.saveEmonCmsFetching(true);
      self.saveEmonCmsSuccess(false);
      $.post(self.baseEndpoint() + "/saveemoncms", emoncms, function () {
        self.saveEmonCmsSuccess(true);
      }).fail(function () {
        alert("Failed to save Admin config");
      }).always(function () {
        self.saveEmonCmsFetching(false);
      });
    }
  };

  // -----------------------------------------------------------------------
  // Event: MQTT save
  // -----------------------------------------------------------------------
  self.mqttGroup = new ConfigGroupViewModel(self.baseEndpoint, () => {
    return {
      mqtt_enabled: self.config.mqtt_enabled(),
      divert_enabled: self.config.divert_enabled(),
      mqtt_protocol: self.config.mqtt_protocol(),
      mqtt_server: self.config.mqtt_server(),
      mqtt_port: self.config.mqtt_port(),
      mqtt_reject_unauthorized: self.config.mqtt_reject_unauthorized(),
      mqtt_topic: self.config.mqtt_topic(),
      mqtt_user: self.config.mqtt_user(),
      mqtt_pass: self.config.mqtt_pass(),
      mqtt_vrms: self.config.mqtt_vrms()
    };
  }).validate((mqtt) => {
    if(!self.config.mqtt_enabled()) {
      self.config.divert_enabled(false);
    }

    if (mqtt.mqtt_enabled && mqtt.mqtt_server === "") {
      alert("Please enter MQTT server");
      return false;
    }

    return true;
  });

  // -----------------------------------------------------------------------
  // Event: Vehicle MQTT save
  // -----------------------------------------------------------------------
  self.vehicleStateGroup = new ConfigGroupViewModel(self.baseEndpoint, () => {
    if(false === self.config.tesla_enabled()) {
      self.config.tesla_access_token("");
      self.config.tesla_refresh_token("");
      self.config.tesla_created_at(0);
      self.config.tesla_expires_in(0);
    }

    return {
      mqtt_vehicle_soc: self.config.mqtt_vehicle_soc(),
      mqtt_vehicle_range: self.config.mqtt_vehicle_range(),
      mqtt_vehicle_range_miles: self.config.mqtt_vehicle_range_miles(),
      mqtt_vehicle_eta: self.config.mqtt_vehicle_eta(),
      tesla_enabled: self.config.tesla_enabled(),
      tesla_access_token: self.config.tesla_access_token(),
      tesla_refresh_token: self.config.tesla_refresh_token(),
      tesla_created_at: self.config.tesla_created_at(),
      tesla_expires_in: self.config.tesla_expires_in(),
      tesla_vehicle_id: self.config.tesla_vehicle_id(),
      ovms_enabled: self.config.ovms_enabled()
    };

  }).validate((vehicle) => {
    if (vehicle.tesla_enabled && vehicle.tesla_access_token === "") {
      alert("No Tesla API Access token set");
      return false;
    }

    if (vehicle.tesla_enabled && vehicle.tesla_refresh_token === "") {
      alert("No Tesla API Refresh token set");
      return false;
    }

    return true;
  });
  self.vehicleStateGroup.success.subscribe((val) => {
    if (val) {
      self.vehicle.tesla.advancedUpdate(false);
    }
  });

  // Event: OCPP 1.6 save
  // -----------------------------------------------------------------------
  self.ocppGroup = new ConfigGroupViewModel(self.baseEndpoint, () => {
    return {
      ocpp_enabled: self.config.ocpp_enabled(),
      ocpp_server: self.config.ocpp_server(),
      ocpp_chargeBoxId: self.config.ocpp_chargeBoxId(),
      ocpp_idTag: self.config.ocpp_idTag(),
      tx_start_point: self.config.tx_start_point(),
      ocpp_suspend_evse: self.config.ocpp_suspend_evse(),
      ocpp_energize_plug: self.config.ocpp_energize_plug()
    };
  }).validate((ocpp) => {

    if (ocpp.ocpp_enabled == false) {
      return true;
    }

    let csUrl = ocpp.ocpp_server.trim();
    if (csUrl.length <= 0) {
      alert("Please enter OCPP server URL");
      return false;
    }

    if (csUrl.charAt(csUrl.length - 1) !== "/") {
      csUrl += "/";
    }

    let cbId = ocpp.ocpp_chargeBoxId.trim();
    csUrl += cbId;

    let validatedUrl;
    try {
      validatedUrl = new URL(csUrl);
    } catch (_) {
      alert("Please enter valid OCPP server URL and valid charge box ID");
      return false;
    }

    if (validatedUrl.protocol !== "ws:" && validatedUrl.protocol !== "wss:") {
      alert("OCPP only allows ws: and wss: as protocol");
      return false;
    }

    return true;
  });

  // -----------------------------------------------------------------------
  // Event: Vehicle settings save
  // -----------------------------------------------------------------------
  self.vehicleGroup = new ConfigGroupViewModel(self.baseEndpoint, () => {
    return {
      pause_uses_disabled: self.config.pause_uses_disabled()
    };
  });
  self.config.pause_uses_disabled.subscribe(() => {
    self.vehicleGroup.save();
  });

  // -----------------------------------------------------------------------
  // Event: Display settings save
  // -----------------------------------------------------------------------
  self.displayGroup = new ConfigGroupViewModel(self.baseEndpoint, () => {
    return {
      led_brightness: self.config.led_brightness()
    };
  });
  self.config.led_brightness.subscribe(() => {
    self.displayGroup.save();
  });

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

  self.openEvseGfciCheckDisabled = self.openEvseSetting("gfci_check");
  self.openEvseGroundCheckDisabled = self.openEvseSetting("ground_check");
  self.openEvseRelayCheckDisabled = self.openEvseSetting("relay_check");
  self.openEvseTempCheckDisabled = self.openEvseSetting("temp_check");
  self.openEvseDiodeCheckDisabled = self.openEvseSetting("diode_check");
  self.openEvseVentCheckDisabled = self.openEvseSetting("vent_check");
  self.openEvseService = self.openEvseSetting("service");
  self.openEvseScale = self.openEvseSetting("scale");
  self.openEvseOffset = self.openEvseSetting("offset");
  self.openEvseMaxCurrentSoft = self.openEvseSetting("max_current_soft");

  // -----------------------------------------------------------------------
  // Event: PV Divert save
  // -----------------------------------------------------------------------
  self.divertGroup = new ConfigGroupViewModel(self.baseEndpoint, () => {
    return {
      divert_enabled: self.config.divert_enabled(),
      mqtt_solar: self.config.mqtt_solar(),
      mqtt_grid_ie: self.config.mqtt_grid_ie(),
      divert_PV_ratio: self.config.divert_PV_ratio(),
      divert_attack_smoothing_factor: self.config.divert_attack_smoothing_factor(),
      divert_decay_smoothing_factor: self.config.divert_decay_smoothing_factor(),
      divert_min_charge_time: self.config.divert_min_charge_time()
    };
  }).validate((divert) => {
    if (divert.divert_enabled && divert.mqtt_solar === "" && divert.mqtt_grid_ie === "") {
      alert("Please enter either a Solar PV or Grid I/E feed");
      return false;
    }

    return true;
  });

  self.chargeMode = new ConfigGroupViewModel(self.baseEndpoint, () => {
    return {
      charge_mode: self.config.charge_mode()
    };
  });

  self.isEcoModeAvailable = ko.pureComputed(function () {
    return self.config.mqtt_enabled() && self.config.divert_enabled() &&
           ("" !== self.config.mqtt_solar() ||
            "" !== self.config.mqtt_grid_ie());
  });

  self.ecoMode = ko.pureComputed({
    read: function () {
      return "eco" === self.config.charge_mode();
    },
    write: function(val) {
      self.config.charge_mode((val && self.config.divert_enabled()) ? "eco" : "fast");
      self.chargeMode.save();
    }
  });

  self.status.divertmode.subscribe((val) => {
    switch(val)
    {
      case 1: self.config.charge_mode("fast"); break;
      case 2: self.config.charge_mode("eco"); break;
    }
  });

  self.haveSolar = ko.pureComputed(function () {
    return "" !== self.config.mqtt_solar();
  });

  self.haveGridIe =ko.pureComputed(function () {
    return "" !== self.config.mqtt_grid_ie();
  });

  self._divertFeedType = "grid_ie";
  self.divertFeedType = ko.computed({
    read: () => {
      var ret = self.haveSolar() ? "solar" :
        self.haveGridIe() ? "grid_ie" :
          self._divertFeedType;
      self._divertFeedType = ret;
      return ret;
    },
    write: (val) => {
      if("solar" === val && self.haveGridIe()) {
        self.config.mqtt_solar(self.config.mqtt_grid_ie());
        self.config.mqtt_grid_ie("");
      } else if("grid_ie" === val && self.haveSolar()) {
        self.config.mqtt_grid_ie(self.config.mqtt_solar());
        self.config.mqtt_solar("");
      }
      self._divertFeedType = val;
    }
  });
  self.divertFeedValue = ko.computed({
    read: () => {
      return "solar" === self.divertFeedType() ?
        self.config.mqtt_solar() :
        self.config.mqtt_grid_ie();
    },
    write: (val) => {
      if("solar" === self.divertFeedType()) {
        self.config.mqtt_solar(val);
      } else {
        self.config.mqtt_grid_ie(val);
      }
    }
  });

  // -----------------------------------------------------------------------
  // Event: Save Ohm Connect Key
  // -----------------------------------------------------------------------
  self.saveOhmKeyFetching = ko.observable(false);
  self.saveOhmKeySuccess = ko.observable(false);
  self.saveOhmKey = function () {
    self.saveOhmKeyFetching(true);
    self.saveOhmKeySuccess(false);
    $.post(self.baseEndpoint() + "/saveohmkey", {
      enable: self.config.ohm_enabled(),
      ohm: self.config.ohmkey()
    }, function () {
      self.saveOhmKeySuccess(true);
    }).fail(function () {
      alert("Failed to save Ohm key config");
    }).always(function () {
      self.saveOhmKeyFetching(false);
    });
  };

  // -----------------------------------------------------------------------
  // Event: Save Current Shaper
  // -----------------------------------------------------------------------
  self.saveCurrentShaperFetching = ko.observable(false);
  self.saveCurrentShaperSuccess = ko.observable(false);
  self.saveCurrentShaper = function () {
    self.saveCurrentShaperFetching(true);
    self.saveCurrentShaperSuccess(false);
    $.post(self.baseEndpoint() + "/saveshaper", {
      enable: self.config.current_shaper_enabled(),
      livepwr: self.config.mqtt_live_pwr(),
      maxpwr: self.config.current_shaper_max_pwr()
    }, function () {
      self.saveCurrentShaperSuccess(true);
    }).fail(function () {
      alert("Failed to save Current Shaper config");
    }).always(function () {
      self.saveCurrentShaperFetching(false);
    });
  };

  // -----------------------------------------------------------------------
  // Event: Set the time
  // -----------------------------------------------------------------------
  self.setTimeFetching = ko.observable(false);
  self.setTimeSuccess = ko.observable(false);
  self.setTime = function () {
    self.setTimeFetching(true);
    self.setTimeSuccess(false);

    var newTime = self.openevse.time.automaticTime() ? new Date() : self.openevse.time.evseTimedate();
    if(false == self.status.time())
    {
      self.openevse.openevse.time((date,valid=true) => {
        self.setTimeFetching(false);
        self.setTimeSuccess(valid);

        self.openevse.time.timeUpdate(date, valid);
      }, newTime);
    } else {
      var sntp = self.config.sntp_enabled();

      var params = {
        ntp: sntp,
        tz: self.time_zone()
      };
      if(false === sntp) {
        params.time = newTime.toISOString();
      }

      $.post(self.baseEndpoint() + "/settime", params, () => {
        self.setTimeFetching(false);
        self.setTimeSuccess(true);
      }).fail(() => {
        alert("Failed to set time");
        self.setTimeFetching(false);
      });
    }
  };

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
          window.location = "http://" + self.status.ipaddress();
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

  // -----------------------------------------------------------------------
  // Event: Reset config and reboot
  // -----------------------------------------------------------------------
  self.factoryResetFetching = ko.observable(false);
  self.factoryResetSuccess = ko.observable(false);
  self.factoryReset = function() {
    if (confirm("CAUTION: Do you really want to Factory Reset? All setting and config will be lost.")) {
      self.factoryResetFetching(true);
      self.factoryResetSuccess(false);
      $.post(self.baseEndpoint() + "/reset", { }, function () {
        self.factoryResetSuccess(true);
      }).fail(function () {
        alert("Failed to Factory Reset");
      }).always(function () {
        self.factoryResetFetching(false);
      });
    }
  };


  // -----------------------------------------------------------------------
  // Event: Restart
  // -----------------------------------------------------------------------
  self.restartFetching = ko.observable(false);
  self.restartSuccess = ko.observable(false);
  self.restart = function() {
    if (confirm("Restart OpenEVSE WiFi? Current config will be saved, takes approximately 10s.")) {
      self.restartFetching(true);
      self.restartSuccess(false);
      $.post(self.baseEndpoint() + "/restart", { }, function () {
        self.restartSuccess(true);
      }).fail(function () {
        alert("Failed to restart");
      }).always(function () {
        self.restartFetching(false);
      });
    }
  };

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
  self.updateProgress = ko.pureComputed(function () {
    return (self.updateLoaded() / self.updateTotal()) * 100;
  });

  self.otaUpdate = function() {
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
      xhr: function() {
        var xhr = new window.XMLHttpRequest();
        xhr.upload.addEventListener("progress", function(evt) {
          if (evt.lengthComputable) {
            self.updateLoaded(evt.loaded);
            self.updateTotal(evt.total);
          }
        }, false);
        return xhr;
      }
    }).done(function(msg) {
      console.log(msg);
      if("OK" == msg) {
        self.updateComplete(true);
        setTimeout(() => {
          location.reload();
        }, 2500);
      } else {
        self.updateError(msg);
      }
    }).fail(function () {
      self.updateError("HTTP Update failed");
    }).always(function () {
      self.updateFetching(false);
    });
  };

  // Cookie management, based on https://www.w3schools.com/js/js_cookies.asp
  self.setCookie = function (cname, cvalue, exdays = false) {
    var expires = "";
    if(false !== exdays) {
      var d = new Date();
      d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
      expires = ";expires="+d.toUTCString();
    }
    document.cookie = cname + "=" + cvalue + expires + ";path=/";
  };

  self.getCookie = function (cname, def = "") {
    var name = cname + "=";
    var ca = document.cookie.split(";");
    for(var i = 0; i < ca.length; i++) {
      var c = ca[i];
      while (c.charAt(0) === " ") {
        c = c.substring(1);
      }
      if (c.indexOf(name) === 0) {
        return c.substring(name.length, c.length);
      }
    }
    return def;
  };
}
