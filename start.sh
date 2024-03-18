#!/bin/bash

cd /home/pi/gpio-rpi-van-battery-stats

COLLECT=$(pgrep -f collect.py)
if [ -z "$COLLECT" ]; then
    yarn collect &
fi

MANAGER=$(pgrep -f manager.js)
if [ -z "$MANAGER" ]; then
    yarn manager &
fi