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
b1v = MCP3008(1)
b2v = MCP3008(2)
vol = MCP3008(3)
b1c = MCP3008(5)
b2c = MCP3008(6)
bt0 = MCP3008(7)
pot0 = PWMLED(14)

coeffV0 = float(os.getenv("COEFF_V0"))
coeffV1 = float(os.getenv("COEFF_V1"))
coeffV2 = float(os.getenv("COEFF_V2"))
offsetA1 = float(os.getenv("OFFSET_A1"))
offsetA2 = float(os.getenv("OFFSET_A2"))
coeffA1 = float(os.getenv("COEFF_A1"))
coeffA2 = float(os.getenv("COEFF_A2"))

def gpio(sc, start_time):
    pot0.value = 0.1

    interval = int(10 + round(round(vol.value, 2) * 100 / 2, 0)) # da 10 a 60 sec in base a potenziometro
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
    for lp in range(snapshots):
        vn0 = vn0 + bmv.value
        vn1 = vn1 + b1v.value
        vn2 = vn2 + b2v.value
        an1 = an1 + b1c.value
        an2 = an2 + b2c.value
        tn0 = tn0 + bt0.value
        time.sleep(0.1)
    v0 = vn0 / snapshots * coeffV0
    v1 = vn1 / snapshots * coeffV1
    v2 = vn2 / snapshots * coeffV2
    t0 = (tn0 / snapshots)
    a1 = ((an1 / snapshots) - 0.5) * coeffA1 + offsetA1
    if a1 >= (coeffA1 * 0.44) or a1 <= -(coeffA1 * 0.44):
      a1 = 0
    a2 = ((an2 / snapshots) - 0.5) * coeffA2 + offsetA2
    if a2 >= (coeffA2 * 0.44) or a2 <= -(coeffA2 * 0.44):
      a2 = 0

    # Voltage Divider
    Vin = 3.3
    Ro = 10000  # 10k Resistor

    # Steinhart Constants
    A = 0.001129148
    B = 0.000234125
    C = 0.0000000876741
    
    Vout = 3.3 * t0
    
    # Calculate Resistance
    Rt = (Vout * Ro) / (Vin - Vout) 
    # Rt = 10000000  # Used for Testing. Setting Rt=10k should give TempC=25
    
    # Steinhart - Hart Equation
    if t0 > 0 or t0 < 1:
      t0K = 1 / (A + (B * math.log(Rt)) + C * math.pow(math.log(Rt), 3))
    else:
      t0K = 273.15

    # Convert from Kelvin to Celsius
    t0C = t0K - 273.15

    print("Collected data of " + str(snapshots) + " snapshots")
    
    mydb = mysql.connector.connect(
      host = os.getenv("DB_HOST"),
      user = os.getenv("DB_USER"),
      password = os.getenv("DB_PASSWORD"),
      database = os.getenv("DB_DATABASE"),
      time_zone = os.getenv("DB_TIMEZONE")
    )

    mycursor = mydb.cursor()

    sql = "INSERT INTO `battery-snaps` (bm_voltage, b1_voltage, b2_voltage, b1_current, b2_current, coeff, temperature) VALUES (%s, %s, %s, %s, %s, %s, %s)"
    values = (v0, v1, v2, a1, a2, interval / 60 / 60, t0C)
    mycursor.execute(sql, values)

    mydb.commit()
    
    pot0.value = 0

scheduler = sched.scheduler(time.time, time.sleep)

start_time = time.time()

scheduler.enterabs(start_time, 1, gpio, (scheduler, time.time()))

scheduler.run()