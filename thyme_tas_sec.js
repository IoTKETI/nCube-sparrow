/**
 * Created by Il Yeup, Ahn in KETI on 2017-02-25.
 */

/**
 * Copyright (c) 2018, OCEAN
 * All rights reserved.
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 * 1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 * 3. The name of the author may not be used to endorse or promote products derived from this software without specific prior written permission.
 * THIS SOFTWARE IS PROVIDED BY THE AUTHOR ``AS IS'' AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

// for TAS
var net = require('net');
var ip = require('ip');

var socket_arr = {};
exports.socket_arr = socket_arr;

var tas_buffer = {};
exports.buffer = tas_buffer;


var t_count = 0;

global.secPort = null;

exports.ready = function tas_ready() {
    secPortOpening();
};

var socket_sec = null;
function tas_handler (data) {
    socket_sec = this;
    //mqtt_client.publish(my_cnt_name, data);
    /*
    // 'this' refers to the socket calling this callback.
    tas_buffer[this.id] += data.toString();
    //console.log(tas_buffer[this.id]);
    tas_buffer[this.id] = tas_buffer[this.id].replace(/\n\u0000/g, '');
    var data_arr = tas_buffer[this.id].split('<EOF>');
    if(data_arr.length >= 2) {
        for (var i = 0; i < data_arr.length-1; i++) {
            var line = data_arr[i];
            tas_buffer[this.id] = tas_buffer[this.id].replace(line+'<EOF>', '');
            var jsonObj = JSON.parse(line);
            var ctname = jsonObj.ctname;
            var content = jsonObj.con;

            socket_arr[ctname] = this;

            //console.log('----> got data for [' + ctname + '] from tas ---->');

            if (jsonObj.con == 'hello') {
                //this.write(line);
            }
            else {
                if (sh_state == 'crtci') {
                    for (var j = 0; j < conf.cnt.length; j++) {
                        if (conf.cnt[j].parent.split('/')[3] == ctname) {
                            //console.log(line);
                            var parent = conf.cnt[j].parent + '/' + conf.cnt[j].name;

                            mqtt_client.publish(parent, content);

                            //sh_adn.crtci(parent, j, content, this, function (status, res_body, to, socket) {
                            //     // try {
                            //     //     var to_arr = to.split('/');
                            //     //     var ctname = to_arr[to_arr.length - 1];
                            //     //     var result = {};
                            //     //     result.ctname = ctname;
                            //     //     result.con = status;
                            //     //
                            //     //     console.log('<---- x-m2m-rsc : ' + status + ' <----');
                            //     //     if (status == 5106 || status == 2001 || status == 4105) {
                            //     //     }
                            //     //     else if (status == 5000) {
                            //     //         sh_state = 'crtae';
                            //     //     }
                            //     //     else if (status == 9999) {
                            //     //     }
                            //     //     else {
                            //     //     }
                            //     //
                            //     //     //socket.write(JSON.stringify(result));
                            //     // }
                            //     // catch (e) {
                            //     //     console.log(e.message);
                            //     // }
                            //});
                            break;
                        }
                    }
                }
            }
        }
    }*/
}

var SerialPort = require('serialport');

function secPortOpening() {
    if (secPort == null) {
        secPort = new SerialPort(conf.serial_list.sec.port, {
            baudRate: parseInt(conf.serial_list.sec.baudrate, 10),
        });

        secPort.on('open', secPortOpen);
        secPort.on('close', secPortClose);
        secPort.on('error', secPortError);
        secPort.on('data', secPortData);
    }
    else {
        if (secPort.isOpen) {

        }
        else {
            secPort.open();
        }
    }
}

function secPortOpen() {
    console.log('secPort open. ' + conf.serial_list.sec.port + ' Data rate: ' + secPort.settings.baudRate);

    triggerSec();
}

function secPortClose() {
    console.log('secPort closed.');

    secPortOpening();
}

function secPortError(error) {
    var error_str = error.toString();
    console.log('[secPort error]: ' + error.message);
    if (error_str.substring(0, 14) == "Error: Opening") {

    }
    else {
        console.log('secPort error : ' + error);
    }

    setTimeout(secPortOpening, 2000);
}

var secStr = [];
var secStrPacket = '';

var pre_seq = 0;
function secPortData(data) {
    secStr += data.toString('hex');

    console.log(secStr);
    //if(data[0] == 0x5a) {
        var mavStrArr = [];

        var str = '';
        var split_idx = 0;

        mavStrArr[split_idx] = str;
        for (var i = 0; i < secStr.length; i+=2) {
            str = secStr.substr(i, 2);
            if (str == '5a') {
                mavStrArr[++split_idx] = '';
            }
            mavStrArr[split_idx] += str;
        }
        mavStrArr.splice(0, 1);

        var secPacket = '';
        for (var idx in mavStrArr) {
            if(mavStrArr.hasOwnProperty(idx)) {
                secPacket = secStrPacket + mavStrArr[idx];

                var refLen = (parseInt(secPacket.substr(8, 2), 16) + 5) * 2;

                if(refLen == secPacket.length) {
                    console.log('Req_auth - ' + secPacket);
                    send_to_Mobius(Req_auth, secPacket, 0);
                    secStrPacket = '';
                }
                else if(refLen < secPacket.length) {
                    secStrPacket = '';
                    //console.log('                        ' + mavStrArr[idx]);
                }
                else {
                    secStrPacket = secPacket;
                    //console.log('                ' + mavStrPacket.length + ' - ' + mavStrPacket);
                }
            }
        }

        if(secStrPacket != '') {
            secStr = secStrPacket;
            secStrPacket = '';
        }
        else {
            secStr = '';
        }
    //}
}

var gpi = {};
gpi.GLOBAL_POSITION_INT = {};

var hb = {};
hb.HEARTBEAT = {};

var flag_base_mode = 0;

function triggerSec() {
    if(secPort != null) {
        if (secPort.isOpen) {
            console.log('Trigger Sec Board');
            secPort.write(Buffer.from('5aa5f00001aa', 'hex'));
        }
    }
}

exports.toSecBoard = function(cinObj) {
    if(cinObj.hasOwnProperty('con')) {
        if(cinObj.con == '') {
            console.log('---- is not cin message');
        }
        else {
            if(cinObj.con == 'done') {
                authResult = 'done';
            }
            else {
                if(secPort != null) {
                    if (secPort.isOpen) {
                        console.log('Res_auth to Sec Board');
                        secPort.write(Buffer.from(cinObj.con, 'hex'));
                    }
                }
            }
        }
    }
};
