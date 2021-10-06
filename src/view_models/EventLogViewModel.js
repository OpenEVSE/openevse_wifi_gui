/* global $, ko, StatusText */
/* exported EventLogViewModel */

function EventLogEntryViewModel(data, block, index)
{
  "use strict";

  ko.mapping.fromJS(data, {}, this);
  this.key = ko.observable(block+"-"+index);
  this.block = ko.observable(block);
  this.index = ko.observable(index);
  this.localTime = this.time.extend({ date: true });
  this.vehicle = ko.computed(() => { return 0 !== (this.evseFlags & 0x0100); });
  
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

  var block = 0;
  var index = 0;
  ko.mapping.fromJS({
    min: 0,
    max: 0
  }, {}, this);

  const logsMappingSettings =
  {
    key: (data) => {
      return ko.utils.unwrapObservable(data.key);
    },
    create: (options) => {
      return new EventLogEntryViewModel(options.data, block, index++);
    }
  };

  this.events = ko.mapping.fromJS([], logsMappingSettings);
  this.fetching = ko.observable(false);
  this.fetchingBlock = ko.observable(false);

  this.update = (after = () => { }) => {
    this.fetching(true);
    $.get(endpoint(), (data) => {
      ko.mapping.fromJS(data, this);
      this.updateBlock(this.max(), () => {
        this.fetching(false);
        after();
      });
    }, "json").fail(() => {
      this.fetching(false);
      after();
    });
  };

  var maxBlock = -1;
  var maxBlockIndex = 0;

  this.updateBlock = (fetchBlock, after = () => { }) => {
    this.fetchingBlock(true);
    block = fetchBlock;
    index = 0;
    $.get(endpoint()+"/"+fetchBlock, (data) => {
      ko.mapping.fromJS(data, this.events);

      if(block > maxBlock) {
        maxBlock = block;
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
      type: status.isError() ? "warning" : "information",
      managerState: status.status(),
      evseState: status.state(),
      evseFlags: status.flags(),
      pilot: status.pilot(),
      energy: status.session_energy(),
      temperature: status.temp() / 10,
      temperatureMax: status.temp_max() / 10,
      divertmode: status.divertmode()
    }
    this.events.push(new EventLogEntryViewModel(data, maxBlock, maxBlockIndex++));
    this.events.sort(eventSort);
  }

  const eventSort = (left, right) => {
    if(right.block() != left.block()) {
      return right.block() - left.block();
    }
    return right.index() - left.index();
  }
}
