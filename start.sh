#!/bin/bash

git checkout .
git pull

pip install -r requirements.txt
yarn install

sudo pkill python3
sudo pkill node

sudo yarn collect &
sudo yarn manager &