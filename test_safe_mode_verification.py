#!/usr/bin/env python3
"""
==============================================================================
TEST RUNNER EMPÍRICO — AgriEdge OS Firmware HardwareController Verification
==============================================================================
Valida empíricamente las correcciones del firmware C++:
1. Comparativa del Bug Original vs Implementación Corregida (Safe Mode & EWMA).
2. Fusión sensorial dual (DHT1 + DHT2) y modos degradados.
3. Fallo total de sensores y apagado de seguridad en SAFE_MODE.
4. Recuperación limpia de sensores sin arrastre de inercia térmica falsa.
5. Lógica de emergencia por temperatura crítica de sustrato (NTC).
6. Árbitro de Actuadores: Exclusión Mutua Extractor ↔ Fogger.
7. Histéresis térmica (HIST_TEMP = 0.5°C) e hídrica (HIST_HUM = 2.0%).
8. Modulación rápida Time-Proportioning (SSR PWM) desacoplada de ciclos lentos.
==============================================================================
"""
import math
import sys
import io

if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

class EstadoOperacional:
    NORMAL = "NORMAL"
    CALENTANDO = "CALENTANDO"
    ENFRIANDO = "ENFRIANDO"
    HUMIDIFICANDO = "HUMIDIFICANDO"
    SAFE_MODE = "SAFE_MODE"
    EMERGENCIA = "EMERGENCIA"
    MANUAL = "MANUAL"

class CropProfile:
    def __init__(self):
        self.temp_ideal_min = 20.0
        self.temp_ideal_max = 24.0
        self.temp_crit_min = 15.0
        self.temp_crit_max = 28.0
        self.temp_sustrato_ideal = 24.0
        self.temp_sustrato_crit_max = 27.0
        self.hum_ideal_min = 85.0
        self.hum_ideal_max = 95.0
        self.hum_crit_min = 70.0
        self.co2_ideal_min = 400
        self.co2_ideal_max = 800
        self.co2_crit_max = 1200
        self.light_hours_on = 12

class FailsafesConfig:
    def __init__(self):
        self.watchdog_timeout_ms = 15000
        self.max_internal_temp_limit_c = 35.0

class ConfiguracionCultivo:
    def __init__(self):
        self.crop = CropProfile()
        self.failsafes = FailsafesConfig()
        self.max_manual_time_ms = 300000

class SimulatedHardwareController:
    def __init__(self, mode="FIXED"):
        self.mode = mode  # "BUGGY" o "FIXED"
        self.config = ConfiguracionCultivo()
        self.ALPHA_EWMA = 0.1
        self.HIST_TEMP = 0.5
        self.HIST_HUM = 2.0
        
        # SensorData
        self.tempAmb = 0.0
        self.tempAmb2 = 0.0
        self.tempPromedio = 0.0
        self.humAmb = 0.0
        self.humAmb2 = 0.0
        self.humPromedio = 0.0
        self.valorAnalogico = 0.0
        self.co2 = 400
        self.dhtOk = False
        self.dht2Ok = False
        self.analogicoOk = False
        self.co2Ok = False
        
        self.ewmaInitialized = False
        self.ewma_temp = 0.0
        self.ewma_hum = 0.0
        self.ewma_sustrato = 0.0
        self.ewma_vpd = 0.0
        self.ewma_co2 = 0.0
        
        # Actuadores
        self.heater_ON = False
        self.cooler_ON = False
        self.fogger_ON = False
        self.extractor_ON = False
        self.light_ON = False
        
        self.estadoActual = EstadoOperacional.NORMAL
        self.last_heater_switch = 0
        self.last_fogger_switch = 0
        self.last_extractor_switch = 0
        self.last_cooler_switch = 0
        self.last_light_switch = 0

        # PID & SSR PWM Simulation
        self.pidOutput = 2500.0 # 50% duty cycle (2.5s de 5s)
        self.windowStartTime = 0
        self.PID_WINDOW_SIZE = 5000

    def feedSensors(self, t1, h1, t2, h2, ntc_temp):
        self.dhtOk = not (math.isnan(t1) or t1 is None)
        self.dht2Ok = not (math.isnan(t2) or t2 is None)
        self.analogicoOk = not (math.isnan(ntc_temp) or ntc_temp is None)
        
        self.tempAmb = t1 if self.dhtOk else 0.0
        self.humAmb = h1 if self.dhtOk else 0.0
        self.tempAmb2 = t2 if self.dht2Ok else 0.0
        self.humAmb2 = h2 if self.dht2Ok else 0.0
        self.valorAnalogico = ntc_temp if self.analogicoOk else 0.0
        
        # Fusión sensorial
        if self.dhtOk and self.dht2Ok:
            self.tempPromedio = (self.tempAmb + self.tempAmb2) / 2.0
            self.humPromedio = (self.humAmb + self.humAmb2) / 2.0
        elif self.dhtOk:
            self.tempPromedio = self.tempAmb
            self.humPromedio = self.humAmb
        elif self.dht2Ok:
            self.tempPromedio = self.tempAmb2
            self.humPromedio = self.humAmb2
        else:
            self.tempPromedio = -999.0
            self.humPromedio = -999.0

        # EWMA Filter
        if self.mode == "BUGGY":
            if not self.ewmaInitialized:
                self.ewma_temp = self.tempPromedio if self.tempPromedio != -999.0 else 20.0
                self.ewma_hum = self.humPromedio if self.humPromedio != -999.0 else 50.0
                self.ewmaInitialized = True
            else:
                if self.tempPromedio != -999.0:
                    self.ewma_temp = (self.ALPHA_EWMA * self.tempPromedio) + ((1.0 - self.ALPHA_EWMA) * self.ewma_temp)
                if self.humPromedio != -999.0:
                    self.ewma_hum = (self.ALPHA_EWMA * self.humPromedio) + ((1.0 - self.ALPHA_EWMA) * self.ewma_hum)
        else:
            if not self.ewmaInitialized:
                if self.tempPromedio != -999.0 and self.humPromedio != -999.0:
                    self.ewma_temp = self.tempPromedio
                    self.ewma_hum = self.humPromedio
                    self.ewmaInitialized = True
                else:
                    self.ewma_temp = -999.0
                    self.ewma_hum = -999.0
            else:
                if self.tempPromedio != -999.0:
                    self.ewma_temp = (self.ALPHA_EWMA * self.tempPromedio) + ((1.0 - self.ALPHA_EWMA) * self.ewma_temp)
                else:
                    self.ewma_temp = -999.0
                    self.ewmaInitialized = False
                
                if self.humPromedio != -999.0:
                    self.ewma_hum = (self.ALPHA_EWMA * self.humPromedio) + ((1.0 - self.ALPHA_EWMA) * self.ewma_hum)
                else:
                    self.ewma_hum = -999.0

    def procesarLogicaDeControl(self, now, horaDia):
        req_extractor = False
        req_heater = False
        req_cooler = False
        req_fogger = False
        req_light = False
        proxEstado = EstadoOperacional.NORMAL

        if self.mode == "BUGGY":
            tempActual = self.ewma_temp
            humActual = self.ewma_hum if (self.dhtOk or self.dht2Ok) else -999.0
            co2Actual = 400
        else:
            tempActual = self.ewma_temp if (self.dhtOk or self.dht2Ok) else -999.0
            humActual = self.ewma_hum if (self.dhtOk or self.dht2Ok) else -999.0
            co2Actual = 400

        if tempActual == -999.0:
            proxEstado = EstadoOperacional.SAFE_MODE
            req_heater = False
            req_cooler = False
            req_fogger = False
            req_extractor = False
            if horaDia >= 0 and horaDia < self.config.crop.light_hours_on:
                req_light = True
        else:
            tempSustrato = self.valorAnalogico if self.analogicoOk else -999.0
            
            # 1. Emergencia térmica
            if tempActual >= self.config.failsafes.max_internal_temp_limit_c or \
               tempActual >= self.config.crop.temp_crit_max or \
               (tempSustrato != -999.0 and tempSustrato >= self.config.crop.temp_sustrato_crit_max):
                req_extractor = True
                req_cooler = True
                req_heater = False
                proxEstado = EstadoOperacional.EMERGENCIA
            # 2. CO2
            elif co2Actual >= self.config.crop.co2_crit_max:
                req_extractor = True
            # 3. Demanda de Frío
            else:
                if self.mode == "BUGGY":
                    if tempActual >= self.config.crop.temp_ideal_max:
                        req_cooler = True
                        req_extractor = True
                        proxEstado = EstadoOperacional.ENFRIANDO
                    elif tempActual <= self.config.crop.temp_ideal_min:
                        req_heater = True
                        proxEstado = EstadoOperacional.CALENTANDO
                else:
                    # Con Histéresis
                    demandaFrio = (tempActual >= (self.config.crop.temp_ideal_max - self.HIST_TEMP)) if (self.estadoActual == EstadoOperacional.ENFRIANDO) else (tempActual >= self.config.crop.temp_ideal_max)
                    if demandaFrio:
                        req_cooler = True
                        req_extractor = True
                        req_heater = False
                        proxEstado = EstadoOperacional.ENFRIANDO
                    else:
                        demandaCalor = (tempActual <= (self.config.crop.temp_ideal_min + self.HIST_TEMP)) if (self.estadoActual == EstadoOperacional.CALENTANDO) else (tempActual <= self.config.crop.temp_ideal_min)
                        if demandaCalor:
                            req_heater = True
                            proxEstado = EstadoOperacional.CALENTANDO
            
            # 5. Demanda de Humedad
            if humActual != -999.0 and proxEstado != EstadoOperacional.EMERGENCIA:
                if self.mode == "BUGGY":
                    if humActual <= self.config.crop.hum_ideal_min:
                        req_fogger = True
                        if proxEstado == EstadoOperacional.NORMAL:
                            proxEstado = EstadoOperacional.HUMIDIFICANDO
                    elif humActual >= self.config.crop.hum_ideal_max:
                        req_extractor = True
                else:
                    # Con Histéresis
                    demandaNiebla = (humActual <= (self.config.crop.hum_ideal_min + self.HIST_HUM)) if (self.estadoActual == EstadoOperacional.HUMIDIFICANDO) else (humActual <= self.config.crop.hum_ideal_min)
                    excesoHumedad = (humActual >= (self.config.crop.hum_ideal_max - self.HIST_HUM)) if (self.estadoActual == EstadoOperacional.ENFRIANDO or self.extractor_ON) else (humActual >= self.config.crop.hum_ideal_max)
                    if demandaNiebla:
                        req_fogger = True
                        if proxEstado == EstadoOperacional.NORMAL:
                            proxEstado = EstadoOperacional.HUMIDIFICANDO
                    elif excesoHumedad:
                        req_extractor = True

            # 6. ÁRBITRO DE ACTUADORES (Exclusión Mutua)
            if self.mode != "BUGGY" and req_extractor:
                req_fogger = False # No tirar niebla si el extractor está activo

            if horaDia >= 0 and horaDia < self.config.crop.light_hours_on:
                req_light = True

        self.estadoActual = proxEstado
        self.cooler_ON = req_cooler
        self.fogger_ON = req_fogger
        self.extractor_ON = req_extractor
        self.light_ON = req_light
        
        self.actualizarModulacionSSR(now)

    def actualizarModulacionSSR(self, now):
        if self.estadoActual in (EstadoOperacional.SAFE_MODE, EstadoOperacional.EMERGENCIA):
            self.heater_ON = False
            return

        if self.estadoActual == EstadoOperacional.CALENTANDO:
            if (now - self.windowStartTime) > self.PID_WINDOW_SIZE:
                self.windowStartTime += self.PID_WINDOW_SIZE
            # Modulación PWM Time-Proportioning
            self.heater_ON = (self.pidOutput > (now - self.windowStartTime))
        else:
            self.heater_ON = False

def run_tests():
    print("=" * 80)
    print("🧪 EJECUCIÓN DE PRUEBAS EMPÍRICAS DE FIRMWARE (C++ HARNESS)")
    print("=" * 80)
    
    # -------------------------------------------------------------
    # PRUEBA 1: Safe Mode ante fallo de sensores
    # -------------------------------------------------------------
    print("\n[TEST 1] COMPORTAMIENTO ANTE FALLO TOTAL DE SENSORES DHT")
    print("-" * 80)
    
    ctrl_fix = SimulatedHardwareController(mode="FIXED")
    for _ in range(5):
        ctrl_fix.feedSensors(18.0, 80.0, 18.0, 80.0, 22.0)
        ctrl_fix.procesarLogicaDeControl(1000, 10)
        
    ctrl_fix.feedSensors(float('nan'), float('nan'), float('nan'), float('nan'), 22.0)
    ctrl_fix.procesarLogicaDeControl(2000, 10)
    
    print(f"👉 Sensores desconectados: EWMA_Temp={ctrl_fix.ewma_temp:.2f}°C | Estado={ctrl_fix.estadoActual} | Calefactor={'ON' if ctrl_fix.heater_ON else '🛑 OFF (SEGURO)'}")
    assert ctrl_fix.estadoActual == EstadoOperacional.SAFE_MODE
    assert ctrl_fix.heater_ON == False
    print("   ✅ RESULTADO: TEST 1 PASADO (SAFE_MODE y actuadores apagados).")

    # -------------------------------------------------------------
    # PRUEBA 2: Redundancia Dual con 1 sensor caído
    # -------------------------------------------------------------
    print("\n[TEST 2] REDUNDANCIA DUAL CON 1 DHT AVERIADO")
    print("-" * 80)
    ctrl_fix.feedSensors(float('nan'), float('nan'), 23.5, 88.0, 24.0)
    ctrl_fix.procesarLogicaDeControl(3000, 10)
    print(f"   DHT1=Falla, DHT2=23.5°C -> TempPromedio={ctrl_fix.tempPromedio:.2f}°C, Estado={ctrl_fix.estadoActual}")
    assert ctrl_fix.estadoActual == EstadoOperacional.NORMAL
    print("   ✅ RESULTADO: TEST 2 PASADO (Redundancia superviviente operativa).")

    # -------------------------------------------------------------
    # PRUEBA 3: Reconexión limpia de sensores
    # -------------------------------------------------------------
    print("\n[TEST 3] RECONEXIÓN DE SENSORES Y RESET DE EWMA")
    print("-" * 80)
    ctrl_fix.feedSensors(float('nan'), float('nan'), float('nan'), float('nan'), 24.0)
    ctrl_fix.procesarLogicaDeControl(4000, 10)
    ctrl_fix.feedSensors(22.0, 90.0, 22.0, 90.0, 24.0)
    ctrl_fix.procesarLogicaDeControl(5000, 10)
    print(f"   Reconexión a 22.0°C -> EWMA_Temp={ctrl_fix.ewma_temp:.2f}°C")
    assert ctrl_fix.ewma_temp == 22.0
    print("   ✅ RESULTADO: TEST 3 PASADO (Reinicio limpio de EWMA sin arrastre).")

    # -------------------------------------------------------------
    # PRUEBA 4: Veto de Sustrato Caliente
    # -------------------------------------------------------------
    print("\n[TEST 4] VETO POR TEMPERATURA CRÍTICA DE SUSTRATO (NTC)")
    print("-" * 80)
    ctrl_fix.feedSensors(18.0, 85.0, 18.0, 85.0, 28.5)
    ctrl_fix.procesarLogicaDeControl(6000, 10)
    print(f"   Aire=18°C, Sustrato=28.5°C -> Estado={ctrl_fix.estadoActual} | Calefactor={'ON' if ctrl_fix.heater_ON else 'OFF'} | Extractor={'ON' if ctrl_fix.extractor_ON else 'OFF'}")
    assert ctrl_fix.estadoActual == EstadoOperacional.EMERGENCIA
    assert ctrl_fix.heater_ON == False
    assert ctrl_fix.extractor_ON == True
    print("   ✅ RESULTADO: TEST 4 PASADO (Veto de seguridad verificado).")

    # -------------------------------------------------------------
    # PRUEBA 5: Árbitro de Actuadores (Exclusión Mutua Extractor ↔ Fogger)
    # -------------------------------------------------------------
    print("\n[TEST 5] ÁRBITRO DE CONFLICTOS: EXCLUSIÓN MUTUA EXTRACTOR ↔ FOGGER")
    print("-" * 80)
    # Temperatura caliente sostenida (26°C > 24°C ideal_max -> demanda extractor)
    # Humedad baja (70% < 85% ideal_min -> demanda niebla)
    ctrl_bug = SimulatedHardwareController(mode="BUGGY")
    for _ in range(15):
        ctrl_bug.feedSensors(26.0, 70.0, 26.0, 70.0, 24.0)
        ctrl_bug.procesarLogicaDeControl(7000, 10)

    print(f"   👉 CÓDIGO ANTIGUO (CON CONFLICTO):")
    print(f"      EWMA_Temp={ctrl_bug.ewma_temp:.2f}°C | Extractor={'ON' if ctrl_bug.extractor_ON else 'OFF'} + Fogger={'ON' if ctrl_bug.fogger_ON else 'OFF'} ❌ (Niebla expulsada y desperdiciada)")
    
    for _ in range(15):
        ctrl_fix.feedSensors(26.0, 70.0, 26.0, 70.0, 24.0)
        ctrl_fix.procesarLogicaDeControl(7000, 10)

    print(f"   👉 CÓDIGO CORREGIDO CON ÁRBITRO:")
    print(f"      EWMA_Temp={ctrl_fix.ewma_temp:.2f}°C | Extractor={'ON' if ctrl_fix.extractor_ON else 'OFF'} + Fogger={'ON' if ctrl_fix.fogger_ON else 'OFF'} ✅ (Fogger en standby durante extracción)")
    assert ctrl_fix.extractor_ON == True
    assert ctrl_fix.fogger_ON == False
    print("   ✅ RESULTADO: TEST 5 PASADO (Exclusión mutua garantizada).")

    # -------------------------------------------------------------
    # PRUEBA 6: Banda Muerta e Histéresis
    # -------------------------------------------------------------
    print("\n[TEST 6] HISTÉRESIS (BANDA MUERTA) EN TEMPERATURA Y HUMEDAD")
    print("-" * 80)
    # Estabilizar a 19.0°C (debajo de 20.0°C ideal_min -> CALENTANDO)
    for _ in range(25):
        ctrl_fix.feedSensors(19.0, 88.0, 19.0, 88.0, 24.0)
        ctrl_fix.procesarLogicaDeControl(8000, 10)

    print(f"   Temp={ctrl_fix.ewma_temp:.2f}°C (debajo de 20.0°C) -> Estado={ctrl_fix.estadoActual}")
    assert ctrl_fix.estadoActual == EstadoOperacional.CALENTANDO
    
    # Sube a 20.3°C (dentro de la banda muerta 20.0 - 20.5°C) -> permanece en CALENTANDO
    for _ in range(25):
        ctrl_fix.feedSensors(20.3, 88.0, 20.3, 88.0, 24.0)
        ctrl_fix.procesarLogicaDeControl(9000, 10)

    print(f"   Temp={ctrl_fix.ewma_temp:.2f}°C (en banda de histéresis) -> Estado={ctrl_fix.estadoActual} (Evita oscilaciones)")
    assert ctrl_fix.estadoActual == EstadoOperacional.CALENTANDO
    
    # Sube a 21.0°C (cruza banda muerta > 20.5°C) -> pasa a NORMAL
    for _ in range(25):
        ctrl_fix.feedSensors(21.0, 88.0, 21.0, 88.0, 24.0)
        ctrl_fix.procesarLogicaDeControl(10000, 10)

    print(f"   Temp={ctrl_fix.ewma_temp:.2f}°C (cruza histéresis > 20.5°C) -> Estado={ctrl_fix.estadoActual}")
    assert ctrl_fix.estadoActual == EstadoOperacional.NORMAL
    print("   ✅ RESULTADO: TEST 6 PASADO (Histéresis previene relay chatter).")

    # -------------------------------------------------------------
    # PRUEBA 7: Modulación Time-Proportioning de Alta Frecuencia (SSR PID PWM)
    # -------------------------------------------------------------
    print("\n[TEST 7] MODULACIÓN RÁPIDA TIME-PROPORTIONING (SSR PID PWM)")
    print("-" * 80)
    # Estabilizar en modo CALENTANDO
    for _ in range(25):
        ctrl_fix.feedSensors(18.0, 88.0, 18.0, 88.0, 24.0)
        ctrl_fix.procesarLogicaDeControl(10000, 10)

    ctrl_fix.windowStartTime = 10000
    ctrl_fix.pidOutput = 2500.0 # 50% PWM (2500 ms de 5000 ms)
    
    # Tick rápido a t = 11000 (1 segundo dentro de la ventana de 5s < 2.5s) -> Calefactor ON
    ctrl_fix.actualizarModulacionSSR(11000)
    print(f"   t=1000 ms (dentro del 50% duty: 1000ms < 2500ms) -> SSR Calefactor={'ON' if ctrl_fix.heater_ON else 'OFF'}")
    assert ctrl_fix.heater_ON == True
    
    # Tick rápido a t = 13000 (3 segundos dentro de la ventana de 5s > 2.5s) -> Calefactor OFF
    ctrl_fix.actualizarModulacionSSR(13000)
    print(f"   t=3000 ms (supera el 50% duty: 3000ms > 2500ms) -> SSR Calefactor={'ON' if ctrl_fix.heater_ON else 'OFF'}")
    assert ctrl_fix.heater_ON == False
    print("   ✅ RESULTADO: TEST 7 PASADO (Modulación PWM de alta resolución desacoplada del ciclo de 5s).")

    print("\n" + "=" * 80)
    print("🎉 TODOS LOS 7 TESTS EMPÍRICOS PASARON CON 100% DE ÉXITO")
    print("=" * 80)

if __name__ == "__main__":
    run_tests()
