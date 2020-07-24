/* global $, Terminal */


// https://github.com/xtermjs/xterm.js/tree/master/addons/xterm-addon-fit
var MINIMUM_COLS = 2;
var MINIMUM_ROWS = 1;
var FitAddon = (function () {
  function FitAddon() {
  }
  FitAddon.prototype.activate = function (terminal) {
    this._terminal = terminal;
  };
  FitAddon.prototype.dispose = function () { };
  FitAddon.prototype.fit = function () {
    var dims = this.proposeDimensions();
    if (!dims || !this._terminal) {
      return;
    }
    var core = this._terminal._core;
    if (this._terminal.rows !== dims.rows || this._terminal.cols !== dims.cols) {
      core._renderService.clear();
      this._terminal.resize(dims.cols, dims.rows);
    }
  };
  FitAddon.prototype.proposeDimensions = function () {
    if (!this._terminal) {
      return undefined;
    }
    if (!this._terminal.element || !this._terminal.element.parentElement) {
      return undefined;
    }
    var core = this._terminal._core;
    var parentElementStyle = window.getComputedStyle(this._terminal.element.parentElement);
    var parentElementHeight = parseInt(parentElementStyle.getPropertyValue("height"));
    var parentElementWidth = Math.max(0, parseInt(parentElementStyle.getPropertyValue("width")));
    var elementStyle = window.getComputedStyle(this._terminal.element);
    var elementPadding = {
      top: parseInt(elementStyle.getPropertyValue("padding-top")),
      bottom: parseInt(elementStyle.getPropertyValue("padding-bottom")),
      right: parseInt(elementStyle.getPropertyValue("padding-right")),
      left: parseInt(elementStyle.getPropertyValue("padding-left"))
    };
    var elementPaddingVer = elementPadding.top + elementPadding.bottom;
    var elementPaddingHor = elementPadding.right + elementPadding.left;
    var availableHeight = parentElementHeight - elementPaddingVer;
    var availableWidth = parentElementWidth - elementPaddingHor - core.viewport.scrollBarWidth;
    var geometry = {
      cols: Math.max(MINIMUM_COLS, Math.floor(availableWidth / core._renderService.dimensions.actualCellWidth)),
      rows: Math.max(MINIMUM_ROWS, Math.floor(availableHeight / core._renderService.dimensions.actualCellHeight))
    };
    return geometry;
  };
  return FitAddon;
}());

(function () {
  "use strict";

  var socket = false;
  var reconnectInterval = false;
  var term = new Terminal();
  var fitAddon = new FitAddon();
  term.loadAddon(fitAddon);

  var validTerminals = ["debug", "evse"];

  var type = "debug";
  if ("" !== window.location.search) {
    var val = window.location.search.substr(1);
    if (validTerminals.includes(val)) {
      type = val;
    }
  }

  var url = new URL(type, window.location);

  var ws = "ws://" + url.hostname;
  if ("https:" === url.protocol) {
    ws = "wss://" + url.hostname;
  }
  if (url.port && 80 !== url.port) {
    ws += ":" + url.port;
  }
  ws += url.pathname + "/console";

  function fixLineEndings(text) {
    return text.replace(/(\r\n|\n|\r)/gm, "\n\r");
  }

  function connect() {
    socket = new WebSocket(ws);
    socket.onclose = () => {
      reconnect();
    };
    socket.onmessage = (msg) => {
      term.write(fixLineEndings(msg.data));
    };
    socket.onerror = (ev) => {
      console.log(ev);
      socket.close();
      reconnect();
    };
  }

  function reconnect() {
    if (false === reconnectInterval) {
      reconnectInterval = setTimeout(() => {
        reconnectInterval = false;
        connect();
      }, 500);
    }
  }

  $(() => {
    term.open(document.getElementById("term"));
    fitAddon.fit();

    $.get(url.href, (data) => {
      term.write(fixLineEndings(data));
      connect();
    }, "text");
  });

  $( window ).resize(() => {
    fitAddon.fit();
  });
})();
