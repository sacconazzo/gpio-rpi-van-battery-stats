#!/bin/bash

git checkout .
git pull

sudo pip3 install -r requirements.txt --break-system-packages
yarn install

sudo pkill python3
sudo pkill node

sudo yarn collect &
sudo yarn manager &