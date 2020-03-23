/* global $, ko, BaseViewModel */
/* exported ConfigViewModel */

function ConfigViewModel(baseEndpoint) {
  "use strict";
  var endpoint = ko.pureComputed(function () { return baseEndpoint() + "/config"; });
  BaseViewModel.call(this, {
    "ssid": "",
    "pass": "",
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
    "mqtt_enabled": 0,
    "mqtt_supported_protocols": ["mqtt"],
    "http_supported_protocols": [],
    "ohm_enabled": 0,
    "ohmkey": "",
    "www_username": "",
    "www_password": "",
    "hostname": false,
    "sntp_enabled": false,
    "sntp_host": false,
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
    "time_zone": false
  }, endpoint);
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
