# nCube-sparrow
Start Guide

1. Install dependencies

최신 node.js 버전을 다운받기 위해 아래와 같이 입력합니다.
curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash -

다음, node.js 패키지를 apt-get을 이용해 설치합니다.
sudo apt-get install -y nodejs

설치가 완료되면 아래와 같이 입력하여 설치된 node.js의 버전을 확인합니다.
node -v

$ sudo npm install -g pm2

$ git clone https://github.com/IoTKETI/nCube-sparrow

$ cd /home/pi/nCube-sparrow  

$ npm install

2. Autorun at boot

$ sudo nano /etc/xdg/lxsession/LXDE-pi/autostart

- Add executable code to last line

$ sh /home/pi/DJI-sparrow/auto.sh > /home/pi/DJI-sparrow/auto.sh.log 2>&1
