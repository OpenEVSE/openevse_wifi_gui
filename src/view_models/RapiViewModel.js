/* global $, ko */
/* exported RapiViewModel */

function RapiViewModel(baseEndpoint) {
  "use strict";
  var self = this;

  self.baseEndpoint = baseEndpoint;

  self.rapiSend = ko.observable(false);
  self.cmd = ko.observable("");
  self.ret = ko.observable("");
  self.history = ko.observable("");

  self.get_commands = [
    {
      cmd: "G0",
      ret: ko.observable(""),
      description: "get EV connect state",
      tokens: [
        { name: "connectstate", val: ko.observable(""), description: "0=not connected, 1=connected, 2=unknown" }
      ]
    },
    {
      cmd: "G3",
      ret: ko.observable(""),
      description: "get charging time limit",
      tokens: [
        { name: "cnt", val: ko.observable(""), description: "cnt*15 = minutes<br/>= 0 = no time limit" }
      ]
    },
    {
      cmd: "G4",
      ret: ko.observable(""),
      description: "get auth lock (needs AUTH_LOCK defined and AUTH_LOCK_REG undefined)",
      tokens: [
        { name: "lockstate", val: ko.observable(""), description: "0=unlocked, 1=locked" }
      ]
    },
    {
      cmd: "GA",
      ret: ko.observable(""),
      description: "get ammeter settings",
      tokens: [
        { name: "currentscalefactor", val: ko.observable(""), description: "" },
        { name: "currentoffset", val: ko.observable(""), description: "" }
      ]
    },
    {
      cmd: "GC",
      ret: ko.observable(""),
      description: "get current capacity info, all values are decimal. <br/> n.b. maxamps,emaxamps values are dependent on the active service level (L1/L2)",
      tokens: [
        { name: "minamps", val: ko.observable(""), description: "min allowed current capacity" },
        { name: "hmaxamps", val: ko.observable(""), description: "max hardware allowed current capacity MAX_CURRENT_CAPACITY_Ln" },
        { name: "pilotamps", val: ko.observable(""), description: "current capacity advertised by pilot" },
        { name: "cmaxamps", val: ko.observable(""), description: "max configured allowed current capacity (saved to EEPROM)" }
      ]
    },
    {
      cmd: "GD",
      ret: ko.observable(""),
      description: "get Delay timer, all values decimal, if timer disabled, starthr=startmin=endhr=endmin=0",
      tokens: [
        { name: "starthr", val: ko.observable(""), description: "" },
        { name: "startmin", val: ko.observable(""), description: "" },
        { name: "endhr", val: ko.observable(""), description: "" },
        { name: "endmin", val: ko.observable(""), description: "" }
      ]
    },
    {
      cmd: "GE",
      ret: ko.observable(""),
      description: "get settings",
      tokens: [
        { name: "amps", val: ko.observable(""), description: "(decimal)" },
        { name: "flags", val: ko.observable(""), description: "(hex)" }
      ]
    },
    {
      cmd: "GF",
      ret: ko.observable(""),
      description: "get fault counters, all values hex, maximum trip count = 0xFF for any counter",
      tokens: [
        { name: "gfitripcnt", val: ko.observable(""), description: "" },
        { name: "nogndtripcnt", val: ko.observable(""), description: "" },
        { name: "stuckrelaytripcnt", val: ko.observable(""), description: "" }
      ]
    },
    {
      cmd: "GG",
      ret: ko.observable(""),
      description: "get charging current and voltage.  AMMETER must be defined in order to get amps, otherwise returns -1 amps",
      tokens: [
        { name: "milliamps", val: ko.observable(""), description: "" },
        { name: "millivolts", val: ko.observable(""), description: "" }
      ]
    },
    {
      cmd: "GH",
      ret: ko.observable(""),
      description: "get cHarge limit",
      tokens: [
        { name: "kWh", val: ko.observable(""), description: "0 = no charge limit" }
      ]
    },
    {
      cmd: "GI",
      ret: ko.observable(""),
      description: "get MCU ID - requires MCU_ID_LEN to be defined. <br/> n.b. MCU_ID_LEN must be defined in order to get MCU ID WARNING: mcuid is guaranteed to be unique only for the 328PB. Uniqueness is unknown in 328P. The first 6 characters are ASCII, and the rest are hexadecimal.",
      tokens: [
        { name: "mcuid", val: ko.observable(""), description: "AVR serial number, mcuid is 6 ASCII characters followed by 4 hex digits. First hex digit = FF for 328P" }
      ]
    },
    {
      cmd: "GM",
      ret: ko.observable(""),
      description: "get voltMeter settings",
      tokens: [
        { name: "voltcalefactor", val: ko.observable(""), description: "" },
        { name: "voltoffset", val: ko.observable(""), description: "" }
      ]
    },
    {
      cmd: "GO",
      ret: ko.observable(""),
      description: "get Overtemperature thresholds, thresholds are in 10ths of a degree Celcius",
      tokens: [
        { name: "ambientthresh", val: ko.observable(""), description: "" },
        { name: "irthresh", val: ko.observable(""), description: "" }
      ]
    },
    {
      cmd: "GP",
      ret: ko.observable(""),
      description: "get temPerature (v1.0.3+),  all temperatures are in 10th's of a degree Celcius<br/>if any temperature sensor is not installed, its return value is -2560",
      tokens: [
        { name: "ds3231temp", val: ko.observable(""), description: "temperature from DS3231 RTC" },
        { name: "mcp9808temp", val: ko.observable(""), description: "temperature from MCP9808" },
        { name: "tmp007temp", val: ko.observable(""), description: "temperature from TMP007" }
      ]
    },
    {
      cmd: "GS",
      ret: ko.observable(""),
      description: "get state",
      tokens: [
        { name: "evsestate", val: ko.observable(""), description: "(hex), EVSE_STATE_xxx" },
        { name: "elapsed", val: ko.observable(""), description: "(dec), elapsed charge time in seconds of current or last charging session" },
        { name: "pilotstate", val: ko.observable(""), description: "(hex), EVSE_STATE_xxx" },
        { name: "vflags", val: ko.observable(""), description: "(hex), EVCF_xxx" }
      ]
    },
    {
      cmd: "GT",
      ret: ko.observable(""),
      description: "get time (RTC)",
      tokens: [
        { name: "yr", val: ko.observable(""), description: "2-digit year" },
        { name: "mo", val: ko.observable(""), description: "" },
        { name: "day", val: ko.observable(""), description: "" },
        { name: "hr", val: ko.observable(""), description: "" },
        { name: "min", val: ko.observable(""), description: "" },
        { name: "sec", val: ko.observable(""), description: "" }
      ]
    },
    {
      cmd: "GU",
      ret: ko.observable(""),
      description: "get energy usage (v1.0.3+)",
      tokens: [
        { name: "Wattseconds", val: ko.observable(""), description: "Watt-seconds used this charging session, note you'll divide Wattseconds by 3600 to get Wh" },
        { name: "Whacc", val: ko.observable(""), description: "total Wh accumulated over all charging sessions, note you'll divide Wh by 1000 to get kWh" }
      ]
    },
    {
      cmd: "GV",
      ret: ko.observable(""),
      description: "get version",
      tokens: [
        { name: "firmware_version", val: ko.observable(""), description: "" },
        { name: "protocol_version", val: ko.observable(""), description: "protocol_version is deprecated. too hard to maintain variants, ignore it, and test commands for compatibility, instead." }
      ]
    },
    {
      cmd: "GY",
      ret: ko.observable(""),
      description: "Get Hearbeat Supervision Status",
      tokens: [
        { name: "heartbeatinterval", val: ko.observable(""), description: "" },
        { name: "hearbeatcurrentlimit", val: ko.observable(""), description: "" },
        { name: "hearbeattrigger", val: ko.observable(""), description: "0 - There has never been a missed pulse, <br/>2 - there is a missed pulse, and HS is still in current limit<br/>1 - There was a missed pulse once, but it has since been acknkoledged. Ampacity has been successfully restored to max permitted " }
      ]
    }
  ];

  self.readCount = ko.observable(0);
  self.read = () => {
    self.readCount(0);
    self.readNext();
  };

  self.regex = /\$([^^]*)(\^..)?/;

  self.readNext = () =>
  {
    if (self.readCount() < self.get_commands.length)
    {
      var cmd = self.get_commands[self.readCount()];

      $.get(self.baseEndpoint() + "/r?json=1&rapi="+encodeURI("$"+cmd.cmd), (data) =>
      {
        cmd.ret(data.ret);
        var match = data.ret.match(self.regex);
        if(null !== match)
        {
          var response = match[1].split(/ +/);
          if("OK" === response[0])
          {
            for(var i = 0; i < cmd.tokens.length && i+1 < response.length; i++) {
              cmd.tokens[i].val(response[i+1]);
            }
          }
        }
      }, "json").always(function () {
        self.readCount(self.readCount() + 1);
        self.readNext();
      });
    }
  };

  self.send = function() {
    self.rapiSend(true);
    $.get(self.baseEndpoint() + "/r?json=1&rapi="+encodeURI(self.cmd()), function (data) {
      self.ret(">"+data.ret);
      self.cmd(data.cmd);
      self.history(self.history() + "&gt; " +data.cmd + "<br/>&lt; " + data.ret + "<br/>");
    }, "json").always(function () {
      self.rapiSend(false);
    });
  };

  self.clear = () => {
    self.history("");
  };
}
