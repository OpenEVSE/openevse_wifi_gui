/* global ko */
/* exported ScheduleViewModel */

function EventInfoViewModel(data)
{
  "use strict";
  if(typeof(data) == "object") {
    ko.mapping.fromJS(data, {}, this);
  } else {
    ko.mapping.fromJS({
      id: data,
      state: "active",
      time: "00:00:00",
      days: []
    }, {}, this);
  }

  this.get = () => {
    return {
      id: this.id(),
      state: this.state(),
      days: this.days(),
      time: this.time()
    };
  };
}

function ScheduleViewModel(baseEndpoint)
{
  "use strict";
  var self = this;
  var endpoint = ko.pureComputed(function () { return baseEndpoint() + "/schedule"; });

  const scheduleMappingSettings =
  {
    key: function(data) {
      return ko.utils.unwrapObservable(data.id);
    },
    create: function (options) {
      return new EventInfoViewModel(options.data);
    }
  };

  // Observable properties
  self.events = ko.mapping.fromJS([], scheduleMappingSettings);
  self.fetching = ko.observable(false);

  self.delayTimerEnabled = ko.observable(false);
  self.updatingDelayTimer = ko.observable(false);

  self.update = function (after = function () { }) {
    self.fetching(true);
    $.get(endpoint(), function (data) {
      ko.mapping.fromJS(data, self.events);
      self.delayTimerEnabled(self.delayTimerValid());
    }, "json").always(function () {
      self.fetching(false);
      after();
    });
  };

  // delay timer logic
  function isTime(val) {
    var timeRegex = /([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?/;
    return timeRegex.test(val);
  }

  function findEvent(id) {
    for (const event of self.events()) {
      if(event.id() == id) {
        return event;
      }
    }

    return false;
  }

  self.delayTimerValid = ko.pureComputed(function () {
    return isTime(self.delayTimerStart()) && isTime(self.delayTimerStop());
  });

  self.startDelayTimer = function () {
    self.updatingDelayTimer(true);

    let events = [];
    for (const event of self.events()) {
      events.push(event.get());
    }

    $.post(endpoint(), ko.toJSON(events), () => {
      self.delayTimerEnabled(true);
    }).fail(() => {
      alert("Failed to save schedule");
    }).always(() => {
      self.updatingDelayTimer(false);
    });
  };

  function deleteEvent(id)
  {
    return new Promise((resolve, reject) => {
      $.ajax({
        url: endpoint() + "/" + id,
        type: "DELETE",
        success: function (data) {
          self.events.remove((item) => {
            return item.id() == id;
          });
          resolve(data);
        },
        error: function (error) {
          reject(error);
        }
      });
    });
  }

  self.stopDelayTimer = function () {
    self.updatingDelayTimer(true);
    let deletes = [];
    for (const event of self.events()) {
      deletes.push(deleteEvent(event.id()));
    }

    Promise.all(deletes).then(() => {
      self.delayTimerEnabled(false);
    }).finally(() => {
      self.updatingDelayTimer(false);
    });
  };

  function setTime(id, state, time)
  {
    let event = findEvent(id);
    if(false === event) {
      event = new EventInfoViewModel(id);
      self.events.push(event);
    }

    event.time(time);
    event.state(state);
    event.days([
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday"
    ]);
  }

  self.delayTimerStart = ko.computed({
    read: () => {
      const event = findEvent(1);
      return false !== event ? event.time() : "--:--";
    },
    write: (val) => {
      setTime(1, "active", val);
    }
  });

  self.delayTimerStop = ko.computed({
    read: () => {
      const event = findEvent(2);
      return false !== event ? event.time() : "--:--";
    },
    write: (val) => {
      let event = findEvent(2);
      if(false !== event) {
        event.time(val);
      } else {
        event = new EventInfoViewModel({
          id: 2,
          state: "disable",
          time: val,
          days: [
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
            "sunday"
          ]
        });
        self.events.push(event);
      }
    }
  });
}
