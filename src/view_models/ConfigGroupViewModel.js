/* global ko */
/* exported ConfigGroupViewModel */

function ConfigGroupViewModel(baseEndpoint, data)
{
  "use strict";
  var self = this;

  self.fetching = ko.observable(false);
  self.success = ko.observable(false);
  self.value = ko.computed(data);

  self._validate = () => { return true; };
  self._done = () => { return true; };
  self._fail = () => { alert("Failed to save config"); };
  self._always = () => { return true; };
  
  self.value.subscribe(() => {
    self.success(false);  
  });

  self.save = function () {
    var data = self.value();
    if(self._validate(data))
    {
      self.fetching(true);
      self.success(false);
      $.ajax(baseEndpoint() + "/config", {
        method: "POST",
        data: JSON.stringify(data),
        contentType: "application/json"
      }).done(() => {
        self.success(true);
        self._done();
      }).fail(self._fail).always(() => {
        self.fetching(false);
        self._always();
      });
    }
  };

  self.validate = function(fn) {
    self._validate = fn; 
    return this;
  };

  self.done = function(fn) {
    self._done = fn; 
    return this;
  };

  self.fail = function(fn) {
    self._fail = fn; 
    return this;
  };

  self.always = function(fn) {
    self._always = fn; 
    return this;
  };
}
