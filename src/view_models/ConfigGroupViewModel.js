/* global ko */
/* exported ConfigGroupViewModel */

function ConfigGroupViewModel(baseEndpoint, data, validate)
{
  "use strict";
  var self = this;

  self.fetching = ko.observable(false);
  self.success = ko.observable(false);
  self.value = ko.computed(data);
  
  self.value.subscribe(() => {
    self.success(false);  
  });

  self.save = function () {
    var data = self.value();
    if(validate(data))
    {
      self.fetching(true);
      self.success(false);
      $.ajax(baseEndpoint() + "/config", {
        method: "POST",
        data: JSON.stringify(data),
        contentType: "application/json"
      }).done(() => {
        self.success(true);
      }).fail(() => {
        alert("Failed to save MQTT config");
      }).always(() => {
        self.fetching(false);
      });
    }
  }
}
