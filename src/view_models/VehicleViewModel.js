/* global ko, BaseViewModel, TeslaViewModel */
/* exported VehicleViewModel */

function VehicleViewModel(baseEndpoint, config, status)
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

  this.has_status = ko.computed(() => {
    return false !== status.battery_range() ||
           false !== status.battery_level() ||
           false !== status.time_to_full_charge();
  });

  this.tesla = new TeslaViewModel(baseEndpoint, config, status);

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

  this.show_save = ko.computed(() => {
    return "tesla" !== this.type() ||
           this.tesla.have_credentials() ||
           this.tesla.advanced();
  });

  this.mqtt_vehicle_range_units = ko.computed({
    read: () => {
      return config.mqtt_vehicle_range_miles() ? "mi" : "km";
    },
    write: (val) => {
      config.mqtt_vehicle_range_miles("mi" === val);
    }
  });
}
//VehicleViewModel.prototype = Object.create(BaseViewModel.prototype);
//VehicleViewModel.prototype.constructor = VehicleViewModel;
