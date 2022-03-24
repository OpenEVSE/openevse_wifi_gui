/* global ko, BaseViewModel */

function StatusViewModel(baseEndpoint) {
  "use strict";
  var self = this;
  var endpoint = ko.pureComputed(function () { return baseEndpoint() + "/status"; });

  BaseViewModel.call(self, {
    "mode": "ERR",
    "wifi_client_connected": 0,
    "eth_connected": 0,
    "net_connected": 0,
    "srssi": "",
    "ipaddress": "",
    "packets_sent": 0,
    "packets_success": 0,
    "emoncms_connected": 0,
    "emoncms_message": false,
    "mqtt_connected": 0,
    "ocpp_connected": 0,
    "rfid_waiting": 0,
    "rfid_input": "",
    "ohm_hour": "",
    "free_heap": 0,
    "comm_sent": 0,
    "comm_success": 0,
    "rapi_connected": 1,
    "evse_connected": 1,
    "amp": 0,
    "voltage": false,
    "pilot": 0,
    "session_energy": 0,
    "total_energy": 0,
    "temp": 272,
    "temp_max": 272,
    "temp1": false,
    "temp2": false,
    "temp3": false,
    "temp4": false,
    "state": 0,
    "flags": 0,
    "vehicle": false,
    "colour": false,
    "manual_override": false,
    "elapsed": 0,
    "gfcicount": 0,
    "nogndcount": 0,
    "stuckcount": 0,
    "divertmode": 1,
    "solar": 0,
    "grid_ie": 0,
    "charge_rate": 0,
    "available_current": false,
    "smoothed_available_current": false,
    "divert_update": 0,
    "divert_active": false,
    "ota_update": false,
    "time": false,
    "offset": false,
    "service_level": false,
    "tesla_vehicle_count": false,
    "tesla_vehicle_id": false,
    "tesla_vehicle_name": false,
    "battery_range": false,
    "battery_level": false,
    "time_to_full_charge": false,
    "tesla_error": false,
    "vehicle_state_update": 0,
    "status": false,
    "config_version": false
  }, endpoint);

  // Some devired values
  self.isWiFiError = ko.pureComputed(function () {
    return ("ERR" === self.mode());
  });
  self.isWifiClient = ko.pureComputed(function () {
    return ("STA" === self.mode()) || ("STA+AP" === self.mode());
  });
  self.isWifiAccessPoint = ko.pureComputed(function () {
    return ("AP" === self.mode()) || ("STA+AP" === self.mode());
  });
  self.isWired = ko.pureComputed(() => {
    return ("Wired" === self.mode());
  });
  self.fullMode = ko.pureComputed(function () {
    switch (self.mode()) {
      case "AP":
        return "Access Point (AP)";
      case "STA":
        return "Client (STA)";
      case "STA+AP":
        return "Client + Access Point (STA+AP)";
      case "Wired":
        return "Wired Ethernet";
    }

    return "Unknown (" + self.mode() + ")";
  });

  // Derived states
  const stateHelper = new StateHelperViewModel(this.state, this.vehicle);
  this.isConnected = stateHelper.isConnected;
  this.isReady = stateHelper.isReady;
  this.isCharging = stateHelper.isCharging;
  this.isError = stateHelper.isError;
  this.isEnabled = stateHelper.isEnabled;
  this.isSleeping = stateHelper.isSleeping;
  this.isDisabled = stateHelper.isDisabled;
  this.isPaused = stateHelper.isPaused;
  this.estate = stateHelper.estate;
}
StatusViewModel.prototype = Object.create(BaseViewModel.prototype);
StatusViewModel.prototype.constructor = StatusViewModel;
