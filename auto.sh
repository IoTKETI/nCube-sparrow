#!/usr/bin/sh

sudo chmod 777 /home/pi/nCube-sparrow/
cd /home/pi/nCube-sparrow
sudo chmod 777 *
git stash
git pull
sleep 5
git stash pop
pm2 start thyme.js
