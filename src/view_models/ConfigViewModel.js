/* global $, ko, BaseViewModel */
/* exported ConfigViewModel */

function ConfigViewModel(baseEndpoint) {
  "use strict";
  var endpoint = ko.pureComputed(function () { return baseEndpoint() + "/config"; });
  BaseViewModel.call(this, {
    "ssid": "",
    "pass": "",
    "apass": "",
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
    "mqtt_user": "",
    "mqtt_pass": "",
    "mqtt_solar": "",
    "mqtt_grid_ie": "",
    "mqtt_vrms": "",
    "mqtt_enabled": 0,
    "mqtt_supported_protocols": ["mqtt"],
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
    "diodet": 0,
    "gfcit": 0,
    "groundt": 0,
    "relayt": 0,
    "ventt": 0,
    "tempt": 0,
    "scale": 1,
    "offset": 0,
    "version": "0.0.0",
    "time_zone": false,
    "divert_enabled": false,
    "divert_PV_ratio": 1.0,
    "divert_attack_smoothing_factor": 0.4,
    "divert_decay_smoothing_factor": 0.05,
    "divert_min_charge_time": 600,
    "charge_mode": "full",
    "pause_uses_disabled": false
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
  this.ohmkey.subscribe((v) => { trim(this.ohmkey, v); });
  this.www_username.subscribe((v) => { trim(this.www_username, v); });
  this.hostname.subscribe((v) => { trim(this.hostname, v); });
  this.sntp_hostname.subscribe((v) => { trim(this.sntp_hostname, v); });
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
  }, "json").always(() => {
    this.fetching(false);
    after();
  });
};
