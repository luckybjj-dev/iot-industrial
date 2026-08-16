#include "HardwareController.h"

HardwareController::HardwareController() : _heaterPID(&_pidInput, &_pidOutput, &_pidSetpoint, 1500.0, 100.0, 250.0, DIRECT) {
}

void HardwareController::begin() {
    Serial.println(F("[Hardware] Inicializando pines y sensores..."));
    
    pinMode(PIN_HEATER, OUTPUT);
    pinMode(PIN_COOLER, OUTPUT);
    pinMode(PIN_FOGGER, OUTPUT);
    pinMode(PIN_EXTRACTOR, OUTPUT);
    pinMode(PIN_LIGHT, OUTPUT);

    digitalWrite(PIN_HEATER, LOW);
    digitalWrite(PIN_COOLER, LOW);
    digitalWrite(PIN_FOGGER, LOW);
    digitalWrite(PIN_EXTRACTOR, LOW);
    digitalWrite(PIN_LIGHT, HIGH); // Relé de Luz es Activo LOW

    _dht.setup(DHTPIN, DHTesp::DHT22);
    _dht2.setup(DHT2PIN, DHTesp::DHT22);

    // Calibración y Caracterización de ADC1 (Canal 6 / GPIO 34) con curva eFuse / Two Point
    adc1_config_width(ADC_WIDTH_BIT_12);
    adc1_config_channel_atten(ADC1_CHANNEL_6, ADC_ATTEN_DB_12);
    esp_adc_cal_characterize(ADC_UNIT_1, ADC_ATTEN_DB_12, ADC_WIDTH_BIT_12, 1100, &_adcChars);

    // Inicialización I2C para sensor CO2 NDIR (SCD30 en GPIO 21 SDA / GPIO 22 SCL)
    Wire.begin(21, 22);
    Wire.setClock(100000);
    Wire.beginTransmission(0x61);
    if (Wire.endTransmission() == 0) {
        _scd30Presente = true;
        // Iniciar medición continua en SCD30
        Wire.beginTransmission(0x61);
        Wire.write(0x00);
        Wire.write(0x10);
        Wire.write(0x00);
        Wire.write(0x00);
        Wire.write(0x81);
        Wire.endTransmission();
        Serial.println(F("✅ [Hardware] Sensor CO2 NDIR SCD30 detectado y configurado en I2C (0x61)."));
    } else {
        _scd30Presente = false;
        Serial.println(F("ℹ️ [Hardware] Sensor CO2 NDIR no detectado en I2C (usando valor atmosférico de base)."));
    }

    _heaterPID.SetMode(1); // 1 = AUTOMATIC in PID_v1
    _heaterPID.SetOutputLimits(0, PID_WINDOW_SIZE);
    _windowStartTime = millis();
    
    Serial.println(F("✅ [Hardware] Inicializado correctamente (ADC Calibrado + I2C Bus)."));
}

void HardwareController::setConfiguracion(const ConfiguracionCultivo& config) {
    _config = config;
}

void HardwareController::setModoOperacion(ModoOperacion modo) {
    _modoActual = modo;
    if (modo == ModoOperacion::MANUAL) {
        _tiempoInicioManual = millis();
        Serial.println(F("⚠️ [Hardware] Modo MANUAL activado por MQTT. Lógica local suspendida temporalmente."));
    } else {
        Serial.println(F("✅ [Hardware] Modo AUTO restaurado. Retomando control termodinámico (Rule Engine)."));
    }
}

// Sobrecarga de comandos manuales
void HardwareController::setHeater(bool estado) {
    if (_modoActual == ModoOperacion::AUTO) {
        setModoOperacion(ModoOperacion::MANUAL);
    }
    Serial.printf("[Hardware] setHeater(%s) manual ejecutado.\n", estado ? "ON" : "OFF");
    _ejecutarAccion(PIN_HEATER, _actuadores.heater_ON, estado, _last_heater_switch, millis(), true);
}
void HardwareController::setFogger(bool estado) {
    if (_modoActual == ModoOperacion::AUTO) {
        setModoOperacion(ModoOperacion::MANUAL);
    }
    Serial.printf("[Hardware] setFogger(%s) manual ejecutado.\n", estado ? "ON" : "OFF");
    _ejecutarAccion(PIN_FOGGER, _actuadores.fogger_ON, estado, _last_fogger_switch, millis(), true);
}
void HardwareController::setExtractor(bool estado) {
    if (_modoActual == ModoOperacion::AUTO) {
        setModoOperacion(ModoOperacion::MANUAL);
    }
    Serial.printf("[Hardware] setExtractor(%s) manual ejecutado.\n", estado ? "ON" : "OFF");
    _ejecutarAccion(PIN_EXTRACTOR, _actuadores.extractor_ON, estado, _last_extractor_switch, millis(), true);
}
void HardwareController::setLight(bool estado) {
    if (_modoActual == ModoOperacion::AUTO) {
        setModoOperacion(ModoOperacion::MANUAL);
    }
    Serial.printf("[Hardware] setLight(%s) manual ejecutado. Estado actual: %s\n", estado ? "ON" : "OFF", _actuadores.light_ON ? "ON" : "OFF");
    _ejecutarAccion(PIN_LIGHT, _actuadores.light_ON, estado, _last_light_switch, millis(), true);
}

void HardwareController::setCooler(bool estado) {
    if (_modoActual == ModoOperacion::AUTO) {
        setModoOperacion(ModoOperacion::MANUAL);
    }
    Serial.printf("[Hardware] setCooler(%s) manual ejecutado.\n", estado ? "ON" : "OFF");
    _ejecutarAccion(PIN_COOLER, _actuadores.cooler_ON, estado, _last_cooler_switch, millis(), true);
}

void HardwareController::leerSensores() {
    // 1. Leer DHT1
    float t = _dht.getTemperature();
    float h = _dht.getHumidity();

    if (isnan(t) || isnan(h)) {
        _sensores.dhtOk = false;
        Serial.println(F("❌ [Sensor] Fallo al leer DHT1"));
    } else {
        _sensores.dhtOk = true;
        _sensores.tempAmb = t;
        _sensores.humAmb = h;
    }

    // 2. Leer DHT2
    float t2 = _dht2.getTemperature();
    float h2 = _dht2.getHumidity();

    if (isnan(t2) || isnan(h2)) {
        _sensores.dht2Ok = false;
        Serial.println(F("❌ [Sensor] Fallo al leer DHT2"));
    } else {
        _sensores.dht2Ok = true;
        _sensores.tempAmb2 = t2;
        _sensores.humAmb2 = h2;
    }

    // 3. Leer NTC 1 (Sustrato) con Multisampling (32 muestras) y Calibración eFuse/TwoPoint
    uint32_t adcRawSum = 0;
    for (int i = 0; i < NTC_SAMPLES; i++) {
        adcRawSum += adc1_get_raw(ADC1_CHANNEL_6);
        delayMicroseconds(30);
    }
    uint32_t adcRawAvg = adcRawSum / NTC_SAMPLES;

    if (adcRawAvg > 30 && adcRawAvg < 4080) {
        uint32_t voltageMv = esp_adc_cal_raw_to_voltage(adcRawAvg, &_adcChars);
        if (voltageMv > 50 && voltageMv < (V_REF_MV - 50)) {
            _sensores.analogicoOk = true;
            float resistencia = NTC_R_SERIE / ((V_REF_MV / (float)voltageMv) - 1.0f);
            float tempK = 1.0f / (1.0f / (NTC_T_NOMINAL + 273.15f) + (1.0f / NTC_BETA) * log(resistencia / NTC_R_NOMINAL));
            _sensores.valorAnalogico = tempK - 273.15f; 
        } else {
            _sensores.analogicoOk = false;
        }
    } else {
        _sensores.analogicoOk = false;
    }

    // 4. Calcular Promedios con Fallback de Seguridad
    if (_sensores.dhtOk && _sensores.dht2Ok) {
        _sensores.tempPromedio = (_sensores.tempAmb + _sensores.tempAmb2) / 2.0f;
        _sensores.humPromedio = (_sensores.humAmb + _sensores.humAmb2) / 2.0f;
    } else if (_sensores.dhtOk) {
        _sensores.tempPromedio = _sensores.tempAmb;
        _sensores.humPromedio = _sensores.humAmb;
    } else if (_sensores.dht2Ok) {
        _sensores.tempPromedio = _sensores.tempAmb2;
        _sensores.humPromedio = _sensores.humAmb2;
    } else {
        _sensores.tempPromedio = -999.0f; // Ambos fallaron
        _sensores.humPromedio = -999.0f;  // Ambos fallaron
    }

    // 5. Calcular VPD unificado (usando promedios)
    if (_sensores.tempPromedio != -999.0f && _sensores.humPromedio != -999.0f) {
        _sensores.vpd = calcularVPD(_sensores.tempPromedio, _sensores.humPromedio);
    } else {
        _sensores.vpd = 0.0f;
    }

    // 6. Leer Sensor CO2 NDIR (SCD30 en I2C)
    if (_scd30Presente) {
        Wire.beginTransmission(0x61);
        Wire.write(0x02);
        Wire.write(0x02); // Data ready check
        if (Wire.endTransmission() == 0) {
            Wire.requestFrom((uint8_t)0x61, (uint8_t)3);
            if (Wire.available() >= 3) {
                uint8_t msb = Wire.read();
                uint8_t lsb = Wire.read();
                Wire.read(); // CRC
                uint16_t ready = ((uint16_t)msb << 8) | lsb;
                if (ready == 1) {
                    Wire.beginTransmission(0x61);
                    Wire.write(0x03);
                    Wire.write(0x00); // Read measurement
                    if (Wire.endTransmission() == 0) {
                        Wire.requestFrom((uint8_t)0x61, (uint8_t)18);
                        if (Wire.available() >= 18) {
                            uint8_t b[4];
                            b[3] = Wire.read(); b[2] = Wire.read(); Wire.read(); // Byte 0,1 + CRC
                            b[1] = Wire.read(); b[0] = Wire.read(); Wire.read(); // Byte 2,3 + CRC
                            for (int i = 0; i < 12; i++) Wire.read(); // Ignorar temp y hum del SCD30 (usamos DHT22 calibrados)
                            float co2Val = 0.0f;
                            memcpy(&co2Val, b, 4);
                            if (co2Val >= 350.0f && co2Val <= 10000.0f) {
                                _sensores.co2 = co2Val;
                                _sensores.co2Ok = true;
                            }
                        }
                    }
                }
            }
        }
    }

    if (!_sensores.co2Ok) {
        _sensores.co2 = 400; // Baseline atmosférico estándar
    } 

    // --- 6. Aplicación del Filtro Matemático EWMA ---
    /**
     * @details Integración del Filtro EWMA: 
     * Y(n) = alpha * X(n) + (1 - alpha) * Y(n-1)
     * Este enfoque suaviza la respuesta del lazo de control frente a fluctuaciones repentinas 
     * (ej. abrir la puerta del cultivo o ráfagas de viento) y mejora el cálculo del Déficit 
     * de Presión de Vapor (VPD) minimizando saltos irreales.
     * La bandera ewmaInitialized previene el sesgo inicial (arrastre desde cero).
     */
    if (!_sensores.ewmaInitialized) {
        // Inicialización en la primera pasada para evitar el sesgo de asimetría.
        if (_sensores.tempPromedio != -999.0f && _sensores.humPromedio != -999.0f) {
            _sensores.ewma_temp = _sensores.tempPromedio;
            _sensores.ewma_hum = _sensores.humPromedio;
            _sensores.ewma_sustrato = _sensores.analogicoOk ? _sensores.valorAnalogico : 20.0f;
            _sensores.ewma_vpd = _sensores.vpd;
            _sensores.ewma_co2 = _sensores.co2;
            _sensores.ewmaInitialized = true;
        } else {
            _sensores.ewma_temp = -999.0f;
            _sensores.ewma_hum = -999.0f;
            _sensores.ewma_sustrato = _sensores.analogicoOk ? _sensores.valorAnalogico : 20.0f;
            _sensores.ewma_vpd = 0.0f;
            _sensores.ewma_co2 = _sensores.co2;
        }
    } else {
        if (_sensores.tempPromedio != -999.0f) {
            _sensores.ewma_temp = (ALPHA_EWMA * _sensores.tempPromedio) + ((1.0f - ALPHA_EWMA) * _sensores.ewma_temp);
        } else {
            // Falla de sensores: forzar -999.0f y desmarcar inicialización para que al reconectar tome el valor instantáneo sin inercia falsa
            _sensores.ewma_temp = -999.0f;
            _sensores.ewmaInitialized = false;
        }
        
        if (_sensores.humPromedio != -999.0f) {
            _sensores.ewma_hum = (ALPHA_EWMA * _sensores.humPromedio) + ((1.0f - ALPHA_EWMA) * _sensores.ewma_hum);
        } else {
            _sensores.ewma_hum = -999.0f;
        }
            
        if (_sensores.analogicoOk) 
            _sensores.ewma_sustrato = (ALPHA_EWMA * _sensores.valorAnalogico) + ((1.0f - ALPHA_EWMA) * _sensores.ewma_sustrato);
            
        _sensores.ewma_vpd = (_sensores.tempPromedio != -999.0f && _sensores.humPromedio != -999.0f) 
                             ? ((ALPHA_EWMA * _sensores.vpd) + ((1.0f - ALPHA_EWMA) * _sensores.ewma_vpd))
                             : 0.0f;
        _sensores.ewma_co2 = (ALPHA_EWMA * (float)_sensores.co2) + ((1.0f - ALPHA_EWMA) * _sensores.ewma_co2);
    }
}

float HardwareController::calcularVPD(float tempC, float humRH) {
    float svp = 0.61078f * exp((17.27f * tempC) / (tempC + 237.3f));
    float avp = svp * (humRH / 100.0f);
    return svp - avp;
}

void HardwareController::_ejecutarAccion(int pin, bool& estadoActual, bool nuevoEstado, unsigned long& ultimoCambio, unsigned long now, bool ignorarFiltro) {
    if (estadoActual == nuevoEstado) return;

    /**
     * @brief Capa de Protección de Hardware: Filtro Anti-Short-Cycle (Debounce de Potencia).
     * @details Lógica industrial asimétrica:
     * - APAGAR (OFF) es inmediato para cortar excesos (emergencias, sobretemperaturas).
     * - RE-ENCENDER (ON) requiere expirar un temporizador interno (MIN_RELAY_TIME_MS).
     * Esto permite la nivelación de presiones en compresores y evita el arqueo en relés mecánicos.
     */
    if (!ignorarFiltro && _modoActual == ModoOperacion::AUTO && nuevoEstado == true) {
        if (now - ultimoCambio < MIN_RELAY_TIME_MS && ultimoCambio != 0) {
            // Aún en tiempo de Debounce — bloqueando RE-ENCENDIDO
            return;
        }
    }
    
    // Si llegamos aquí, se puede cambiar el estado
    estadoActual = nuevoEstado;
    ultimoCambio = now;
    
    if (pin == PIN_LIGHT) {
        digitalWrite(pin, estadoActual ? LOW : HIGH); // Activo LOW
    } else {
        digitalWrite(pin, estadoActual ? HIGH : LOW);
    }
}

void HardwareController::procesarLogicaDeControl(unsigned long now, int horaDia) {
    // =========================================================
    // 0. CONTROL DE CADUCIDAD MODO MANUAL
    // =========================================================
    bool evaluarPerfil = true;
    if (_modoActual == ModoOperacion::MANUAL) {
        // Asegurar un mínimo de 1 minuto para evitar expiraciones instantáneas por configuraciones corruptas
        unsigned long timeout = _config.max_manual_time_ms;
        if (timeout < 60000) timeout = 300000; // 5 minutos por defecto

        unsigned long elapsed = (now >= _tiempoInicioManual) ? (now - _tiempoInicioManual) : 0;
        if (elapsed >= timeout) {
            Serial.println(F("⚠️ [Hardware] Tiempo manual expirado. Retornando a modo AUTO."));
            _modoActual = ModoOperacion::AUTO;
        } else {
            evaluarPerfil = false; 
            _estadoActual = EstadoOperacional::MANUAL;
        }
    }

    // =========================================================
    // 1. CAPA 2: ÁRBITRO DE CONFLICTOS Y MOTOR DETERMINISTA
    // =========================================================
    if (evaluarPerfil) {
        bool req_extractor = false;
        bool req_heater = false;
        bool req_cooler = false;
        bool req_fogger = false;
        bool req_light = false;
        EstadoOperacional proxEstado = EstadoOperacional::NORMAL;

        // Lectura segura de sensores (Ambiental ahora usa EWMA con fallback estricto)
        float tempActual = (_sensores.dhtOk || _sensores.dht2Ok) ? _sensores.ewma_temp : -999.0f;
        float humActual = (_sensores.dhtOk || _sensores.dht2Ok) ? _sensores.ewma_hum : -999.0f;
        int co2Actual = _sensores.co2Ok ? (int)_sensores.ewma_co2 : 400;

        // Falla catastrófica de sensores: Apagar actuadores climáticos por seguridad (Safe Mode)
        if (tempActual == -999.0f) {
            proxEstado = EstadoOperacional::SAFE_MODE;
            req_heater = false;
            req_cooler = false;
            req_fogger = false;
            req_extractor = false;
            if (horaDia >= 0 && horaDia < _config.crop.light_hours_on) {
                req_light = true;
            }
        } else {
            /**
             * @brief Integración Continua del Lazo PID y Time-Proportioning.
             * @details 
             * 1. Se alimenta al algoritmo PID con la temperatura filtrada (EWMA) como PV (Process Variable).
             * 2. El Setpoint se ajusta al mínimo del rango ideal.
             * 3. Compute() calcula la respuesta integral/derivativa para mitigar el error constante.
             * 4. La ventana de tiempo se gestiona iterativamente para lograr un duty-cycle proporcional
             *    que activa el relé SSR de manera suave y precisa.
             */
            _pidInput = tempActual;
            _pidSetpoint = _config.crop.temp_ideal_min;
            _heaterPID.Compute();

            // Gestión iterativa de la ventana de tiempo del relé (PWM a nivel software)
            if (now - _windowStartTime > PID_WINDOW_SIZE) {
                _windowStartTime += PID_WINDOW_SIZE;
            }

            // 1. Jerarquía de Supervivencia: Calor Extremo (Ambiente o Sustrato)
            float tempSustrato = _sensores.analogicoOk ? _sensores.ewma_sustrato : -999.0f;

            if (tempActual >= _config.failsafes.max_internal_temp_limit_c || 
                tempActual >= _config.crop.temp_crit_max || 
                (tempSustrato != -999.0f && tempSustrato >= _config.crop.temp_sustrato_crit_max)) {
                req_extractor = true;
                req_cooler = true;
                req_heater = false; // Seguridad extra
                proxEstado = EstadoOperacional::EMERGENCIA;
            } 
            // 2. Toxicidad de Gases (CO2)
            else if (co2Actual >= _config.crop.co2_crit_max) {
                req_extractor = true;
                if (proxEstado == EstadoOperacional::NORMAL) proxEstado = EstadoOperacional::NORMAL;
            }
            // 3. Demanda de Frío Ambiental (con Banda Muerta / Histéresis)
            else {
                bool demandaFrio = (_estadoActual == EstadoOperacional::ENFRIANDO)
                    ? (tempActual >= (_config.crop.temp_ideal_max - HIST_TEMP))
                    : (tempActual >= _config.crop.temp_ideal_max);

                if (demandaFrio) {
                    req_cooler = true;
                    req_extractor = true;
                    req_heater = false;
                    proxEstado = EstadoOperacional::ENFRIANDO;
                }
                // 4. Demanda de Calor (Controlado por PID con Histéresis)
                else {
                    bool demandaCalor = (_estadoActual == EstadoOperacional::CALENTANDO)
                        ? (tempActual <= (_config.crop.temp_ideal_min + HIST_TEMP) || _pidOutput > 0)
                        : (tempActual <= _config.crop.temp_ideal_min || _pidOutput > 0);

                    if (demandaCalor) {
                        req_heater = true;
                        proxEstado = EstadoOperacional::CALENTANDO;
                    }
                }
            }

            // 5. Control de Microclima Hídrico y Transpiración (Gobernado por VPD y Humedad con Histéresis)
            if (humActual != -999.0f && proxEstado != EstadoOperacional::EMERGENCIA) {
                float vpdActual = _sensores.ewmaInitialized ? _sensores.ewma_vpd : _sensores.vpd;

                // Demanda de Humidificación: Humedad baja O VPD alto (> 1.20 kPa estrés de desecación)
                bool demandaNiebla = (_estadoActual == EstadoOperacional::HUMIDIFICANDO)
                    ? (humActual <= (_config.crop.hum_ideal_min + HIST_HUM) || (vpdActual > 1.00f && vpdActual > 0.0f))
                    : (humActual <= _config.crop.hum_ideal_min || (vpdActual > 1.20f && vpdActual > 0.0f));

                // Demanda de Extracción por Saturación: Humedad excesiva O VPD estancado (< 0.25 kPa riesgo de condensación)
                bool excesoHumedad = _actuadores.extractor_ON
                    ? (humActual >= (_config.crop.hum_ideal_max - HIST_HUM) || (vpdActual < 0.35f && humActual >= _config.crop.hum_ideal_max))
                    : (humActual >= _config.crop.hum_ideal_max || (vpdActual < 0.25f && humActual >= _config.crop.hum_ideal_max));

                if (demandaNiebla) {
                    req_fogger = true;
                    if (proxEstado == EstadoOperacional::NORMAL) proxEstado = EstadoOperacional::HUMIDIFICANDO;
                } else if (excesoHumedad) {
                    req_extractor = true;
                    if (proxEstado == EstadoOperacional::NORMAL) proxEstado = EstadoOperacional::ENFRIANDO;
                }
            }

            // 6. ÁRBITRO DE ACTUADORES: Exclusión Mutua Extractor ↔ Fogger
            // Si el extractor está encendido (por enfriamiento, emergencia o exceso de humedad),
            // se inhibe el Fogger para evitar evacuar y desperdiciar la niebla en el flujo de aire.
            if (req_extractor) {
                req_fogger = false;
            }

            // 7. Fotoperiodo
            if (horaDia >= 0 && horaDia < _config.crop.light_hours_on) {
                req_light = true;
            }
        }

        _estadoActual = proxEstado;

        // =========================================================
        // 2. CAPA 3: FILTRO DE HARDWARE Y EJECUCIÓN (Anti-Short Cycle)
        // =========================================================
        _ejecutarAccion(PIN_EXTRACTOR, _actuadores.extractor_ON, req_extractor, _last_extractor_switch, now, false);
        _ejecutarAccion(PIN_FOGGER, _actuadores.fogger_ON, req_fogger, _last_fogger_switch, now, false);
        
        // Peltier protegido con Anti-Short-Cycle (false) para evitar estrés térmico en la celda cerámica
        _ejecutarAccion(PIN_COOLER, _actuadores.cooler_ON, req_cooler, _last_cooler_switch, now, false);
        
        // Luz exenta de filtro de tiempo
        _ejecutarAccion(PIN_LIGHT, _actuadores.light_ON, req_light, _last_light_switch, now, true);

        // Modulación inicial de calefactor para el tick actual
        actualizarModulacionSSR(now);
    }
}

void HardwareController::actualizarModulacionSSR(unsigned long now) {
    if (_modoActual == ModoOperacion::MANUAL) return;

    if (_estadoActual == EstadoOperacional::SAFE_MODE || _estadoActual == EstadoOperacional::EMERGENCIA) {
        if (_actuadores.heater_ON) {
            _ejecutarAccion(PIN_HEATER, _actuadores.heater_ON, false, _last_heater_switch, now, true);
        }
        return;
    }

    if (_estadoActual == EstadoOperacional::CALENTANDO) {
        if (now - _windowStartTime > PID_WINDOW_SIZE) {
            _windowStartTime += PID_WINDOW_SIZE;
        }
        
        // Calentamiento inteligente híbrido:
        // Si estamos a más de 0.5°C por debajo de la meta, forzamos potencia plena continua (100% duty cycle).
        // En la zona de aproximación (dentro de los 0.5°C), modulamos finamente con el lazo PID.
        float tempActual = (_sensores.dhtOk || _sensores.dht2Ok) ? _sensores.ewma_temp : -999.0f;
        bool dutyHeater = true;
        if (tempActual != -999.0f && tempActual > (_config.crop.temp_ideal_min - 0.5f)) {
            dutyHeater = (_pidOutput > (now - _windowStartTime));
        }
        
        _ejecutarAccion(PIN_HEATER, _actuadores.heater_ON, dutyHeater, _last_heater_switch, now, true);
    } else {
        if (_actuadores.heater_ON) {
            _ejecutarAccion(PIN_HEATER, _actuadores.heater_ON, false, _last_heater_switch, now, true);
        }
    }
}
