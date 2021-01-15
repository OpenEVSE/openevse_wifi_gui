function RFIDViewModel(baseEndpoint) {
    "use strict";
    var self = this;
    var endpoint = ko.pureComputed(function () { return baseEndpoint() + "/rfid/status"; });
  
    BaseViewModel.call(self, {
      "enabled": 0,
    }, endpoint);
  }
  RFIDViewModel.prototype = Object.create(BaseViewModel.prototype);
  RFIDViewModel.prototype.constructor = RFIDViewModel;
  