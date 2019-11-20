/* global ko */
/* exported PasswordViewModel */

function PasswordViewModel(password)
{
  "use strict";
  var self = this;

  self.show = ko.observable(false);
  self.value = ko.computed({
    read: () => {
      if(self.show() && ["___DUMMY_PASSWORD___", "_DUMMY_PASSWORD"].includes(password())) {
        return "";
      }

      return password();
    },
    write: (value) => {
      password(value);
    }
  });
}
