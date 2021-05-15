/* global ko, BaseViewModel */
/* exported TeslaViewModel */

function TeslaViewModel(baseEndpoint, config)
{
  "use strict";

  this.username = ko.observable("");
  this.password = ko.observable("");
  this.mfaPassCode = ko.observable("");
  this.mfaDeviceName = ko.observable("");

  this.login = () => {
    /*
    tesla_login({
      identity: this.username(),
      credential: this.password(),
      mfaPassCode: this.mfaPassCode(),
      mfaDeviceName: this.mfaDeviceName()
    }, (error, response, body) => {
      console.log(error);
      console.log(response);
      console.log(body);
      
      
    });
    */
  };

}
