#!/bin/sh

sudo chmod 777 /home/pi/nCube-sparrow-dji/
cd /home/pi/nCube-sparrow-dji
#git reset --hard HEAD
#git pull
#sleep 3
sudo chmod 777 *
sleep 2
#python3 sw_gitpull.py&
pm2 start thyme.js
pm2 start thyme_tas_dji.js
