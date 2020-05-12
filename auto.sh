#!/usr/bin/sh

sudo chmod 777 /home/pi/nCube-sparrow/
cd /home/pi/nCube-sparrow
sudo chmod 777 *
pm2 start thyme.js
