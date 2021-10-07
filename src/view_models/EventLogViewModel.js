/* global $, ko, StateHelperViewModel */
/* exported EventLogViewModel */

function EventLogEntryViewModel(data, block, index)
{
  "use strict";

  ko.mapping.fromJS(data, {}, this);
  this.key = ko.observable(block+"-"+index);
  this.block = ko.observable(block);
  this.index = ko.observable(index);
  this.localTime = this.time.extend({ date: true });
  this.vehicle = ko.computed(() => { return (0 !== (this.evseFlags() & 0x0100)) ? 1 : 0; });

  const stateHelper = new StateHelperViewModel(this.evseState, this.vehicle);
  this.isConnected = stateHelper.isConnected;
  this.isReady = stateHelper.isReady;
  this.isCharging = stateHelper.isCharging;
  this.isError = stateHelper.isError;
  this.isEnabled = stateHelper.isEnabled;
  this.isSleeping = stateHelper.isSleeping;
  this.isDisabled = stateHelper.isDisabled;
  this.isPaused = stateHelper.isPaused;
  this.estate = stateHelper.estate;
}

function EventLogViewModel(baseEndpoint)
{
  "use strict";
  const endpoint = ko.pureComputed(function () { return baseEndpoint() + "/logs"; });

  this.block = ko.observable(0);
  var index = 0;
  ko.mapping.fromJS({
    min: 0,
    max: 0
  }, {}, this);

  this.hasMore = ko.computed(() => { return this.block() > this.min(); });
  this.events = ko.observableArray([]);
  this.fetching = ko.observable(false);
  this.fetchingBlock = ko.observable(false);

  this.update = (after = () => { }) => {
    this.fetching(true);
    $.get(endpoint(), (data) => {
      ko.mapping.fromJS(data, this);
      updateBlock(this.max(), () => {
        if(this.events.length < 5 && this.block() > this.min()) {
          this.updateNext();
        }
      });
    }, "json").always(() => {
      this.fetching(false);
      after();
    });
  };

  this.updateNext = () => {
    updateBlock(this.block() - 1);
  };

  var maxBlock = -1;
  var maxBlockIndex = 0;

  const updateBlock = (fetchBlock, after = () => { }) => {
    this.fetchingBlock(true);
    this.block(fetchBlock);
    index = 0;
    $.get(endpoint()+"/"+fetchBlock, (data) => {
      for (const event of data) {
        // IMPROVE: handle updating log entries
        this.events.push(new EventLogEntryViewModel(event, fetchBlock, index++));
      }

      if(fetchBlock > maxBlock) {
        maxBlock = fetchBlock;
        maxBlockIndex = index;
      }

      this.events.sort(eventSort);
    }, "json").always(() => {
      this.fetchingBlock(false);
      after();
    });
  };

  var lastLog = new Date();
  this.addLog = (status) => {
    var now = new Date();
    if(now - lastLog < 1000) {
      return;
    }
    lastLog = now;

    var data = {
      time: now.toISOString(),
      type: "",
      managerState: status.status(),
      evseState: status.state(),
      evseFlags: status.flags(),
      elapsed: status.elapsed(),
      pilot: status.pilot(),
      energy: status.session_energy(),
      temperature: status.temp() / 10,
      temperatureMax: status.temp_max() / 10,
      divertMode: status.divertmode()
    };
    var event = new EventLogEntryViewModel(data, maxBlock, maxBlockIndex++);

    // Derived types in status have not been properly re-evaluated at this point but
    // the values in the event are correct.
    event.type(event.isError() ? "warning" : "information");

    this.events.push(event);
    this.events.sort(eventSort);
  };

  const eventSort = (left, right) => {
    if(right.block() != left.block()) {
      return right.block() - left.block();
    }
    return right.index() - left.index();
  };
}
