#!/bin/sh

echo "Start Git Pull"
git stash
git pull
sleep 5
git stash pop
echo "Start nCube-sparrow"
pm2 restart 0
