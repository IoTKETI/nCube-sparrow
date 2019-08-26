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
        if(t_count >= 3000) {
            sh_state = 'exit';
            console.log(sh_state);
        }
    }
}

var _server = null;
exports.ready = function tas_ready () {
    if(_server == null) {
        _server = net.createServer(function (socket) {
            console.log('socket connected');
            socket.id = Math.random() * 1000;
            tas_buffer[socket.id] = '';
            socket.on('data', tas_handler);
            socket.on('end', function() {
                console.log('end');
            });
            socket.on('close', function() {
                console.log('close');
            });
            socket.on('error', function(e) {
                console.log('error ', e);
            });
        });

        _server.listen(conf.ae.tas_sec_port, function() {
            console.log('TCP Server (' + ip.address() + ') for TAS is listening on port ' + conf.ae.tas_mav_port);
        });
    }
};

function tas_handler (data) {
    socket_sec = this;
    mqtt_client.publish(my_cnt_name, data);
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


exports.send_tweet = function(cinObj) {
    var fs = require('fs');
    var Twitter = require('twitter');

    var twitter_client = new Twitter({
        consumer_key: 'tV4cipDkQcMzZh8RAWsEToDP2',
        consumer_secret: '1rAIO5DCuFnRkYVefjst2ULVStBl6Dfucs2AVBjo1pcSx8jROT',
        access_token_key: '4157451558-lo0rgStwJ3ewEi47TpmrWnoDBPIRB3hcHeNggEk',
        access_token_secret: 'KlmoKMSvcWPuX1mcmuOd1SIvh8DyLXQD9ja3NeMoVCzdl'
    });

    var params = {screen_name: 'gbsmfather'};
    twitter_client.get('statuses/user_timeline', params, function(error, tweets, response){
        if (!error) {
            console.log(tweets[0].text);
        }
    });

    var cur_d = new Date();
    var cur_o = cur_d.getTimezoneOffset() / (-60);
    cur_d.setHours(cur_d.getHours() + cur_o);
    var cur_time = cur_d.toISOString().replace(/\..+/, '');

    var con_arr = (cinObj.con != null ? cinObj.con : cinObj.content).split(',');

    if (con_arr[con_arr.length-1] != null) {
        var bitmap = new Buffer(con_arr[con_arr.length-1], 'base64');
        fs.writeFileSync('decode.jpg', bitmap);

        twitter_client.post('media/upload', {media: bitmap}, function (error, media, response) {
            if (error) {
                console.log(error[0].message);
                return;
            }
            // If successful, a media object will be returned.
            console.log(media);

            // Lets tweet it
            var status = {
                status: '[' + cur_time + '] Give me water ! - ',
                media_ids: media.media_id_string // Pass the media id string
            };

            twitter_client.post('statuses/update', status, function (error, tweet, response) {
                if (!error) {
                    console.log(tweet.text);
                }
            });
        });
    }
};

exports.noti = function(path_arr, cinObj, socket) {
    var cin = {};
    cin.ctname = path_arr[path_arr.length-2];
    cin.con = (cinObj.con != null) ? cinObj.con : cinObj.content;

    if(cin.con == '') {
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
