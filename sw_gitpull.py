# -*- coding: utf-8 -*-

import RPi.GPIO as GPIO
import time
import os

# configure both button and buzzer pins
button_pin = 6
led_pin = 7

# set board mode to GPIO.BOARD
GPIO.setmode(GPIO.BCM)

# setup button pin asBu input and buzzer pin as output
GPIO.setup(button_pin, GPIO.IN, pull_up_down=GPIO.PUD_UP)
GPIO.setup(led_pin, GPIO.IN, pull_up_down=GPIO.PUD_UP)

try:
    flag = 0
    git_flag = 0
    count = 0
    r_count = 0
    while True:
        button_val = GPIO.input(button_pin)
        print('button_val: ', button_val)
        
        if(button_val == 0):
            if r_count > 350000:
                flag = 1           
                print("Ready")
            r_count += 1
        elif (button_val == 1 and flag == 1):
            count += 1
            if count > 100:
                print("Start git pull")
                # start git pull
                os.system("./gitpull.sh")
                flag = 0
            
        elif (button_val == 1):
            flag = 0
            print("pass")
            pass
            
    
except KeyboardInterrupt:
    GPIO.cleanup()
