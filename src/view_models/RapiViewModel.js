/* global $, ko */
/* exported RapiViewModel */

function RapiViewModel(baseEndpoint) {
  "use strict";
  var self = this;

  const openevse_flags = {
    OPENEVSE_ECF_L2:                 0x0001, // service level 2
    OPENEVSE_ECF_DIODE_CHK_DISABLED: 0x0002, // no diode check
    OPENEVSE_ECF_VENT_REQ_DISABLED:  0x0004, // no vent required state
    OPENEVSE_ECF_GND_CHK_DISABLED:   0x0008, // no chk for ground fault
    OPENEVSE_ECF_STUCK_RELAY_CHK_DISABLED: 0x0010, // no chk for stuck relay
    OPENEVSE_ECF_AUTO_SVC_LEVEL_DISABLED:  0x0020, // auto detect svc level - requires ADVPWR
    OPENEVSE_ECF_AUTO_START_DISABLED: 0x0040,  // no auto start charging
    OPENEVSE_ECF_SERIAL_DBG:         0x0080, // enable debugging messages via serial
    OPENEVSE_ECF_MONO_LCD:           0x0100, // monochrome LCD backlight
    OPENEVSE_ECF_GFI_TEST_DISABLED:  0x0200, // no GFI self test
    OPENEVSE_ECF_TEMP_CHK_DISABLED:  0x0400, // no Temperature Monitoring
    OPENEVSE_ECF_BUTTON_DISABLED:    0x8000  // front panel button disabled
  };

  const openevse_vflags = {
    OPENEVSE_VFLAG_AUTOSVCLVL_SKIPPED:   0x0001, // auto svc level test skipped during post
    OPENEVSE_VFLAG_HARD_FAULT:           0x0002, // in non-autoresettable fault
    OPENEVSE_VFLAG_LIMIT_SLEEP:          0x0004, // currently sleeping after reaching time/charge limit
    OPENEVSE_VFLAG_AUTH_LOCKED:          0x0008, // locked pending authentication
    OPENEVSE_VFLAG_AMMETER_CAL:          0x0010, // ammeter calibration mode
    OPENEVSE_VFLAG_NOGND_TRIPPED:        0x0020, // no ground has tripped at least once
    OPENEVSE_VFLAG_CHARGING_ON:          0x0040, // charging relay is closed
    OPENEVSE_VFLAG_GFI_TRIPPED:          0x0080, // gfi has tripped at least once since boot
    OPENEVSE_VFLAG_EV_CONNECTED:         0x0100, // EV connected - valid only when pilot not N12
    OPENEVSE_VFLAG_SESSION_ENDED:        0x0200, // used for charging session time calc
    OPENEVSE_VFLAG_EV_CONNECTED_PREV:    0x0400, // prev EV connected flag
    OPENEVSE_VFLAG_UI_IN_MENU:           0x0800, // onboard UI currently in a menu
  };

  const openevse_state = {
    0: "OPENEVSE_STATE_STARTING",
    1: "OPENEVSE_STATE_NOT_CONNECTED",
    2: "OPENEVSE_STATE_CONNECTED",
    3: "OPENEVSE_STATE_CHARGING",
    4: "OPENEVSE_STATE_VENT_REQUIRED",
    5: "OPENEVSE_STATE_DIODE_CHECK_FAILED",
    6: "OPENEVSE_STATE_GFI_FAULT",
    7: "OPENEVSE_STATE_NO_EARTH_GROUND",
    8: "OPENEVSE_STATE_STUCK_RELAY",
    9: "OPENEVSE_STATE_GFI_SELF_TEST_FAILED",
    10: "OPENEVSE_STATE_OVER_TEMPERATURE",
    11: "OPENEVSE_STATE_OVER_CURRENT",
    254: "OPENEVSE_STATE_SLEEPING",
    255: "OPENEVSE_STATE_DISABLED"
  };

  self.baseEndpoint = baseEndpoint;

  self.rapiSend = ko.observable(false);
  self.cmd = ko.observable("");
  self.ret = ko.observable("");
  self.history = ko.observable("");

  self.flags = ko.observableArray("");
  self.vflags = ko.observableArray("");
  self.evsestate = ko.observableArray("");
  self.pilotstate = ko.observableArray("");

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
        { name: "flags", val: self.flags, description: "(hex)", 
          parsed: ko.computed(() => {
            var ret = [];
            const val = parseInt(self.flags(), 16);
            if(!isNaN(val)) {
              for (const flag in openevse_flags) {
                if (Object.hasOwnProperty.call(openevse_flags, flag)) {
                  const mask = openevse_flags[flag];
                  if(val & mask) {
                    ret.push({val: flag});
                  }                    
                }
              }
            }
            return ret;
          }) }
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
        { name: "evsestate", val: self.evsestate, description: "(hex), EVSE_STATE_xxx",
          parsed: ko.computed(() => {
            const val = parseInt(self.evsestate());
            if(!isNaN(val) && val in openevse_state) {
              return [ { val: openevse_state[val] } ];
            }
            return [ { val: "UNKNOWN" } ];
          })
        },
        { name: "elapsed", val: ko.observable(""), description: "(dec), elapsed charge time in seconds of current or last charging session" },
        { name: "pilotstate", val: self.pilotstate, description: "(hex), EVSE_STATE_xxx",
          parsed: ko.computed(() => {
            const val = parseInt(self.pilotstate());
            if(!isNaN(val) && val in openevse_state) {
              return [ { val: openevse_state[val] } ];
            }
            return [ { val: "UNKNOWN" } ];
          })
        },
        { name: "vflags", val: self.vflags, description: "(hex), EVCF_xxx", 
          parsed: ko.computed(() => {
            var ret = [];
            const val = parseInt(self.vflags(), 16);
            if(!isNaN(val)) {
              for (const flag in openevse_vflags) {
                if (Object.hasOwnProperty.call(openevse_vflags, flag)) {
                  const mask = openevse_vflags[flag];
                  if(val & mask) {
                    ret.push({val: flag});
                  }                    
                }
              }
            }
            return ret;
          })
       }
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
