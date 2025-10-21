import machine
import dht
import time
import json

sensor = dht.DHT22(machine.Pin(15))
pir = machine.Pin(14, machine.Pin.IN)

temp_history = []
hum_history = []
history_size = 5

motion_count = 0
last_motion_state = 0

def read_sensor():
    try:
        sensor.measure()
        temp = sensor.temperature()
        hum = sensor.humidity()
        
        temp_history.append(temp)
        hum_history.append(hum)
        
        if len(temp_history) > history_size:
            temp_history.pop(0)
        if len(hum_history) > history_size:
            hum_history.pop(0)
        
        avg_temp = sum(temp_history) / len(temp_history)
        avg_hum = sum(hum_history) / len(hum_history)
        
        return avg_temp, avg_hum
    except Exception as e:
        print(f"Error: {e}")
        return None, None

def read_pir():
    global motion_count, last_motion_state
    current_state = pir.value()
    
    if current_state == 1 and last_motion_state == 0:
        motion_count += 1
    
    last_motion_state = current_state
    return current_state

def send_data(temp, hum, motion_detected, count):
    if temp is not None and hum is not None:
        data = {
            "temperature": round(temp, 2),
            "humidity": round(hum, 2),
            "motion": motion_detected,
            "count": count,
            "timestamp": time.time()
        }
        print(json.dumps(data), flush=True)

print("Ecosystem of Resonance - Sensores Iniciados")
print("--------------------------------------------")
print("PIR en D14 | DHT22 en D15")
print("--------------------------------------------")

while True:
    temp, hum = read_sensor()
    motion = read_pir()
    send_data(temp, hum, motion, motion_count)
    time.sleep(0.5)
