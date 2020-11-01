/* global $, ko, ConfigViewModel, StatusViewModel, RapiViewModel, WiFiScanViewModel, WiFiConfigViewModel, OpenEvseViewModel, PasswordViewModel, ZonesViewModel, ConfigGroupViewModel */
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

  self.wsEndpoint = ko.pureComputed(function () {
    var endpoint = "ws://" + self.baseHost();
    if("https:" === self.baseProtocol()){
      endpoint = "wss://" + self.baseHost();
    }
    if(80 !== self.basePort()) {
      endpoint += ":"+self.basePort();
    }
    endpoint += "/ws";
    return endpoint;
  });

  self.config = new ConfigViewModel(self.baseEndpoint);
  self.status = new StatusViewModel(self.baseEndpoint);
  self.rapi = new RapiViewModel(self.baseEndpoint);
  self.scan = new WiFiScanViewModel(self.baseEndpoint);
  self.wifi = new WiFiConfigViewModel(self.baseEndpoint, self.config, self.status, self.scan);
  self.openevse = new OpenEvseViewModel(self.baseEndpoint, self.config, self.status);
  self.zones = new ZonesViewModel(self.baseEndpoint);

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
  
  self.toggle = function (flag) {
    flag(!flag());
  };

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
  self.itemsTotal = ko.observable(2 + self.openevse.updateTotal());
  self.start = function () {
    self.updating(true);
    self.status.update(function () {
      self.loadedCount(self.loadedCount() + 1);
      self.config.update(function () {
        self.loadedCount(self.loadedCount() + 1);
        // If we are accessing on a .local domain try and redirect
        if(self.baseHost().endsWith(".local") && "" !== self.status.ipaddress()) {
          if("" === self.config.www_username())
          {
            // Redirect to the IP internally
            self.baseHost(self.status.ipaddress());
          } else {
            window.location.replace("http://" + self.status.ipaddress() + ":" + self.basePort());
          }
        }
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
      self.connect();
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
    return self.config.mqtt_enabled() &&
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
      } else {
        self.updateError(msg);
      }
    }).fail(function () {
      self.updateError("HTTP Update failed");
    }).always(function () {
      self.updateFetching(false);
    });
  };

  // -----------------------------------------------------------------------
  // Event: Update
  // -----------------------------------------------------------------------

  // Support for OTA update of the Controller
  self.updateControllerFetching = ko.observable(false);
  self.updateControllerComplete = ko.observable(false);
  self.updateControllerError = ko.observable("");
  self.updateControllerFilename = ko.observable("");
  self.updateControllerLoaded = ko.observable(0);
  self.updateControllerTotal = ko.observable(1);
  self.updateControllerProgress = ko.pureComputed(function () {
    return (self.updateControllerLoaded() / self.updateControllerTotal()) * 100;
  });

  self.otaUpdateController = function () {
    if ("" === self.updateControllerFilename()) {
      self.updateControllerError("Filename not set");
      return;
    }

    self.updateControllerFetching(true);
    self.updateControllerError("");

    var form = $("#upload_controller_form")[0];
    var data = new FormData(form);

    $.ajax({
      url: "/updateController",
      type: "POST",
      data: data,
      contentType: false,
      processData: false,
      xhr: function () {
        var xhr = new window.XMLHttpRequest();
        xhr.upload.addEventListener("progress", function (evt) {
          if (evt.lengthComputable) {
            self.updateControllerLoaded(evt.loaded);
            self.updateControllerTotal(evt.total);
          }
        }, false);
        return xhr;
      }
    }).done(function (msg) {
      console.log(msg);
      if ("OK" == msg) {
        self.updateControllerComplete(true);
      } else {
        self.updateControllerError(msg);
      }
    }).fail(function () {
      self.updateControllerError("HTTP Update failed");
    }).always(function () {
      self.updateControllerFetching(false);
    });
  };

  // -----------------------------------------------------------------------
  // Receive events from the server
  // -----------------------------------------------------------------------
  self.pingInterval = false;
  self.reconnectInterval = false;
  self.socket = false;
  self.connect = function () {
    self.socket = new WebSocket(self.wsEndpoint());
    self.socket.onopen = function (ev) {
      console.log(ev);
      self.pingInterval = setInterval(function () {
        self.socket.send("{\"ping\":1}");
      }, 1000);
    };
    self.socket.onclose = function (ev) {
      console.log(ev);
      self.reconnect();
    };
    self.socket.onmessage = function (msg) {
      console.log(msg);
      ko.mapping.fromJSON(msg.data, self.status);
    };
    self.socket.onerror = function (ev) {
      console.log(ev);
      self.socket.close();
      self.reconnect();
    };
  };
  self.reconnect = function() {
    if(false !== self.pingInterval) {
      clearInterval(self.pingInterval);
      self.pingInterval = false;
    }
    if(false === self.reconnectInterval) {
      self.reconnectInterval = setTimeout(function () {
        self.reconnectInterval = false;
        self.connect();
      }, 500);
    }
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
