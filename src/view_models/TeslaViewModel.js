/* global ko, BaseViewModel */
/* exported TeslaViewModel */

function TeslaViewModel(baseEndpoint, config, status)
{
  "use strict";

  var endpoint = ko.pureComputed(function () { return baseEndpoint() + "/tesla/vehicles"; });
  BaseViewModel.call(this, {
    "vehicles": [ ]
  }, endpoint);

  this.username = ko.observable("");
  this.password = ko.observable("");
  this.mfaPassCode = ko.observable("");
  this.mfaDeviceName = ko.observable("");

  this.fetching = ko.observable(false);
  this.success = ko.observable(false);
  this.advanced = ko.observable(false);

  this.advancedUpdate = ko.observable(false);

  status.tesla_vehicle_count.subscribe(() => {
    this.update();
  });

  config.tesla_access_token.subscribe((val) => {
    if(this.advanced() && val !== "") {
      this.advancedUpdate(true);
      config.tesla_created_at(Date.now());
      config.tesla_expires_in(3888000);
    }
  });

  this.have_credentials = ko.computed(() => {
    return  config.tesla_access_token() !== false &&
            config.tesla_access_token() !== "" &&
            config.tesla_refresh_token() !== false &&
            config.tesla_refresh_token() !== "" &&
            config.tesla_created_at() !== 0 &&
            config.tesla_created_at() !== false &&
            config.tesla_created_at() !== "" &&
            config.tesla_expires_in() !== 0 &&
            config.tesla_expires_in() !== false &&
            config.tesla_expires_in() !== "" &&
            this.advancedUpdate() === false;
  });

  const teslaLogin = "https://auth.openevse.com/login";

  this.showAdvanced = () => {
    this.advanced(true);
  };

  this.setForTime = function (flag, time) {
    flag(true);
    setTimeout(() => { flag(false); }, time);
  };

  this.login = () => {
    this.fetching(true);
    this.success(false);
    $.ajax(teslaLogin, {
      method: "POST",
      data: JSON.stringify({
        username: this.username(),
        password: this.password(),
        mfaPassCode: this.mfaPassCode(),
        mfaDeviceName: this.mfaDeviceName()
      }),
      contentType: "application/json"
    }).done((credentials) => {
      $.ajax(baseEndpoint() + "/config", {
        method: "POST",
        data: JSON.stringify({
          tesla_enabled: true,
          tesla_access_token: credentials.access_token,
          tesla_refresh_token: credentials.refresh_token,
          tesla_created_at: credentials.created_at,
          tesla_expires_in: credentials.expires_in
        }),
        contentType: "application/json"
      }).done(() => {
        config.tesla_enabled(true);
        config.tesla_access_token(credentials.access_token);
        config.tesla_refresh_token(credentials.refresh_token);
        config.tesla_created_at(credentials.created_at);
        config.tesla_expires_in(credentials.expires_in);
        this.setForTime(this.success, 2000);
      }).fail(() => {
      }).always(() => {
        this.fetching(false);
      });
    }).fail(() => {
      this.fetching(false);
    });
  };

  this.logout = () => {
    $.ajax(baseEndpoint() + "/config", {
      method: "POST",
      data: JSON.stringify({
        tesla_enabled: false,
        tesla_access_token: "",
        tesla_refresh_token: "",
        tesla_created_at: "",
        tesla_expires_in: ""
      }),
      contentType: "application/json"
    }).done(() => {
      config.tesla_access_token("");
      config.tesla_refresh_token("");
      config.tesla_created_at(0);
      config.tesla_expires_in(0);
      this.advanced(false);
      this.setForTime(this.success, 2000);
    }).fail(() => {
    }).always(() => {
      this.fetching(false);
    });
  };
}
TeslaViewModel.prototype = Object.create(BaseViewModel.prototype);
TeslaViewModel.prototype.constructor = TeslaViewModel;
