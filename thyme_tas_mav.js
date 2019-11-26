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

var exec = require('child_process').exec;

var mavlink = require('./mavlibrary/mavlink.js');

var socket_arr = {};
exports.socket_arr = socket_arr;

var tas_buffer = {};
exports.buffer = tas_buffer;

var t_count = 0;

var _this = this;

var _server = null;
global.mavPort = null;
var ltePort = null;
var missionPort = null;
var missionPortNum = '/dev/ttyUSB5';
var missionBaudrate = '115200';

exports.ready = function tas_ready() {
    if (_server == null) {
        if(my_drone_type === 'dji') {
            _server = net.createServer(function (socket) {
                console.log('socket connected');
                socket.id = Math.random() * 1000;
                tas_buffer[socket.id] = '';
                socket.on('data', dji_handler);
                socket.on('end', function () {
                    console.log('end');
                });
                socket.on('close', function () {
                    console.log('close');
                });
                socket.on('error', function (e) {
                    console.log('error ', e);
                });

                exec('./djiosdk-Mobius UserConfig.txt', function (err, stdout, stderr) {
                    if (err) {
                        console.log('Child process exited with error code', err.code);
                    }
                    else {
                        console.log('djiosdk-Mobius running');
                    }
                });
            });

            _server.listen(conf.ae.tas_mav_port, function () {
                console.log('TCP Server (' + ip.address() + ') for TAS is listening on port ' + conf.ae.tas_mav_port);
            });
        }
        else if(my_drone_type === 'pixhawk') {
            mavPortOpening();
        }

        ltePortOpening();

        if(my_mission_name == 'h2battery') {
            missionPortNum = '/dev/ttyUSB3';
            missionBaudrate = '57600';
            missionPortOpening();
        }
    }
};


var aggr_content = {};

function send_aggr_to_Mobius(topic, content_each, gap) {
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
}


function mavlinkGenerateMessage(type, params) {
    var TEST_GEN_MAVLINK_SYSTEM_ID = 8;
    const mavlinkParser = new MAVLink(null/*logger*/, TEST_GEN_MAVLINK_SYSTEM_ID, 0);
    try {
        var mavMsg = null;
        var genMsg = null;
        //var targetSysId = sysId;
        var targetCompId = (params.targetCompId == undefined)?
            0:
            params.targetCompId;

        switch( type ) {
            // MESSAGE ////////////////////////////////////
            case mavlink.MAVLINK_MSG_ID_PING:
                mavMsg = new mavlink.messages.ping(params.time_usec, params.seq, params.target_system, params.target_component);
                break;
            case mavlink.MAVLINK_MSG_ID_HEARTBEAT:
                mavMsg = new mavlink.messages.heartbeat(params.type,
                    params.autopilot,
                    params.base_mode,
                    params.custom_mode,
                    params.system_status,
                    params.mavlink_version);
                break;
            case mavlink.MAVLINK_MSG_ID_GPS_RAW_INT:
                mavMsg = new mavlink.messages.gps_raw_int(params.time_usec,
                    params.fix_type,
                    params.lat,
                    params.lon,
                    params.alt,
                    params.eph,
                    params.epv,
                    params.vel,
                    params.cog,
                    params.satellites_visible,
                    params.alt_ellipsoid,
                    params.h_acc,
                    params.v_acc,
                    params.vel_acc,
                    params.hdg_acc);
                break;
            case mavlink.MAVLINK_MSG_ID_ATTITUDE:
                mavMsg = new mavlink.messages.attitude(params.time_boot_ms,
                    params.roll,
                    params.pitch,
                    params.yaw,
                    params.rollspeed,
                    params.pitchspeed,
                    params.yawspeed);
                break;
            case mavlink.MAVLINK_MSG_ID_GLOBAL_POSITION_INT:
                mavMsg = new mavlink.messages.global_position_int(params.time_boot_ms,
                    params.lat,
                    params.lon,
                    params.alt,
                    params.relative_alt,
                    params.vx,
                    params.vy,
                    params.vz,
                    params.hdg);
                break;
        }
    }
    catch( e ) {
        console.log( 'MAVLINK EX:' + e );
    }

    if (mavMsg) {
        genMsg = new Buffer(mavMsg.pack(mavlinkParser));
        //console.log('>>>>> MAVLINK OUTGOING MSG: ' + genMsg.toString('hex'));
    }

    return genMsg;
}

function sendDroneMessage(type, params, callback) {
    try {
        var msg = mavlinkGenerateMessage(type, params);
        if (msg == null) {
            console.log("mavlink message is null");
        }
        else {
            console.log('msg: ', msg);
            // console.log('msg_seq : ', msg.slice(2,3));
            //mqtt_client.publish(my_cnt_name, msg.toString('hex'));
            //_this.send_aggr_to_Mobius(my_cnt_name, msg.toString('hex'), 1500);
            mavPortData(msg);
            callback();
        }
    }
    catch( ex ) {
        console.log( '[ERROR] ' + ex );
        callback();
    }
}

var dji = {};
var params = {};

function dji_handler(data) {
    var data_arr = data.toString().split(',');

    dji.flightstatus = data_arr[0];
    dji.timestamp = data_arr[1].slice(1, data_arr[1].length);
    dji.lat = data_arr[2];
    dji.lon = data_arr[3];
    dji.alt = data_arr[4];
    dji.relative_alt = data_arr[5];
    dji.roll = data_arr[6];
    dji.pitch = data_arr[7];
    dji.yaw = data_arr[8];
    dji.vx = data_arr[9];
    dji.vy = data_arr[10];
    dji.vz = data_arr[11];
    dji.battery = data_arr[12];

    // #0 PING
    params.time_usec = dji.timestamp;
    params.seq = 0;
    params.target_system = 0;
    params.target_component = 0;
    sendDroneMessage(mavlink.MAVLINK_MSG_ID_PING, params, function () {

    });

    // #1 HEARTBEAT
    params.type = 2;
    params.autopilot = 3;
    params.base_mode = 81;
    params.system_status = 4;
    params.mavlink_version = 3;
    sendDroneMessage(mavlink.MAVLINK_MSG_ID_HEARTBEAT, params, function () {

    });

    // #2 MAVLINK_MSG_ID_GPS_RAW_INT
    params.time_usec = 0;
    params.fix_type = 3;
    params.lat = dji.lat * 1E7;
    params.lon = dji.lon * 1E7;
    params.alt = dji.alt;
    params.eph = 175;
    params.epv = 270;
    params.vel = 7;
    params.cog = 0;
    params.satellites_visible = 7;
    params.alt_ellipsoid = 0;
    params.h_acc = 0;
    params.v_acc = 0;
    params.vel_acc = 0;
    params.hdg_acc = 0;
    sendDroneMessage(mavlink.MAVLINK_MSG_ID_GPS_RAW_INT, params, function () {

    });

    // #3 MAVLINK_MSG_ID_ATTITUDE
    params.time_boot_ms = dji.timestamp;
    params.roll = dji.roll;
    params.pitch = dji.pitch;
    params.yaw = dji.yaw;
    params.rollspeed = -0.00011268721573287621;
    params.pitchspeed = 0.0000612109579378739;
    params.yawspeed = -0.00031687552109360695;
    sendDroneMessage(mavlink.MAVLINK_MSG_ID_ATTITUDE, params, function () {

    });

    // #4 MAVLINK_MSG_ID_GLOBAL_POSITION_INT
    params.time_boot_ms = dji.timestamp;
    params.lat = dji.lat * 1E7;
    params.lon = dji.lon * 1E7;
    params.alt = dji.alt;
    params.relative_alt = dji.relative_alt;
    params.vx = dji.vx;
    params.vy = dji.vy;
    params.vz = dji.vz;
    params.hdg = 0;
    sendDroneMessage(mavlink.MAVLINK_MSG_ID_GLOBAL_POSITION_INT, params, function () {
    });
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
                    send_aggr_to_Mobius(my_cnt_name, mavPacket, 1500);
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
        if(authResult == 'done') {
            if (secPort.isOpen) {
                var len = mavPacket.length/2;
                const tr_ch = new Uint8Array(5 + len);
                tr_ch[0] = 0x5a;
                tr_ch[1] = 0xa5;
                tr_ch[2] = 0xf7;
                tr_ch[3] = (len / 256);
                tr_ch[4] = (len % 256);

                for (var idx = 0; idx < len; idx++) {
                    tr_ch[5 + idx] = parseInt(mavPacket.substr(idx*2, 2), 16);
                }

                const message = new Buffer.from(tr_ch.buffer);
                secPort.write(message);
            }
        }

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
        // if(authResult == 'done') {
        //     if (secPort.isOpen) {
        //         len = parseInt(mavPacket.substr(2, 2), 16);
        //         const tr_ch = new Uint8Array(5 + len);
        //         tr_ch[0] = 0x5a;
        //         tr_ch[1] = 0xa5;
        //         tr_ch[2] = 0xf7;
        //         tr_ch[3] = (len / 256);
        //         tr_ch[4] = (len % 256);
        //
        //         for (idx = 0; idx < len; idx++) {
        //             tr_ch[5 + idx] = parseInt(mavPacket.substr((10 + idx) * 2, 2), 16);
        //         }
        //
        //         const message = new Buffer.from(tr_ch.buffer);
        //         secPort.write(message);
        //     }
        // }
    }

    else if (msgid == '00') { // #00 : HEARTBEAT
        if(authResult == 'done') {
            if (secPort.isOpen) {
                len = mavPacket.length/2;
                const tr_ch = new Uint8Array(5 + len);
                tr_ch[0] = 0x5a;
                tr_ch[1] = 0xa5;
                tr_ch[2] = 0xf9;
                tr_ch[3] = (len / 256);
                tr_ch[4] = (len % 256);

                for (idx = 0; idx < len; idx++) {
                    tr_ch[5 + idx] = parseInt(mavPacket.substr(idx*2, 2), 16);
                }

                const message = new Buffer.from(tr_ch.buffer);
                secPort.write(message);
            }
        }

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

        //console.log(mavPacket);
        hb.HEARTBEAT.type = Buffer.from(type, 'hex').readUInt8(0);
        hb.HEARTBEAT.autopilot = Buffer.from(autopilot, 'hex').readUInt8(0);
        hb.HEARTBEAT.base_mode = Buffer.from(base_mode, 'hex').readUInt8(0);
        hb.HEARTBEAT.custom_mode = Buffer.from(custom_mode, 'hex').readUInt32LE(0);
        hb.HEARTBEAT.system_status = Buffer.from(system_status, 'hex').readUInt8(0);
        hb.HEARTBEAT.mavlink_version = Buffer.from(mavlink_version, 'hex').readUInt8(0);

        if(hb.HEARTBEAT.base_mode & 0x80) {
            if(flag_base_mode == 0) {
                flag_base_mode = 1;

                // my_sortie_name = 'disarm';
                // my_cnt_name = my_parent_cnt_name + '/' + my_sortie_name;
                // sh_adn.del_resource(my_cnt_name+'?rcn=0', function () {
                //     console.log('delete container named disarm')
                // });

                //lte_mission_name = lte_parent_mission_name + '/' + my_sortie_name;
                // sh_adn.del_resource(lte_mission_name+'?rcn=0', function () {
                //     console.log('delete container named disarm')
                // });

                my_sortie_name = moment().format('YYYY_MM_DD_T_hh_mm');
                my_cnt_name = my_parent_cnt_name + '/' + my_sortie_name;
                sh_adn.crtct(my_parent_cnt_name+'?rcn=0', my_sortie_name, 0, function (rsc, res_body, count) {
                });

                lte_mission_name = lte_parent_mission_name + '/' + my_sortie_name;
                sh_adn.crtct(lte_parent_mission_name+'?rcn=0', my_sortie_name, 0, function (rsc, res_body, count) {
                });
            }
        }
        else {
            flag_base_mode = 0;
            my_sortie_name = 'disarm';
            my_cnt_name = my_parent_cnt_name + '/' + my_sortie_name;
            sh_adn.crtct(my_parent_cnt_name+'?rcn=0', my_sortie_name, 0, function (rsc, res_body, count) {
            });

            lte_mission_name = lte_parent_mission_name + '/' + my_sortie_name;
            sh_adn.crtct(lte_parent_mission_name+'?rcn=0', my_sortie_name, 0, function (rsc, res_body, count) {
            });
        }

        //console.log(hb);
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

setInterval(lteReqGetRssi, 2000);

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
                if(arrQValue[0] == '@DBG') {
                    gpi.GLOBAL_POSITION_INT.plmn = arrQValue[2];
                }
                else if(arrQValue[0] == 'Band') {
                    gpi.GLOBAL_POSITION_INT.band = parseInt(arrQValue[1]);
                }
                else if(arrQValue[0] == 'EARFCN') {
                    gpi.GLOBAL_POSITION_INT.earfcn = parseInt(arrQValue[1]);
                }
                else if(arrQValue[0] == 'Bandwidth') {
                    gpi.GLOBAL_POSITION_INT.bandwidth = parseInt(arrQValue[1].replace('MHz', ''));
                }
                else if(arrQValue[0] == 'PCI') {
                    gpi.GLOBAL_POSITION_INT.pci = parseInt(arrQValue[1]);
                }
                else if(arrQValue[0] == 'Cell-ID') {
                    gpi.GLOBAL_POSITION_INT.cell_id = arrQValue[1];
                }
                else if(arrQValue[0] == 'GUTI') {
                    gpi.GLOBAL_POSITION_INT.guti = arrQValue[1];
                }
                else if(arrQValue[0] == 'TAC') {
                    gpi.GLOBAL_POSITION_INT.tac = parseInt(arrQValue[1]);
                }
                else if(arrQValue[0] == 'RSRP') {
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

        //console.log(gpi);

        setTimeout(sendLteRssi, 0, gpi);

        strRssi = '';
    }
}

function sendLteRssi(gpi) {
    var parent = lte_mission_name+'?rcn=0';
    sh_adn.crtci(parent, 0, gpi, null, function () {

    });
}

function missionPortOpening() {
    if (missionPort == null) {
        missionPort = new SerialPort(missionPortNum, {
            baudRate: parseInt(missionBaudrate, 10),
        });

        missionPort.on('open', missionPortOpen);
        missionPort.on('close', missionPortClose);
        missionPort.on('error', missionPortError);
        missionPort.on('data', missionPortData);
    }
    else {
        if (missionPort.isOpen) {

        }
        else {
            missionPort.open();
        }
    }
}

function missionPortOpen() {
    console.log('missionPort open. ' + missionPortNum + ' Data rate: ' + missionBaudrate);
}

function missionPortClose() {
    console.log('missionPort closed.');

    missionPortOpening();
}

function missionPortError(error) {
    var error_str = error.toString();
    console.log('[missionPort error]: ' + error.message);
    if (error_str.substring(0, 14) == "Error: Opening") {

    }
    else {
        console.log('missionPort error : ' + error);
    }

    setTimeout(missionPortOpening, 2000);
}

var missionStr = '';
var missionStrArr = [];
var missionStrPacket = '';
function missionPortData(data) {
    if(my_mission_name == 'h2battery') {
        missionStr += data.toString();

        //console.log(missionStr);

        if(missionStr[missionStr.length-1] == '\n') {
            missionPacket = missionStr.substr(0, missionStr.length);
            missionStr = missionStr.substr(0, missionStr.length);

            //missionPacket.replace(/\'\u0000\n\'/g, '\n');
            missionPacket.replace(/ /g, '');
            missionPacketArr = missionPacket.split('\n');

//            console.log(missionPacketArr[1]);

            missionStrArr = missionPacketArr[1].split('\t');

//            console.log(missionStrArr);

            setTimeout(parseMission, 0, missionStrArr);
        }

        /*if(missionStr.length >= 88) {
            var missionPacket = '';
            var start = 0;
            var refLen = 0;
            var lenCount = 0;
            for (var i = 0; i < missionStr.length; i += 2) {
                var head = missionStr.substr(0, 2);
                var tail = missionStr.substr(86, 2);

                if(head == 'fe' && tail == 'ff') {
                    missionPacket = missionStr.substr(0, 88);
                    console.log('Parse Mission  - ' + missionPacket);
                    setTimeout(parseMission, 0, missionPacket);
                    missionStr = missionStr.substr(88);
                    i = -2;
                    if (missionStr.length <= 88) {
                        break;
                    }
                }
                else {
                    missionStr = missionStr.substr(i + 2);
                    i = -2;
                    if (missionStr.length <= 88) {
                        break;
                    }
                }
            }
        }*/
    }
}

var mission = {};

function parseMission(missionPacket) {
    if(my_mission_name == 'h2battery') {
        mission.H2BATTERY = {};

        var h2 = parseFloat(missionPacket[1], 10);
        var output_voltage = parseFloat(missionPacket[2], 10);
        var output_current = parseFloat(missionPacket[3], 10);
        var battery_voltage = parseFloat(missionPacket[4], 10);
        var battery_current = parseFloat(missionPacket[5], 10);
        var powerpack_temp = parseFloat(missionPacket[8], 10);
        var fuelcell1_voltage = parseFloat(missionPacket[9], 10);
        var fuelcell1_temp1 = parseFloat(missionPacket[10], 10);
        var fuelcell1_temp2 = parseFloat(missionPacket[11], 10);
        var fuelcell1_current = parseFloat(missionPacket[12], 10);
        var fuelcell2_voltage = parseFloat(missionPacket[16], 10);
        var fuelcell2_temp1 = parseFloat(missionPacket[17], 10);
        var fuelcell2_temp2 = parseFloat(missionPacket[18], 10);
        var fuelcell2_current = parseFloat(missionPacket[19], 10);

        /*
                var base_offset = 10;
                var decimal = parseInt(missionPacket.substr(base_offset, 2), 16) * 100 + parseInt(missionPacket.substr(base_offset + 2, 2), 16);
                var h2 = decimal / 10;

                base_offset = 14;
                decimal = parseInt(missionPacket.substr(base_offset, 2), 16) * 100 + parseInt(missionPacket.substr(base_offset + 2, 2), 16);
                var output_voltage = decimal / 100;

                base_offset = 18;
                decimal = parseInt(missionPacket.substr(base_offset, 2), 16) * 100 + parseInt(missionPacket.substr(base_offset + 2, 2), 16);
                var output_current = decimal / 100;

                base_offset = 22;
                decimal = parseInt(missionPacket.substr(base_offset, 2), 16) * 100 + parseInt(missionPacket.substr(base_offset + 2, 2), 16);
                var battery_voltage = decimal / 100;

                base_offset = 26;
                decimal = parseInt(missionPacket.substr(base_offset, 2), 16) * 100 + parseInt(missionPacket.substr(base_offset + 2, 2), 16);
                var battery_current = decimal / 100;

                base_offset = 34;
                decimal = parseInt(missionPacket.substr(base_offset, 2), 16) * 100 + parseInt(missionPacket.substr(base_offset + 2, 2), 16);
                var powerpack_temp = decimal / 10 - 40;

                base_offset = 38;
                decimal = parseInt(missionPacket.substr(base_offset, 2), 16) * 100 + parseInt(missionPacket.substr(base_offset + 2, 2), 16);
                var fuelcell1_voltage = decimal / 10;

                base_offset = 42;
                decimal = parseInt(missionPacket.substr(base_offset, 2), 16) * 100 + parseInt(missionPacket.substr(base_offset + 2, 2), 16);
                var fuelcell1_temp1 = decimal / 10 - 40;

                base_offset = 46;
                decimal = parseInt(missionPacket.substr(base_offset, 2), 16) * 100 + parseInt(missionPacket.substr(base_offset + 2, 2), 16);
                var fuelcell1_temp2 = decimal / 10 - 40;

                base_offset = 50;
                decimal = parseInt(missionPacket.substr(base_offset, 2), 16) * 100 + parseInt(missionPacket.substr(base_offset + 2, 2), 16);
                var fuelcell1_current = decimal / 100;

                base_offset = 62;
                decimal = parseInt(missionPacket.substr(base_offset, 2), 16) * 100 + parseInt(missionPacket.substr(base_offset + 2, 2), 16);
                var fuelcell2_voltage = decimal / 10;

                base_offset = 66;
                decimal = parseInt(missionPacket.substr(base_offset, 2), 16) * 100 + parseInt(missionPacket.substr(base_offset + 2, 2), 16);
                var fuelcell2_temp1 = decimal / 10 - 40;

                base_offset = 70;
                decimal = parseInt(missionPacket.substr(base_offset, 2), 16) * 100 + parseInt(missionPacket.substr(base_offset + 2, 2), 16);
                var fuelcell2_temp2 = decimal / 10 - 40;

                base_offset = 74;
                decimal = parseInt(missionPacket.substr(base_offset, 2), 16) * 100 + parseInt(missionPacket.substr(base_offset + 2, 2), 16);
                var fuelcell2_current = decimal / 100;
        */
        //console.log(mavPacket);
        mission.H2BATTERY.h2 = h2;
        mission.H2BATTERY.output_voltage = output_voltage;
        mission.H2BATTERY.output_current = output_current;
        mission.H2BATTERY.battery_voltage = battery_voltage;
        mission.H2BATTERY.battery_current = battery_current;
        mission.H2BATTERY.powerpack_temp = powerpack_temp;

        mission.H2BATTERY.fuelcell1_voltage = fuelcell1_voltage;
        mission.H2BATTERY.fuelcell1_temp1 = fuelcell1_temp1;
        mission.H2BATTERY.fuelcell1_temp2 = fuelcell1_temp2;
        mission.H2BATTERY.fuelcell1_current = fuelcell1_current;

        mission.H2BATTERY.fuelcell2_voltage = fuelcell2_voltage;
        mission.H2BATTERY.fuelcell2_temp1 = fuelcell2_temp1;
        mission.H2BATTERY.fuelcell2_temp2 = fuelcell2_temp2;
        mission.H2BATTERY.fuelcell2_current = fuelcell2_current;

        send_aggr_to_Mobius(my_mission_parent + '/' + my_mission_name, mission, 1000);
    }
}
