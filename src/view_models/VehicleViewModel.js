/* global ko, BaseViewModel, TeslaViewModel */
/* exported VehicleViewModel */

function VehicleViewModel(baseEndpoint, config)
{
  "use strict";
  //var self = this;

  // var endpoint = ko.pureComputed(function () { return baseEndpoint() + "/status"; });
  // BaseViewModel.call(self, {
  // }, endpoint);
  this.mqtt_enabled_state = ko.observable(false);
  this.mqtt_enabled = ko.computed({
    read: () => {
      return config.mqtt_vehicle_soc() !== "" ||
             config.mqtt_vehicle_range() !== "" ||
             config.mqtt_vehicle_eta() !== "" ||
             this.mqtt_enabled_state();
    },
    write: (val) => {
      if(false === val)
      {
        config.mqtt_vehicle_soc("");
        config.mqtt_vehicle_range("");
        config.mqtt_vehicle_eta("");
      }
      this.mqtt_enabled_state(val);
    }
  });

  this.tesla = new TeslaViewModel(baseEndpoint, config);

  // Some devired values
  this.type = ko.pureComputed(
    {
      read: () => {
        return config.tesla_enabled() ? "tesla" :
          config.ovms_enabled() ? "ovms" :
            this.mqtt_enabled() ? "mqtt" :
              "none";
      },
      write: (val) => {
        config.tesla_enabled("tesla" == val);
        config.ovms_enabled("ovms" == val);
        this.mqtt_enabled("mqtt" == val);
      }
    }
  );
}
//VehicleViewModel.prototype = Object.create(BaseViewModel.prototype);
//VehicleViewModel.prototype.constructor = VehicleViewModel;
