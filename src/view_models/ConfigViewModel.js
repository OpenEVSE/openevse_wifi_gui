/* global $, ko, BaseViewModel */
/* exported ConfigViewModel */

function ConfigViewModel(baseEndpoint) {
  "use strict";
  var endpoint = ko.pureComputed(function () { return baseEndpoint() + "/config"; });
  BaseViewModel.call(this, {
    "ssid": "",
    "pass": "",
    "lang": "en",
    "emoncms_server": "data.openevse.com/emoncms",
    "emoncms_apikey": "",
    "emoncms_node": "",
    "emoncms_fingerprint": "",
    "emoncms_enabled": 0,
    "mqtt_protocol": "mqtt",
    "mqtt_protocol_enable": false,
    "mqtt_server": "",
    "mqtt_port": 1883,
    "mqtt_port_enable": false,
    "mqtt_reject_unauthorized": true,
    "mqtt_reject_unauthorized_enable": false,
    "mqtt_topic": "",
    "mqtt_retained": false,
    "mqtt_user": "",
    "mqtt_pass": "",
    "mqtt_solar": "",
    "mqtt_grid_ie": "",
    "mqtt_vrms": "",
    "mqtt_live_pwr": "",
    "mqtt_enabled": 0,
    "mqtt_vehicle_soc": "",
    "mqtt_vehicle_range": "",
    "mqtt_vehicle_range_miles": false,
    "mqtt_vehicle_eta": "",
    "mqtt_supported_protocols": ["mqtt"],
    "ocpp_server": "",
    "ocpp_enabled": 0,
    "ocpp_chargeBoxId": "",
    "ocpp_authkey": "",
    "ocpp_suspend_evse": 1,
    "ocpp_energize_plug": 1,
    "http_supported_protocols": [],
    "ohm_enabled": 0,
    "ohmkey": "",
    "www_username": "",
    "www_password": "",
    "hostname": false,
    "sntp_enabled": false,
    "sntp_hostname": false,
    "firmware": "-",
    "protocol": "-",
    "espflash": 0,
    "diode_check": false,
    "gfci_check": false,
    "ground_check": false,
    "relay_check": false,
    "vent_check": false,
    "temp_check": false,
    "service": 0,
    "scale": 220,
    "offset": 0,
    "max_current_soft": false,
    "min_current_hard": false,
    "max_current_hard": false,
    "version": "0.0.0",
    "espinfo": false,
    "buildenv": false,
    "time_zone": false,
    "divert_enabled": false,
    "divert_PV_ratio": 1.0,
    "divert_attack_smoothing_factor": 0.4,
    "divert_decay_smoothing_factor": 0.05,
    "divert_min_charge_time": 600,
    "current_shaper_enabled": false,
    "current_shaper_max_pwr": 9000,
    "charge_mode": "full",
    "pause_uses_disabled": false,
    "led_brightness": false,
    "tesla_enabled": false,
    "ovms_enabled": false,
    "tesla_access_token": false,
    "tesla_refresh_token": false,
    "tesla_created_at": false,
    "tesla_expires_in": false,
    "tesla_vehicle_id": false,
    "rfid_enabled": false,
    "rfid_storage": "",
    "loaded": false,
    "scheduler_start_window": false
  }, endpoint);

  function trim(prop, val) {
    if(val.trim() !== prop()) {
      prop(val.trim());
    }
  }

  this.ssid.subscribe((v) => { trim(this.ssid, v); });
  this.emoncms_server.subscribe((v) => { trim(this.emoncms_server, v); });
  this.emoncms_apikey.subscribe((v) => { trim(this.emoncms_apikey, v); });
  this.emoncms_node.subscribe((v) => { trim(this.emoncms_node, v); });
  this.emoncms_fingerprint.subscribe((v) => { trim(this.emoncms_fingerprint, v); });
  this.mqtt_server.subscribe((v) => { trim(this.mqtt_server, v); });
  this.mqtt_topic.subscribe((v) => { trim(this.mqtt_topic, v); });
  this.mqtt_user.subscribe((v) => { trim(this.mqtt_user, v); });
  this.mqtt_solar.subscribe((v) => { trim(this.mqtt_solar, v); });
  this.mqtt_grid_ie.subscribe((v) => { trim(this.mqtt_grid_ie, v); });
  this.mqtt_vrms.subscribe((v) => { trim(this.mqtt_vrms, v); });
  this.mqtt_live_pwr.subscribe((v) => { trim(this.mqtt_live_pwr, v); });
  this.ohmkey.subscribe((v) => { trim(this.ohmkey, v); });
  this.www_username.subscribe((v) => { trim(this.www_username, v); });
  this.hostname.subscribe((v) => { trim(this.hostname, v); });
  this.sntp_hostname.subscribe((v) => { trim(this.sntp_hostname, v); });
  this.lang.subscribe((v) => { trim(this.lang, v); });

  // Derived config
  this.all_tests_enabled = ko.pureComputed(() => {
    return this.diode_check() &&
           this.gfci_check() &&
           this.ground_check() &&
           this.relay_check() &&
           this.vent_check() &&
           this.temp_check();
  });
}
ConfigViewModel.prototype = Object.create(BaseViewModel.prototype);
ConfigViewModel.prototype.constructor = ConfigViewModel;

ConfigViewModel.prototype.update = function (after = function () { }) {
  this.fetching(true);
  $.get(this.remoteUrl(), (data) => {
    ko.mapping.fromJS(data, this);
    this.mqtt_protocol_enable(data.hasOwnProperty("mqtt_protocol"));
    this.mqtt_port_enable(data.hasOwnProperty("mqtt_port"));
    this.mqtt_reject_unauthorized_enable(data.hasOwnProperty("mqtt_reject_unauthorized"));
    // HACK: not sure why this is needed
    if(data.hasOwnProperty("mqtt_protocol")) {
      this.mqtt_protocol(data.mqtt_protocol);
    }
    if(data.hasOwnProperty("tesla_access_token")) {
      this.tesla_access_token(data.tesla_access_token);
    }
    if(data.hasOwnProperty("tesla_refresh_token")) {
      this.tesla_refresh_token(data.tesla_refresh_token);
    }
    if(data.hasOwnProperty("tesla_created_at")) {
      this.tesla_created_at(data.tesla_created_at);
    }
    if(data.hasOwnProperty("tesla_expires_in")) {
      this.tesla_expires_in(data.tesla_expires_in);
    }
    this.loaded(true);
  }, "json").always(() => {
    this.fetching(false);
    after();
  });
};
