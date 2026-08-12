#include "HardwareController.h"

HardwareController::HardwareController() : _heaterPID(&_pidInput, &_pidOutput, &_pidSetpoint, 2.0, 5.0, 1.0, DIRECT) {
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

    _heaterPID.SetMode(1); // 1 = AUTOMATIC in PID_v1
    _heaterPID.SetOutputLimits(0, PID_WINDOW_SIZE);
    _windowStartTime = millis();
    
    Serial.println(F("✅ [Hardware] Inicializado correctamente."));
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
        Serial.println(F("❌ [Hardware] Ignorando comando de Calefactor. Sistema en modo AUTO."));
        return;
    }
    _ejecutarAccion(PIN_HEATER, _actuadores.heater_ON, estado, _last_heater_switch, millis(), false);
}
void HardwareController::setFogger(bool estado) {
    if (_modoActual == ModoOperacion::AUTO) {
        Serial.println(F("❌ [Hardware] Ignorando comando de Niebla. Sistema en modo AUTO."));
        return;
    }
    _ejecutarAccion(PIN_FOGGER, _actuadores.fogger_ON, estado, _last_fogger_switch, millis(), false);
}
void HardwareController::setExtractor(bool estado) {
    if (_modoActual == ModoOperacion::AUTO) {
        Serial.println(F("❌ [Hardware] Ignorando comando de Extractor. Sistema en modo AUTO."));
        return;
    }
    _ejecutarAccion(PIN_EXTRACTOR, _actuadores.extractor_ON, estado, _last_extractor_switch, millis(), false);
}
void HardwareController::setLight(bool estado) {
    if (_modoActual == ModoOperacion::AUTO) {
        Serial.println(F("❌ [Hardware] Ignorando comando de Luz. Sistema en modo AUTO."));
        return;
    }
    Serial.printf("[Hardware] setLight(%s) llamado. Estado actual: %s\n", estado ? "ON" : "OFF", _actuadores.light_ON ? "ON" : "OFF");
    // Luz exenta de filtro anti-short-cycle (ignorarFiltro = true)
    _ejecutarAccion(PIN_LIGHT, _actuadores.light_ON, estado, _last_light_switch, millis(), true);
}

void HardwareController::setCooler(bool estado) {
    if (_modoActual == ModoOperacion::AUTO) {
        Serial.println(F("❌ [Hardware] Ignorando comando de Cooler. Sistema en modo AUTO."));
        return;
    }
    // Peltier exento de filtro anti-short-cycle (ignorarFiltro = true)
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

    // 3. Leer NTC 1 (Sustrato)
    int valorADC = analogRead(PIN_ANALOGICO);
    if (valorADC > 0 && valorADC < 4095) {
        _sensores.analogicoOk = true;
        float resistencia = NTC_R_SERIE / (4095.0f / (float)valorADC - 1.0f);
        float tempK = 1.0f / (1.0f / (NTC_T_NOMINAL + 273.15f) + (1.0f / NTC_BETA) * log(resistencia / NTC_R_NOMINAL));
        _sensores.valorAnalogico = tempK - 273.15f; 
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

    _sensores.co2Ok = false;
    _sensores.co2 = 400; 

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
        _sensores.ewma_temp = _sensores.tempPromedio != -999.0f ? _sensores.tempPromedio : 20.0f;
        _sensores.ewma_hum = _sensores.humPromedio != -999.0f ? _sensores.humPromedio : 50.0f;
        _sensores.ewma_sustrato = _sensores.analogicoOk ? _sensores.valorAnalogico : 20.0f;
        _sensores.ewma_vpd = _sensores.vpd;
        _sensores.ewma_co2 = _sensores.co2;
        _sensores.ewmaInitialized = true;
    } else {
        if (_sensores.tempPromedio != -999.0f) 
            _sensores.ewma_temp = (ALPHA_EWMA * _sensores.tempPromedio) + ((1.0f - ALPHA_EWMA) * _sensores.ewma_temp);
        
        if (_sensores.humPromedio != -999.0f) 
            _sensores.ewma_hum = (ALPHA_EWMA * _sensores.humPromedio) + ((1.0f - ALPHA_EWMA) * _sensores.ewma_hum);
            
        if (_sensores.analogicoOk) 
            _sensores.ewma_sustrato = (ALPHA_EWMA * _sensores.valorAnalogico) + ((1.0f - ALPHA_EWMA) * _sensores.ewma_sustrato);
            
        _sensores.ewma_vpd = (ALPHA_EWMA * _sensores.vpd) + ((1.0f - ALPHA_EWMA) * _sensores.ewma_vpd);
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

        // Lectura segura de sensores (Ambiental ahora usa EWMA)
        float tempActual = _sensores.ewma_temp;
        float humActual = (_sensores.dhtOk || _sensores.dht2Ok) ? _sensores.ewma_hum : -999.0f;
        int co2Actual = _sensores.co2Ok ? (int)_sensores.ewma_co2 : 400;

        // Falla catastrófica de sensores: Apagar por seguridad (Safe Mode)
        if (tempActual == -999.0f) {
            proxEstado = EstadoOperacional::SAFE_MODE;
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

            // Jerarquía de Supervivencia:
            // 1. Calor Extremo (Ambiente o Sustrato) o Failsafe Absoluto
            float tempSustrato = _sensores.analogicoOk ? _sensores.ewma_sustrato : -999.0f;

            if (tempActual >= _config.failsafes.max_internal_temp_limit_c || tempActual >= _config.crop.temp_crit_max || (tempSustrato != -999.0f && tempSustrato >= _config.crop.temp_sustrato_crit_max)) {
                req_extractor = true;
                req_cooler = true;
                req_heater = false; // Seguridad extra
                proxEstado = EstadoOperacional::EMERGENCIA;
                
                // Enfriar el sustrato activando aire o simplemente parando calor.
            } 
            // 2. Toxicidad de Gases (CO2)
            else if (co2Actual >= _config.crop.co2_crit_max) {
                req_extractor = true;
                if (proxEstado == EstadoOperacional::NORMAL) proxEstado = EstadoOperacional::NORMAL; // O EMERGENCIA
            }
            // 3. Demanda de Frío Ambiental
            else if (tempActual >= _config.crop.temp_ideal_max) {
                req_cooler = true;
                req_extractor = true; // Refrescar 
                req_heater = false;
                proxEstado = EstadoOperacional::ENFRIANDO;
            }
            // 4. Demanda de Calor (Controlado por PID)
            else if (tempActual <= _config.crop.temp_ideal_min || _pidOutput > 0) {
                // Si la temperatura es menor al ideal, o si el PID todavía nos pide estar encendidos en esta ventana
                if (_pidOutput > (now - _windowStartTime)) {
                    req_heater = true;
                    proxEstado = EstadoOperacional::CALENTANDO;
                } else {
                    req_heater = false;
                }
            }

            // 5. Demanda de Humedad (solo si no hay calor extremo, ya que la extracción ganaría)
            if (humActual != -999.0f && humActual <= _config.crop.hum_ideal_min && proxEstado != EstadoOperacional::EMERGENCIA) {
                req_fogger = true;
                if (proxEstado == EstadoOperacional::NORMAL) proxEstado = EstadoOperacional::HUMIDIFICANDO;
            }
            else if (humActual != -999.0f && humActual >= _config.crop.hum_ideal_max) {
                req_extractor = true; // Sacar humedad
            }

            // Fotoperiodo
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
        
        // Calefactor y Peltier exentos de filtro de tiempo gracias al SSR
        _ejecutarAccion(PIN_HEATER, _actuadores.heater_ON, req_heater, _last_heater_switch, now, true);
        _ejecutarAccion(PIN_COOLER, _actuadores.cooler_ON, req_cooler, _last_cooler_switch, now, true);
        
        // Luz exenta de filtro de tiempo
        _ejecutarAccion(PIN_LIGHT, _actuadores.light_ON, req_light, _last_light_switch, now, true);
    }
}
