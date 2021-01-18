function RFIDViewModel(baseEndpoint) {
    "use strict";
    var self = this;
  
    self.baseEndpoint = baseEndpoint;
  
    self.waiting = ko.observable(false);
    self.scanned = ko.observable();
    self.timeLeft = ko.observable();
  
    self.startWaiting = function() {
        self.waiting(true);
        self.scanned(undefined)
        $.get(self.baseEndpoint() + "/rfid/add", function (data) {
        }, "json").always(function () {
        });
      };

      self.poll = function() {
        $.get(self.baseEndpoint() + "/rfid/poll", function (data) {
            if(data.status == "done"){
                self.scanned(data.scanned);
                self.waiting(false);
            }else if(data.status == "waiting") {
                self.timeLeft(data.timeLeft);
            }
        }, "json").always(function () {
        });
      };
  }