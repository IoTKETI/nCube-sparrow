"use strict";

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

}
catch(err) {
  // Print an error message and terminate the application
  console.log(err.message);
  process.exit(1);
}

oled.clearDisplay();
oled.setCursor(1,10)
oled.writeString(font, 1, 'Start Sparrow Board', 1, true);
oled.setCursor(1,20)
oled.writeString(font, 1, 'IP: ' + ip.address(), 1, true);
// displayMsg('IP: ' + ip.address());