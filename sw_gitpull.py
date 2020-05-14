# -*- coding: utf-8 -*-

import RPi.GPIO as GPIO
import time
import os

# configure both button and buzzer pins
button_pin = 6

# set board mode to GPIO.BOARD
GPIO.setmode(GPIO.BCM)

# setup button pin asBu input and buzzer pin as output
GPIO.setup(button_pin, GPIO.IN, pull_up_down=GPIO.PUD_UP)

try:
    flag = 0
    while True:
        # check if button pressed
        if(GPIO.input(button_pin) == 1 and flag == 0):
            # start git pull
            flag = 1
            os.system("./gitpull.sh")
        else:
            flag = 0

except KeyboardInterrupt:
    GPIO.cleanup()