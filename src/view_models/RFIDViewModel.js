function RFIDViewModel(baseEndpoint, status) {
    "use strict";
    var self = this;
  
    self.baseEndpoint = baseEndpoint;
  
    self.startWaiting = function() {
        $.get(self.baseEndpoint() + "/rfid/add", function (data) {
        }, "json").always(function () {
        });

        let updateTimer = function() {
            var rwait = status.rfid_waiting();
            if (rwait >= 2) {
                status.rfid_waiting(rwait - 1);
                setTimeout(updateTimer, 1000);
            }
        }
        setTimeout(updateTimer, 1000);
        status.rfid_waiting(1);
    };
}
