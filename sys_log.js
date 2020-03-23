/*
 * clock.js
 * Display a digital clock on a small I2C connected display
 * 
 * 2016-11-28 v1.0 Harald Kubota
 */


"use strict";

// NOTE: On newer versions of Raspberry Pi the I2C is set to 1,
// however on other platforms you may need to adjust if to
// another value, for example 0.
var bus = 3;

var i2c = require('i2c-bus'),
    i2cBus = i2c.openSync(bus),
    oled = require('oled-i2c-bus');
var font = require('oled-font-5x7');

var ip = require("ip");
var sleep = require('system-sleep');

const SIZE_X=128,
      SIZE_Y=32;

var opts = {
  width: SIZE_X,
  height: SIZE_Y,
  address: 0x3c
};

try {
  var oled = new oled(i2cBus, opts);

  oled.clearDisplay();
  oled.turnOnDisplay();

  oled.drawPixel([
    [SIZE_X-0, 0, 0],
    [SIZE_X-0, SIZE_Y-0, 0],
    [0, SIZE_Y-0, 0],
    [0, 0, 0]
  ]);

  oled.drawLine(1, 1, SIZE_X-2, 1, 1);
  oled.drawLine(SIZE_X-2, 1, SIZE_X-2, SIZE_Y-2, 1);
  oled.drawLine(SIZE_X-2, SIZE_Y-2, 1, SIZE_Y-2, 1);
  oled.drawLine(1, SIZE_Y-2, 1, 1, 1);
}
catch(err) {
  // Print an error message and terminate the application
  console.log(err.message);
  process.exit(1);
}

// displayMsg('Start Sparrow Board');
// sleep(1000)
// displayMsg('IP: ' + ip.address());
oled.setCursor(1,1)
oled.writeString(font, 1, 'Start Sparrow Board', 1, true);
oled.setCursor(1,2)
oled.writeString(font, 1, 'IP: ' + ip.address(), 1, true);
// displayMsg('IP: ' + ip.address());

function displayMsg(msg) {
  // Location fits 128x32 OLED
  oled.clearDisplay();
  oled.setCursor(4, 12);
  oled.writeString(font, 1, msg, 1, true);
}

