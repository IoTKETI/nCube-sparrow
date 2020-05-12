var Gpio = require('onoff').Gpio;
var buttons = new Gpio(6, 'in', 'both');
var exec = require('child_process').exec;

buttons.watch(function (err, value) {
  if (err){
    console.error('There was an error', err);
  return;
  }
  exec("sh gitpull.sh", function (error, stdout, stderr) {
    console.log('stdout: ' + stdout);
    console.log('stderr: ' + stderr);
    if (error !== null) {
      console.log('exec error: ' + error);
    }
  });
  //console.log(value);
});

function unexportOnClose() {
  button.unexport();
  LED.writeSync(0);
  LED.unexport();
};

process.on('SIGINT', unexportOnClose);
