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

var mqtt = require('mqtt');

var topic_sec_auth_start = '/MUV/req/nCube/me/auth_start';
var topic_sec_req_auth = '/MUV/req/nCube/me/req_auth';

var topic_auth_start = '/nCube/Control/Auth/start';
var topic_req_auth = '/nCube/Control/Auth/req_auth';
var topic_res_auth = '/nCube/Data/Auth/res_auth';
var topic_req_enc = '/nCube/Control/Enc/req_enc';
var topic_res_enc = '/nCube/Data/Enc/res_enc';
var topic_req_sig = '/nCube/Control/Sig/req_sig';
var topic_res_sig = '/nCube/Data/Sig/res_sig';

var sec_mqtt_client = null;

var sec_conf = {};
sec_conf.brokerip = 'localhost';
sec_conf.mqttport = '1883';

if(sec_mqtt_client == null) {
    var connectOptions = {
        host: sec_conf.brokerip,
        port: sec_conf.cse.mqttport,
//      username: 'keti',
//      password: 'keti123',
        protocol: "mqtt",
        keepalive: 10,
//      clientId: serverUID,
        protocolId: "MQTT",
        protocolVersion: 4,
        clean: true,
        reconnectPeriod: 2000,
        connectTimeout: 2000,
        rejectUnauthorized: false
    };

    sec_mqtt_client = mqtt.connect(connectOptions);

    sec_mqtt_client.on('connect', function () {
        sec_mqtt_client.subscribe(topic_res_auth);
        console.log('[mqtt_connect] topic_res_auth : ' + topic_res_auth);

        sec_mqtt_client.subscribe(topic_res_enc);
        console.log('[mqtt_connect] topic_res_enc : ' + topic_res_enc);

        sec_mqtt_client.subscribe(topic_res_sig);
        console.log('[mqtt_connect] topic_res_sig : ' + topic_res_sig);
    });

    sec_mqtt_client.on('message', function (topic, message) {
        if(topic == topic_res_auth) {
            sec_res_auth_handler(message);
        }
        else if(topic == topic_res_enc) {
            sec_res_enc_handler(message);
        }
        else if(topic == topic_res_sig) {
            sec_res_sig_handler(message);
        }
        else {
        }
    });

    sec_mqtt_client.on('error', function (err) {
        console.log(err.message);
    });
}

var t_count = 0;

global.secPort = null;

var secPortNum = '/dev/ttyUSB3';
var secBaudrate = 115200;

exports.ready = function tas_ready() {
    if(my_secure === 'on') {
        secPortNum = '/dev/ttyUSB3';
        secBaudrate = 115200;

        secPortOpening();
    }
};

function send_to_Mobius(topic, content_each, gap) {
    setTimeout(function (topic, content_each) {
        sh_adn.crtci(topic+'?rcn=0', 0, content_each, null, function () {

        });
    }, gap, topic, content_each);
}


var SerialPort = require('serialport');

function secPortOpening() {
    if (secPort == null) {
        secPort = new SerialPort(secPortNum, {
            baudRate: parseInt(secBaudrate, 10),
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
    console.log('secPort open. ' + secPortNum + ' Data rate: ' + secBaudrate);

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

function secPortData(data) {
    secStr += data.toString('hex');
    //console.log(secStr);

    var secPacket = '';
    var start  = 0;
    var refLen = 0;
    var lenCount = 0;
    for (var i = 0; i < secStr.length; i += 2) {
        var str = secStr.substr(i, 2);
        //console.log(str + ' - ' + secPacket);
        if(start == 0) {
            if (str == '5a') {
                start = 1;
                secPacket += str;
            }
            else {
                secStr = secStr.substr(i+2);
                i = -2;
                start = 0;
                secPacket = '';
            }
        }
        else if (start == 1) {
            if (str == 'a5') {
                start = 2;
                secPacket += str;
            }
            else {
                start = 0;
                secPacket = '';
            }
        }
        else if (start == 2) {
            start = 3;
            secPacket += str;
        }
        else if(start == 3) {
            start = 4;
            secPacket += str;

            refLen = parseInt(str, 16) * 256;
        }
        else if(start == 4) {
            start = 5;
            secPacket += str;

            refLen = refLen + parseInt(str, 16);
            console.log(refLen);
            lenCount = 0;
        }
        else if(start == 5) {
            secPacket += str;
            lenCount++;
            if(refLen <= lenCount) {
                console.log('Req_auth - ' + secPacket);
                send_to_Mobius(Req_auth, secPacket, 0);
                secStr = secStr.substr(i+2);
                i = -2;
                start = 0;
            }
        }
    }
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
