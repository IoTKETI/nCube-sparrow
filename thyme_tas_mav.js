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

function timer_upload_action() {
    if (sh_state == 'crtci') {
        for (var j = 0; j < conf.cnt.length; j++) {
            if (conf.cnt[j].name == '0.2.481.1.114.IND-0002.23') {
                var content = JSON.stringify({value: 'TAS' + t_count++});
                //var content = parseInt(Math.random()*100).toString();
                console.log('thyme cnt-timer ' + content + ' ---->');
                var parent = conf.cnt[j].parent + '/' + conf.cnt[j].name;
                sh_adn.crtci(parent, j, content, this, function (status, res_body, to, socket) {
                    console.log('x-m2m-rsc : ' + status + ' <----');
                });
                break;
            }
        }
        if (t_count >= 3000) {
            sh_state = 'exit';
            console.log(sh_state);
        }
    }
}

//wdt.set_wdt(require('shortid').generate(), 5, timer_upload_action);

var _server = null;
global.mavPort = null;
var ltePort = null;
exports.ready = function tas_ready() {
    if (_server == null) {
        _server = net.createServer(function (socket) {
            console.log('socket connected');
            socket.id = Math.random() * 1000;
            tas_buffer[socket.id] = '';
            socket.on('data', tas_handler);
            socket.on('end', function () {
                console.log('end');
            });
            socket.on('close', function () {
                console.log('close');
            });
            socket.on('error', function (e) {
                console.log('error ', e);
            });
        });

        _server.listen(conf.ae.tas_mav_port, function () {
            console.log('TCP Server (' + ip.address() + ') for TAS is listening on port ' + conf.ae.tas_mav_port);
        });
    }
};

function tas_handler(data) {
    socket_mav = this;
    mqtt_client.publish(my_cnt_name, data);
}

exports.noti = function (path_arr, cinObj, socket) {
    var cin = {};
    cin.ctname = path_arr[path_arr.length - 2];
    cin.con = (cinObj.con != null) ? cinObj.con : cinObj.content;

    if (cin.con == '') {
        console.log('---- is not cin message');
    }
    else {
        //console.log(JSON.stringify(cin));
        //        console.log(socket_arr);
        //        console.log(path_arr);
        //console.log('<---- send to tas - ' + cin.con);

        socket.write(JSON.stringify(cin));
    }
};

var SerialPort = require('serialport');
const Readline = require('@serialport/parser-readline');
//const Ready = require('@serialport/parser-ready');
//const Delimiter = require('@serialport/parser-delimiter');
// const ByteLength = require('@serialport/parser-byte-length');
// const InterByteTimeout = require('@serialport/parser-inter-byte-timeout');

setInterval(function () {
    if (mavPort == null) {
        mavPort = new SerialPort(conf.serial_list.mav.port, {
            baudRate: parseInt(conf.serial_list.mav.baudrate, 10),
        });

        mavPort.on('open', mavPortOpen);
        mavPort.on('close', mavPortClose);
        mavPort.on('error', mavPortError);
        mavPort.on('data', mavPortData);

        //const parser = mavPort.pipe(new Readline({encoding: 'hex'}));
        //parser.on('data', mavPortData) // emits data after every '\n'

        // const parser = mavPort.pipe(new Ready({ encoding: 'hex', delimiter: 'fe' }));
        // parser.on('ready', () => console.log('the ready byte sequence has been received'));
        // parser.on('data', mavPortData); // all data after READY is received

        // const parser = mavPort.pipe(new ByteLength({length: 8}));
        // parser.on('data', console.log) // will have 8 bytes per data event

        //const parser = port.pipe(new InterByteTimeout({interval: 3, maxBufferSize: 1}));
        // const parser = mavPort.pipe(new InterByteTimeout({interval: 3}));
        // parser.on('data', console.log) // will emit data if there is a pause between packets of at least 30ms

        //const parser = mavPort.pipe(new Delimiter({ delimiter: [0xfe] }));
        // const parser = mavPort.pipe(new Delimiter({ delimiter: [0xfe] }));
        // parser.on('data', mavPortData) // emits data after every '\n'

        // const parser = new Readline({encoding: 'hex'});
        // mavPort.pipe(parser);
        // parser.on('data', mavPortData);
    }
    else {
        if (mavPort.isOpen) {

        }
        else {
            mavPort.open();
        }
    }
}, 2000);

function mavPortOpen() {
    console.log('mavPort open. ' + conf.serial_list.mav.port + ' Data rate: ' + mavPort.settings.baudRate);
}

function mavPortClose() {
    console.log('mavPort closed.');
}

function mavPortError(error) {
    var error_str = error.toString();
    console.log('[mavPort error]: ' + error.message);
    if (error_str.substring(0, 14) == "Error: Opening") {

    }
    else {
        console.log('mavPort error : ' + error);
    }
}

global.mav_ver = 1;

var mavStr = [];
var mavStrPacket = '';

function mavPortData(data) {
    mavStr += data.toString('hex');

    var mavStrArr = [];

    var str = '';
    var split_idx = 0;

    mavStrArr[split_idx] = str;
    for (var i = 0; i < mavStr.length; i+=2) {
        str = mavStr.substr(i, 2);

        if(mav_ver == 1) {
            if (str == 'fe') {
                mavStrArr[++split_idx] = '';
            }
        }
        else if(mav_ver == 2) {
            if (str == 'fd') {
                mavStrArr[++split_idx] = '';
            }
        }

        mavStrArr[split_idx] += str;
    }
    mavStrArr.splice(0, 1);

    if(mavStrArr.length >= 1) {
        console.log(mavStr);
        //console.log(mavStrArr);
        for (var idx in mavStrArr) {
            if(mavStrArr.hasOwnProperty(idx)) {
                mavStrArr[idx] = mavStrPacket + mavStrArr[idx];

                if(mav_ver == 1) {
                    var refLen = (parseInt(mavStrArr[idx].substr(2, 2), 16) + 8) * 2;
                }
                else if(mav_ver == 2) {
                    refLen = (parseInt(mavStrArr[idx].substr(2, 2), 16) + 12) * 2;
                }
                //if( mavStrArr[idx].length - 2 <= refLen && refLen <= mavStrArr[idx].length + 2) {
                if(refLen == mavStrArr[idx].length) {
                    mqtt_client.publish(my_cnt_name, new Buffer.from(mavStrArr[idx], 'hex'));
                    mavStrPacket = '';

                    setTimeout(parseMav, 0, mavStrArr[idx]);
                }
                else if(refLen < mavStrArr[idx].length) {
                    mavStrPacket = '';
                    console.log('                        ' + mavStrArr[idx]);
                }
                else {
                    mavStrPacket = mavStrArr[idx];
                    console.log('                ' + mavStrPacket.length + ' - ' + mavStrPacket);
                }
            }
        }

        if(mavStrPacket != '') {
            mavStr = mavStrPacket;
            mavStrPacket = '';
        }
    }
}

var gpi = {};
gpi.GLOBAL_POSITION_INT = {};

function parseMav(mavPacket) {
    console.log('        ' + mavPacket);

    var ver = mavPacket.substr(0, 2);
    if (ver == 'fd') {
        var sysid = mavPacket.substr(10, 2).toLowerCase();
        var msgid = mavPacket.substr(14, 6).toLowerCase();
    }
    else {
        sysid = mavPacket.substr(6, 2).toLowerCase();
        msgid = mavPacket.substr(10, 2).toLowerCase();
    }

    // if(sysid == '37' ) {
    //     console.log('55 - ' + content_each);
    // }
    // else if(sysid == '0a' ) {
    //     console.log('10 - ' + content_each);
    // }
    // else if(sysid == '21' ) {
    //     console.log('33 - ' + content_each);
    // }
    // else if(sysid == 'ff' ) {
    //     console.log('255 - ' + content_each);
    // }

    if (msgid == '21') { // #33

        if (ver == 'fd') {
            var base_offset = 14;
            var time_boot_ms = mavPacket.substr(base_offset, 8).toLowerCase();
            base_offset += 8;
            var lat = mavPacket.substr(base_offset, 8).toLowerCase();
            base_offset += 8;
            var lon = mavPacket.substr(base_offset, 8).toLowerCase();
            base_offset += 8;
            var alt = mavPacket.substr(base_offset, 8).toLowerCase();
            base_offset += 8;
            var relative_alt = mavPacket.substr(base_offset, 8).toLowerCase();
        }
        else {
            base_offset = 12;
            time_boot_ms = mavPacket.substr(base_offset, 8).toLowerCase();
            base_offset += 8;
            lat = mavPacket.substr(base_offset, 8).toLowerCase();
            base_offset += 8;
            lon = mavPacket.substr(base_offset, 8).toLowerCase();
            base_offset += 8;
            alt = mavPacket.substr(base_offset, 8).toLowerCase();
            base_offset += 8;
            relative_alt = mavPacket.substr(base_offset, 8).toLowerCase();
        }

        gpi.GLOBAL_POSITION_INT.time_boot_ms = Buffer.from(time_boot_ms, 'hex').readUInt32LE(0);
        gpi.GLOBAL_POSITION_INT.lat = Buffer.from(lat, 'hex').readInt32LE(0);
        gpi.GLOBAL_POSITION_INT.lon = Buffer.from(lon, 'hex').readInt32LE(0);
        gpi.GLOBAL_POSITION_INT.alt = Buffer.from(alt, 'hex').readInt32LE(0);
        gpi.GLOBAL_POSITION_INT.relative_alt = Buffer.from(relative_alt, 'hex').readInt32LE(0);

        console.log(gpi);
    }
}

setInterval(function () {
    if (ltePort == null) {
        ltePort = new SerialPort(conf.serial_list.lte.port, {
            baudRate: parseInt(conf.serial_list.lte.baudrate, 10)
        });

        ltePort.on('open', ltePortOpen);
        ltePort.on('close', ltePortClose);
        ltePort.on('error', ltePortError);
        ltePort.on('data', ltePortData);
    }
    else {
        if (ltePort.isOpen) {

        }
        else {
            ltePort.open();
        }
    }
}, 2000);

function ltePortOpen() {
    console.log('ltePort open. ' + conf.serial_list.lte.port + ' Data rate: ' + ltePort.settings.baudRate);
}

function ltePortClose() {
    console.log('ltePort closed.');
}

function ltePortError(error) {
    var error_str = error.toString();
    console.log('[ltePort error]: ' + error.message);
    if (error_str.substring(0, 14) == "Error: Opening") {

    }
    else {
        console.log('[ltePort error]: ' + error);
    }
}

var count = 0;

function ltePortData(data) {
    var val = data.readUInt16LE(0, true);

    if (g_sink_buf_start == 0) {
        if (val == 0x16) {
            count = 1;
            g_sink_buf_start = 1;
            g_sink_ready.push(val);
        }
    }
    else if (g_sink_buf_start == 1) {
        if (val == 0x05) {
            count = 2;
            g_sink_buf_start = 2;
            g_sink_ready.push(val);
        }
    }
    else if (g_sink_buf_start == 2) {
        if (val == 0x01) {
            count = 3;
            g_sink_buf_start = 3;
            g_sink_ready.push(val);
        }
    }
    else if (g_sink_buf_start == 3) {
        count++;
        g_sink_ready.push(val);

        if (count >= 9) {
            console.log(g_sink_ready);

            /*CO2 통신 예제
            SEND(4바이트) : 0x11, 0x01, 0x01, 0xED
            Respond(8바이트) : 0x16, 0x05, 0x01, 0x02, 0x72, 0x01, 0xD6, 0x99
            응답의 0x16, 0x05, 0x01 은 항상 같은 값을 가지며, 빨간색 글씨의 0x02, 0x72 가 농도를 나타내는 수치입니다.
            (HEX) 0x0272 = 626
            즉, 농도는 626 ppm 입니다. */

            var nValue = g_sink_ready[3] * 256 + g_sink_ready[4];

            console.log(nValue);

            if (tas_state == 'upload') {
                for (var i = 0; i < upload_arr.length; i++) {
                    if (upload_arr[i].ctname == 'cnt-co2') {
                        var cin = {ctname: upload_arr[i].ctname, con: nValue.toString()};
                        console.log('SEND : ' + JSON.stringify(cin) + ' ---->');
                        upload_client.write(JSON.stringify(cin) + '<EOF>');
                        break;
                    }
                }
            }

            g_sink_ready = [];
            count = 0;
            g_sink_buf_start = 0;
        }
    }
}
