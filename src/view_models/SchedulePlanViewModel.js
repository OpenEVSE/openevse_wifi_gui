/* global ko, BaseViewModel */
/* exported SchedulePlanViewModel */

function SchedulePlanViewModel(baseEndpoint)
{
  "use strict";
  var endpoint = ko.computed(() => { return baseEndpoint() + "/schedule/plan"; });

  BaseViewModel.call(
    this,
    {
      current_day: "",
      current_offset: 0,
      next_event_delay: 0,
      current_event: false,
      next_event: false
    },
    endpoint
  );

  this.active = ko.computed(() => { return false !== this.next_event(); });

  function get_type(event)
  {
    return false !== event ?
      "Timed " + (("active" === event.state()) ? "start" : "finish") :
      "";

  }

  function get_time(event)
  {
    if(false === event) {
      return "";
    }

    if(0 === event.diff()) {
      return event.time();
    }

    var start_time = new Date(event.start_offset() * 1000).toISOString().substring(11, 19);

    return start_time+" ("+event.time()+" "+(event.diff() > 0 ? "+":"")+(event.diff())+")";
  }

  this.current_event_type = ko.computed(() => { return get_type(this.current_event()); });
  this.current_event_time = ko.computed(() => { return get_time(this.current_event()); });
  this.next_event_type = ko.computed(() => { return get_type(this.next_event()); });
  this.next_event_time = ko.computed(() => { return get_time(this.next_event()); });
}
SchedulePlanViewModel.prototype = Object.create(BaseViewModel.prototype);
SchedulePlanViewModel.prototype.constructor = SchedulePlanViewModel;
