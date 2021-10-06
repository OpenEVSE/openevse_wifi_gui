function StateHelperViewModel(state, vehicle) {
  this.estate = ko.pureComputed(function () {
    var estate;
    switch (state()) {
      case 0:
        estate = "Starting";
        break;
      case 1:
        estate = "EV Not connected";
        break;
      case 2:
        estate = "EV Connected";
        break;
      case 3:
        estate = "Charging";
        break;
      case 4:
        estate = "Vent Required";
        break;
      case 5:
        estate = "Diode Check Failed";
        break;
      case 6:
        estate = "GFCI Fault";
        break;
      case 7:
        estate = "No Earth Ground";
        break;
      case 8:
        estate = "Stuck Relay";
        break;
      case 9:
        estate = "GFCI Self Test Failed";
        break;
      case 10:
        estate = "Over Temperature";
        break;
      case 11:
        estate = "Over Current";
        break;
      case 254:
      case 255:
        estate = "Waiting";
        if(false !== vehicle())
        {
          estate += " - EV " ;
          if(1 === vehicle()) {
            estate += "Connected";
          } else {
            estate += "Not connected";
          }
        }
        break;
      default:
        estate = "Invalid";
        break;
    }
    return estate;
  });

  this.isConnected = ko.pureComputed(() => {
    return [2, 3].indexOf(state()) !== -1;
  });

  this.isReady = ko.pureComputed(() => {
    return [0, 1].indexOf(state()) !== -1;
  });

  this.isCharging = ko.pureComputed(() => {
    return 3 === state();
  });

  this.isError = ko.pureComputed(() => {
    return [4, 5, 6, 7, 8, 9, 10, 11].indexOf(state()) !== -1;
  });

  this.isEnabled = ko.pureComputed(() => {
    return [0, 1, 2, 3].indexOf(state()) !== -1;
  });

  this.isSleeping = ko.pureComputed(() => {
    return 254 === state();
  });

  this.isDisabled = ko.pureComputed(() => {
    return 255 === state();
  });

  this.isPaused = ko.pureComputed(() => {
    return [254, 255].indexOf(state()) !== -1;
  });

}
