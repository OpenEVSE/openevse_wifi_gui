/* global $, ko, BaseViewModel */
/* exported ConsoleViewModel */

function ConsoleViewModel(baseEndpoint, type) {
  "use strict";
  this.endpoint = () => { return baseEndpoint() + "/" + type; };
  this.wsEndpoint = () => {
    var url = new URL(this.endpoint(), window.location);

    var ws = "ws://" + url.hostname;
    if("https:" === url.protocol) {
      ws = "wss://" + url.hostname;
    }
    if(url.port && 80 !== url.port) {
      ws += ":"+url.port;
    }
    ws += url.pathname + "/console";
    return ws;
  };

  this.console = ko.observable("");

  var running = false;
  var socket = false;
  var reconnectInterval = false;

  function fixLineEndings(text) {
    return text.replace(/(\r\n|\n|\r)/gm,"\n");
  }

  this.start = () =>
  {
    this.stop();
    
    running = true;

    $.get(this.endpoint(), (data) => {
      this.console(fixLineEndings(data));
      this.connect();
    }, "text");
  };

  this.stop = () =>
  {
    running = false;
    if(false !== socket) { 
      socket.close();
      socket = false;
    }
  };

  this.connect = () => {
    socket = new WebSocket(this.wsEndpoint());
    socket.onclose = () => {
      if(running) {
        this.reconnect();
      }
    };
    socket.onmessage = (msg) => {
      this.console(this.console()+fixLineEndings(msg.data));
    };
    socket.onerror = (ev) => {
      console.log(ev);
      socket.close();
      this.reconnect();
    };
  };

  this.reconnect = () => {
    if(false === reconnectInterval) {
      reconnectInterval = setTimeout(() => {
        reconnectInterval = false;
        this.connect();
      }, 500);
    }
  };

}
