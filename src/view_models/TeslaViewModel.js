/* global ko, BaseViewModel */
/* exported TeslaViewModel */

function TeslaViewModel(baseEndpoint, config)
{
  "use strict";

  this.username = ko.observable("");
  this.password = ko.observable("");
  this.mfaPassCode = ko.observable("");
  this.mfaDeviceName = ko.observable("");

  this.fetching = ko.observable(false);
  this.success = ko.observable(false);

  const teslaLogin = "http://localhost:3000/login";

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
}
