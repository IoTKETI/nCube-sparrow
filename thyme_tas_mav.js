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
var moment = require('moment');

var socket_arr = {};
exports.socket_arr = socket_arr;

var tas_buffer = {};
exports.buffer = tas_buffer;

var t_count = 0;

var _this = this;

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

        mavPortOpening();
        ltePortOpening();
    }
};

function tas_handler(data) {
    socket_mav = this;
    //mqtt_client.publish(my_cnt_name, data);
    
    _this.send_aggr_to_Mobius(my_cnt_name, data.toString(), 100);
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

function mavPortOpening() {
    if (mavPort == null) {
        mavPort = new SerialPort(conf.serial_list.mav.port, {
            baudRate: parseInt(conf.serial_list.mav.baudrate, 10),
        });

        mavPort.on('open', mavPortOpen);
        mavPort.on('close', mavPortClose);
        mavPort.on('error', mavPortError);
        mavPort.on('data', mavPortData);
    }
    else {
        if (mavPort.isOpen) {

        }
        else {
            mavPort.open();
        }
    }
}

function mavPortOpen() {
    console.log('mavPort open. ' + conf.serial_list.mav.port + ' Data rate: ' + mavPort.settings.baudRate);
}

function mavPortClose() {
    console.log('mavPort closed.');

    mavPortOpening();
}

function mavPortError(error) {
    var error_str = error.toString();
    console.log('[mavPort error]: ' + error.message);
    if (error_str.substring(0, 14) == "Error: Opening") {

    }
    else {
        console.log('mavPort error : ' + error);
    }

    setTimeout(mavPortOpening, 2000);
}

global.mav_ver = 1;

var mavStr = [];
var mavStrPacket = '';

var pre_seq = 0;
function mavPortData(data) {
    mavStr += data.toString('hex');
    if(data[0] == 0xfe || data[0] == 0xfd) {
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

        var mavPacket = '';
        for (var idx in mavStrArr) {
            if(mavStrArr.hasOwnProperty(idx)) {
                mavPacket = mavStrPacket + mavStrArr[idx];

                if(mav_ver == 1) {
                    var refLen = (parseInt(mavPacket.substr(2, 2), 16) + 8) * 2;
                }
                else if(mav_ver == 2) {
                    refLen = (parseInt(mavPacket.substr(2, 2), 16) + 12) * 2;
                }

                if(refLen == mavPacket.length) {
                    mqtt_client.publish(my_cnt_name, new Buffer.from(mavPacket, 'hex'));
                    _this.send_aggr_to_Mobius(my_cnt_name, mavPacket, 1500);
                    mavStrPacket = '';

                    setTimeout(parseMav, 0, mavPacket);
                }
                else if(refLen < mavPacket.length) {
                    mavStrPacket = '';
                    //console.log('                        ' + mavStrArr[idx]);
                }
                else {
                    mavStrPacket = mavPacket;
                    //console.log('                ' + mavStrPacket.length + ' - ' + mavStrPacket);
                }
            }
        }

        if(mavStrPacket != '') {
            mavStr = mavStrPacket;
            mavStrPacket = '';
        }
        else {
            mavStr = '';
        }
    }
}

var gpi = {};
gpi.GLOBAL_POSITION_INT = {};

var hb = {};
hb.HEARTBEAT = {};

var flag_base_mode = 0;

function parseMav(mavPacket) {
    var ver = mavPacket.substr(0, 2);
    if (ver == 'fd') {
        var sysid = mavPacket.substr(10, 2).toLowerCase();
        var msgid = mavPacket.substr(14, 6).toLowerCase();
    }
    else {
        sysid = mavPacket.substr(6, 2).toLowerCase();
        msgid = mavPacket.substr(10, 2).toLowerCase();
    }

    var cur_seq = parseInt(mavPacket.substr(4, 2), 16);

    if(pre_seq == cur_seq) {
        //console.log('        ' + pre_seq + ' - ' + cur_seq + ' - ' + mavPacket);
    }
    else {
        //console.log('        ' + pre_seq + ' - ' + cur_seq + ' - ' + mavPacket;
    }
    pre_seq = (cur_seq + 1) % 256;

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
            var base_offset = 20;
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

        //console.log(gpi);
    }
    
    else if (msgid == '4c') { // #76 : COMMAND_LONG
        
    }
    
    else if (msgid == '00') { // #00 : HEARTBEAT
        if (ver == 'fd') {
            base_offset = 20;
            var custom_mode = mavPacket.substr(base_offset, 8).toLowerCase();
            base_offset += 8;
            var type = mavPacket.substr(base_offset, 2).toLowerCase();
            base_offset += 2;
            var autopilot = mavPacket.substr(base_offset, 2).toLowerCase();
            base_offset += 2;
            var base_mode = mavPacket.substr(base_offset, 2).toLowerCase();
            base_offset += 2;
            var system_status = mavPacket.substr(base_offset, 2).toLowerCase();
            base_offset += 2;
            var mavlink_version = mavPacket.substr(base_offset, 2).toLowerCase();
        }
        else {
            base_offset = 12;
            custom_mode = mavPacket.substr(base_offset, 8).toLowerCase();
            base_offset += 8;
            type = mavPacket.substr(base_offset, 2).toLowerCase();
            base_offset += 2;
            autopilot = mavPacket.substr(base_offset, 2).toLowerCase();
            base_offset += 2;
            base_mode = mavPacket.substr(base_offset, 2).toLowerCase();
            base_offset += 2;
            system_status = mavPacket.substr(base_offset, 2).toLowerCase();
            base_offset += 2;
            mavlink_version = mavPacket.substr(base_offset, 2).toLowerCase();
        }
        
        console.log(mavPacket);
        hb.HEARTBEAT.type = Buffer.from(type, 'hex').readUInt8(0);
        hb.HEARTBEAT.autopilot = Buffer.from(autopilot, 'hex').readUInt8(0);
        hb.HEARTBEAT.base_mode = Buffer.from(base_mode, 'hex').readUInt8(0);
        hb.HEARTBEAT.custom_mode = Buffer.from(custom_mode, 'hex').readUInt32LE(0);
        hb.HEARTBEAT.system_status = Buffer.from(system_status, 'hex').readUInt8(0);
        hb.HEARTBEAT.mavlink_version = Buffer.from(mavlink_version, 'hex').readUInt8(0);
        
        if(hb.HEARTBEAT.base_mode & 0x80) {
            if(flag_base_mode == 0) {
                flag_base_mode = 1;
                var timestamp = moment().format('YYYY_MM_DD_T_hh_mm');
                my_cnt_name = my_parent_cnt_name + '/' + timestamp;
                
                sh_adn.crtct(my_parent_cnt_name+'?rcn=0', timestamp, 0, function (rsc, res_body, count) {
                });
            }
        }
        else {
            flag_base_mode = 0;
            my_cnt_name = my_parent_cnt_name + '/' + 'disarm';
        }
                
        console.log(hb);
    }
}



function ltePortOpening() {
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
}

function ltePortOpen() {
    console.log('ltePort open. ' + conf.serial_list.lte.port + ' Data rate: ' + ltePort.settings.baudRate);
}

function ltePortClose() {
    console.log('ltePort closed.');

    ltePortOpening();
}

function ltePortError(error) {
    var error_str = error.toString();
    console.log('[ltePort error]: ' + error.message);
    if (error_str.substring(0, 14) == "Error: Opening") {

    }
    else {
        console.log('[ltePort error]: ' + error);
    }

    setTimeout(ltePortOpening, 2000);
}

function lteReqGetRssi() {
    if(ltePort != null) {
        if (ltePort.isOpen) {
            //var message = new Buffer.from('AT+CSQ\r');
            var message = new Buffer.from('AT@DBG\r');
            ltePort.write(message);
        }
    }
}

setInterval(lteReqGetRssi, 3000);

var count = 0;
var strRssi = '';

function ltePortData(data) {
    strRssi += data.toString();
    
    //console.log(strRssi);
    
    var arrRssi = strRssi.split('OK');
    
    if(arrRssi.length >= 2) {
        //console.log(arrRssi);

        var strLteQ = arrRssi[0].replace(/ /g, '');
        var arrLteQ = strLteQ.split(',');

        for(var idx in arrLteQ) {
            if(arrLteQ.hasOwnProperty(idx)) {
                //console.log(arrLteQ[idx]);
                var arrQValue = arrLteQ[idx].split(':');
                if(arrQValue[0] == 'RSRP') {
                    gpi.GLOBAL_POSITION_INT.rsrp = parseFloat(arrQValue[1].replace('dbm', ''));
                }
                else if(arrQValue[0] == 'RSRQ') {
                    gpi.GLOBAL_POSITION_INT.rsrq = parseFloat(arrQValue[1].replace('dbm', ''));
                }
                else if(arrQValue[0] == 'RSSI') {
                    gpi.GLOBAL_POSITION_INT.rssi = parseFloat(arrQValue[1].replace('dbm', ''));
                }
                else if(arrQValue[0] == 'SINR') {
                    gpi.GLOBAL_POSITION_INT.sinr = parseFloat(arrQValue[1].replace('db', ''));
                }
            }
        }
        
        // var rssiVal = parseInt(arrRssi[0].split('+CSQ:')[1].split(',')[0], 10);
        //
        // if(rssiVal == 0) {
        //     gpi.GLOBAL_POSITION_INT.rssi = -113;
        // }
        // else if(rssiVal == 31) {
        //     gpi.GLOBAL_POSITION_INT.rssi = -51;
        // }
        // else if(rssiVal == 99) {
        //     gpi.GLOBAL_POSITION_INT.rssi = 99;
        // }
        // else {
        //     gpi.GLOBAL_POSITION_INT.rssi = -113 + (rssiVal * 2);
        // }
        
        //console.log(gpi);
        
        setTimeout(sendLteRssi, 0, gpi);
        
        strRssi = '';
    }
}

function sendLteRssi(gpi) {
    if(my_mission_name != '') {
        var parent = my_mission_name+'?rcn=0';
        sh_adn.crtci(parent, 0, gpi, null, function () {

        });
    }
}

var aggr_content = {};

exports.send_aggr_to_Mobius = function(topic, content_each, gap) {
    if(aggr_content.hasOwnProperty(topic)) {
        var timestamp = moment().format('YYYY-MM-DDThh:mm:ssSSS');
        aggr_content[topic][timestamp] = content_each;
    }
    else {
        aggr_content[topic] = {};
        timestamp = moment().format('YYYY-MM-DDThh:mm:ssSSS');
        aggr_content[topic][timestamp] = content_each;

        setTimeout(function () {
            sh_adn.crtci(topic+'?rcn=0', 0, aggr_content[topic], null, function () {

            });

            delete aggr_content[topic];
        }, gap, topic);
    }
};

