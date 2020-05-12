#!/usr/bin/sh

echo "Stop nCube-sparrow"
pm2 stop 0
echo "Start Git Pull"
git stash
git pull
sleep 5
git stash pop
echo "Start nCube-sparrow"
pm2 start 0
