# GPIO RPI4 manager for van battery stats

## Prerequisites

### Hardware:

- rpi4
- analog voltage sensor (it is possible to build it yourself by creating a voltage divider with some resistors)
- analog current sensor
- analog potentiometer
- adc converter (MCP3008)
- some leds (optional)
- some physical buttons (optional)

### Software

- Pi OS
- mysql server installed (I haven't created the migration script yet, but the table is only one and simple)
- python3
- nodejs 12 or later
- web server where to post the stats data (in this case api.giona.tech, you could comment this part if you want to work locally by directly querying the db)

## Installation

### Hardware

long to explain... I will

![breadboard connections](res/breadboard.jpg)

![rpi4 connections](res/rpi4.jpg)

### Software

- enable serial port interface via `sudo rspi-config`
- install this repo in your rpi home (including Python dependencies manually)
- create database and table `battery-snaps`
- configure .env file like .env.example
- configure your startup script in rp (example in /etc/rc.local) adding:

```
cd /{your-home}/gpio-rpi-van-battery-stats
sleep 30
sudo yarn collect &
sudo yarn manager &
```
