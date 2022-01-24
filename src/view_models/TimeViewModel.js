/* global ko */
/* exported TimeViewModel */

function TimeViewModel(status)
{
  "use strict";
  var self = this;

  function addZero(val) {
    return (val < 10 ? "0" : "") + val;
  }

  function startTimeUpdate() {
    timeUpdateTimeout = setInterval(function () {
      if(self.automaticTime()) {
        self.nowTimedate(new Date(self.evseTimedate().getTime() + ((new Date()) - self.localTimedate())));
      }
      if(status.isCharging()) {
        self.elapsedNow(new Date((status.elapsed() * 1000) + ((new Date()) - self.elapsedLocal())));
      }
      self.divertUpdateNow(new Date((status.divert_update() * 1000) + ((new Date()) - self.divertUpdateLocal())));
      self.vehicleUpdateNow(new Date((status.vehicle_state_update() * 1000) + ((new Date()) - self.vehicleUpdateLocal())));
    }, 1000);
  }

  function stopTimeUpdate() {
    if(null !== timeUpdateTimeout) {
      clearInterval(timeUpdateTimeout);
      timeUpdateTimeout = null;
    }
  }

  self.evseTimedate = ko.observable(new Date());
  self.localTimedate = ko.observable(new Date());
  self.nowTimedate = ko.observable(null);
  self.hasRTC= ko.observable(true);
  self.elapsedNow = ko.observable(new Date(0));
  self.elapsedLocal = ko.observable(new Date());
  self.divertUpdateNow = ko.observable(new Date(0));
  self.divertUpdateLocal = ko.observable(new Date());
  self.vehicleUpdateNow = ko.observable(new Date(0));
  self.vehicleUpdateLocal = ko.observable(new Date());

  self.date = ko.pureComputed({
    read: function () {
      if(null === self.nowTimedate()) {
        return "";
      }

      var dt = self.nowTimedate();
      return (dt.getFullYear())+"-"+addZero(dt.getMonth() + 1)+"-"+addZero(dt.getDate());
    },
    write: function (val) {
      var dt = self.evseTimedate();
      val += " " + addZero(dt.getHours())+":"+addZero(dt.getMinutes())+":"+addZero(dt.getSeconds());
      self.evseTimedate(new Date(val));
      self.localTimedate(new Date());
    }});

  self.time = ko.pureComputed({
    read: function () {
      if(null === self.nowTimedate()) {
        return "--:--:--";
      }
      var dt = self.nowTimedate();
      return addZero(dt.getHours())+":"+addZero(dt.getMinutes())+":"+addZero(dt.getSeconds());
    },
    write: function (val) {
      var parts = val.split(":");
      var date = self.evseTimedate();
      date.setHours(parseInt(parts[0]));
      date.setMinutes(parseInt(parts[1]));
      self.evseTimedate(date);
      self.localTimedate(new Date());
    }});

  self.elapsed = ko.pureComputed(function () {
    if(null === self.nowTimedate()) {
      return "0:00:00";
    }
    var time = self.elapsedNow().getTime();
    time = Math.floor(time / 1000);
    var seconds = time % 60;
    time = Math.floor(time / 60);
    var minutes = time % 60;
    var hours = Math.floor(time / 60);
    return hours+":"+addZero(minutes)+":"+addZero(seconds);
  });

  status.elapsed.subscribe(function (val) {
    self.elapsedNow(new Date(val * 1000));
    self.elapsedLocal(new Date());
  });

  self.divert_update = ko.pureComputed(function () {
    if(null === self.nowTimedate()) {
      return false;
    }
    var time = self.divertUpdateNow().getTime();
    return Math.floor(time / 1000);
  });

  status.divert_update.subscribe(function (val) {
    self.divertUpdateNow(new Date(val * 1000));
    self.divertUpdateLocal(new Date());
  });

  self.vehicle_state_update = ko.pureComputed(function () {
    if(null === self.nowTimedate()) {
      return false;
    }
    var time = self.vehicleUpdateNow().getTime();
    return Math.floor(time / 1000);
  });

  status.vehicle_state_update.subscribe(function (val) {
    self.vehicleUpdateNow(new Date(val * 1000));
    self.vehicleUpdateLocal(new Date());
  });

  var timeUpdateTimeout = null;
  self.automaticTime = ko.observable(true);

  self.timeUpdate = function (date,valid=true) {
    self.hasRTC(valid);
    stopTimeUpdate();
    self.evseTimedate(date);
    self.nowTimedate(date);
    self.localTimedate(new Date());
    startTimeUpdate();
  };
}
