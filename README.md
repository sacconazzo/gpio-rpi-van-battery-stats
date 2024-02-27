# GPIO RPI4 manager for van battery stats

## Prerequisites

### Hardware:

- rpi4
- breadboard and connectors
- analog voltage sensor (it is possible to build it yourself by creating a voltage divider with some resistors)
- analog current sensor (ACS758)
- analog potentiometer
- adc converter (MCP3008)
- some leds and resistors (optional)
- some physical buttons (optional)

### Software

- Pi OS
- MySQL server installed (I haven't created the migration script yet, but the table is only one and simple)
- Python3
- NodeJS 12 or later
- A Web Server where to post the stats data (in this case `api.giona.tech`, you could comment this part if you want to work locally by directly querying the db)

## Installation

### Hardware

long to explain... I will

<img src="res/breadboard.jpg" alt="BreadBoard conncetions" width="45%"/> <img src="res/rpi4.jpg" alt="RPI4 conncetions" width="45%"/>

### Software

- enable serial port interface via `sudo rspi-config`
- install this repo in your rpi home (including Python dependencies manually)
- create database and table `battery-snaps`
- configure `.env` file like `.env.example`
- configure a startup script in your RPI (example in `/etc/rc.local`) adding:

```
cd /{your-home}/gpio-rpi-van-battery-stats
sleep 30
sudo yarn collect &
sudo yarn manager &
```

### Output generated example

```
{
    "dayWeek": [
        {
            "day": "2024-02-24",
            "bmV": 13.3,
            "b1V": 13.3,
            "b2V": 13.3,
            "b1Ah": 0.01,
            "b2Ah": 0.01
        },
        {
            "day": "2024-02-25",
            "bmV": 13.35,
            "b1V": 13.35,
            "b2V": 13.34,
            "b1Ah": 0.04,
            "b2Ah": 0.03
        }
    ],
    "realtime": [
        {
            "timestamp": "2024-02-25 12:33:35",
            "bmV": 13.29,
            "b1V": 13.31,
            "b2V": 13.29,
            "b1A": 0,
            "b2A": 0
        },
        {
            "timestamp": "2024-02-25 12:32:35",
            "bmV": 13.27,
            "b1V": 13.26,
            "b2V": 13.26,
            "b1A": 0,
            "b2A": 0
        },
        ...
    ]
}
```

https://api.giona.tech/domotica/battery

https://giona.tech
