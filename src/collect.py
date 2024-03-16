from gpiozero import MCP3008, PWMLED
from dotenv import load_dotenv
import os

import sched
import time
import math
import mysql.connector
import logging

load_dotenv()

bmv = MCP3008(0)
b2v = MCP3008(1)
b1v = MCP3008(2)
vol = MCP3008(3)
lu0 = MCP3008(4)
b1c = MCP3008(5)
b2c = MCP3008(6)
bt0 = MCP3008(7)

pot0 = PWMLED(14)

def gpio(sc, start_time):
    pot0.value = 0.1

    mydb = mysql.connector.connect(
      host = os.getenv("DB_HOST"),
      user = os.getenv("DB_USER"),
      password = os.getenv("DB_PASSWORD"),
      database = os.getenv("DB_DATABASE"),
      time_zone = os.getenv("DB_TIMEZONE")
    )
    mycursor = mydb.cursor()

    mycursor.execute("SELECT `key`, `value` FROM settings")
    rows = mycursor.fetchall()

    settings = {}
    for row in rows:
        key = row[0]  
        value = row[1] 
        settings[key] = value

    vref = float(settings.get("VREF", os.getenv("VREF"))) # VCC
    offsetV0 = float(settings.get("OFFSET_V0", os.getenv("OFFSET_V0"))) # offset adj.
    offsetV1 = float(settings.get("OFFSET_V1", os.getenv("OFFSET_V1"))) # offset adj.
    offsetV2 = float(settings.get("OFFSET_V2", os.getenv("OFFSET_V2"))) # offset adj.
    coeffV0 = float(settings.get("COEFF_V0", os.getenv("COEFF_V0"))) # (R1 + R2) / R2
    coeffV1 = float(settings.get("COEFF_V1", os.getenv("COEFF_V1"))) # (R1 + R2) / R2
    coeffV2 = float(settings.get("COEFF_V2", os.getenv("COEFF_V2"))) # (R1 + R2) / R2
    offsetA1 = float(settings.get("OFFSET_A1", os.getenv("OFFSET_A1"))) # basically -0.5 + offset adj. at 20°C
    offsetA2 = float(settings.get("OFFSET_A2", os.getenv("OFFSET_A2"))) # basically -0.5 + offset adj. at 20°C
    sensitA1 = float(settings.get("COEFF_A1", os.getenv("COEFF_A1"))) # mV/A -> sensitivity at 20°C
    sensitA2 = float(settings.get("COEFF_A2", os.getenv("COEFF_A2"))) # mV/A -> sensitivity at 20°C
    driftA1 = float(settings.get("DRIFT_A1", os.getenv("DRIFT_A1"))) # temp. drift per degree ref. to offset
    driftA2 = float(settings.get("DRIFT_A2", os.getenv("DRIFT_A2"))) # temp. drift per degree ref. to offset

    interval = int(10 + round(round(vol.value, 2) * 100 / 2, 0)) # from 10 to 60 sec potentiometer source
    snapshots = int(round(interval * 10 * 0.8, 0))

    print("Start reading sensors at " + str(start_time) + "... (next in " + str(interval) + " seconds)")
    
    next_time = start_time + interval
    sc.enterabs(next_time, 1, gpio, (sc, next_time))
    
    vn0 = 0
    vn1 = 0
    vn2 = 0
    an1 = 0
    an2 = 0
    tn0 = 0
    ln0 = 0
    for lp in range(snapshots):
        vn0 = vn0 + bmv.value
        vn1 = vn1 + b1v.value
        vn2 = vn2 + b2v.value
        an1 = an1 + b1c.value
        an2 = an2 + b2c.value
        tn0 = tn0 + bt0.value
        ln0 = ln0 + lu0.value
        time.sleep(0.1)

    sql = "INSERT INTO `adc-snaps` (ch0, ch1, ch2, ch3, ch4, ch5, ch6, ch7) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)"
    values = (vn0 / snapshots, vn2 / snapshots, vn1 / snapshots, vol.value, ln0 / snapshots, an1 / snapshots, an2 / snapshots, tn0 / snapshots)
    mycursor.execute(sql, values)
    mydb.commit()

    # Temperature
    t0 = tn0 / snapshots

    # Voltage Divider
    Vin = vref
    Ro = 10000  # 10k Resistor

    # Steinhart Constants
    A = 0.001129148
    B = 0.000234125
    C = 0.0000000876741
    
    Vout = vref * t0
    
    # Calculate Resistance
    Rt = (Vout * Ro) / (Vin - Vout) 
    # Rt = 10000  # Used for Testing. Setting Rt=10k should give TempC=25
    
    # Steinhart - Hart Equation
    if t0 > 0 or t0 < 1:
      t0K = 1 / (A + (B * math.log(Rt)) + C * math.pow(math.log(Rt), 3))
    else:
      t0K = 273.15

    # Convert from Kelvin to Celsius
    t0C = t0K - 273.15

    # Voltage
    v0 = ((vn0 / snapshots) + offsetV0) * vref * coeffV0
    if v0 < 0:
      v0 = 0

    v1 = ((vn1 / snapshots) + offsetV1) * vref * coeffV1
    if v1 < 0:
      v1 = 0

    v2 = ((vn2 / snapshots) + offsetV2) * vref * coeffV2
    if v2 < 0:
      v2 = 0

#   Current
    offsetA1 = offsetA1 - ((20 - t0C) * driftA1) # temp. drift

    coeffA1 = sensitA1 / offsetA1 * -0.5 # adj. sensit with offset
    a1 = ((an1 / snapshots) + offsetA1) * vref * coeffA1
    if (an1 / snapshots) < 0.05:
      a1 = 0

    offsetA2 = offsetA2 - ((20 - t0C) * driftA2) # temp. drift

    coeffA2 = sensitA2 / offsetA2 * -0.5 # adj. sensit with offset
    a2 = ((an2 / snapshots) + offsetA2) * vref * coeffA2
    if (an2 / snapshots) < 0.05:
      a2 = 0

    print("Collected data of " + str(snapshots) + " snapshots")

    sql = "INSERT INTO `battery-snaps` (bm_voltage, b1_voltage, b2_voltage, b1_current, b2_current, coeff, temperature) VALUES (%s, %s, %s, %s, %s, %s, %s)"
    values = (v0, v1, v2, a1, a2, interval / 60 / 60, t0C)
    mycursor.execute(sql, values)
    mydb.commit()

    mycursor.close()
    mydb.close()
    
    pot0.value = 0

scheduler = sched.scheduler(time.time, time.sleep)

start_time = time.time()

scheduler.enterabs(start_time, 1, gpio, (scheduler, time.time()))

scheduler.run()
