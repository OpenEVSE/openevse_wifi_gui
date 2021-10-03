function StatusText(state, vehicle) {
  return ko.pureComputed(function () {
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
}
