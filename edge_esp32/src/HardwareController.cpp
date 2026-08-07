#include "HardwareController.h"

HardwareController::HardwareController() : _dht(DHTPIN, DHTTYPE) {
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

    _dht.begin();
    
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
    float t = _dht.readTemperature();
    float h = _dht.readHumidity();

    if (isnan(t) || isnan(h)) {
        _sensores.dhtOk = false;
        Serial.println(F("❌ [Sensor] Fallo al leer DHT22"));
    } else {
        _sensores.dhtOk = true;
        _sensores.tempAmb = t;
        _sensores.humAmb = h;
        _sensores.vpd = calcularVPD(t, h);
    }

    int valorADC = analogRead(PIN_ANALOGICO);
    if (valorADC > 0 && valorADC < 4095) {
        _sensores.analogicoOk = true;
        float resistencia = NTC_R_SERIE / (4095.0f / (float)valorADC - 1.0f);
        float tempK = 1.0f / (1.0f / (NTC_T_NOMINAL + 273.15f) + (1.0f / NTC_BETA) * log(resistencia / NTC_R_NOMINAL));
        _sensores.valorAnalogico = tempK - 273.15f; 
    } else {
        _sensores.analogicoOk = false;
    }

    int valorADC2 = analogRead(PIN_NTC_2);
    if (valorADC2 > 0 && valorADC2 < 4095) {
        _sensores.ntc2Ok = true;
        float resistencia2 = NTC_R_SERIE / (4095.0f / (float)valorADC2 - 1.0f);
        float tempK2 = 1.0f / (1.0f / (NTC_T_NOMINAL + 273.15f) + (1.0f / NTC_BETA) * log(resistencia2 / NTC_R_NOMINAL));
        _sensores.tempAmb2 = tempK2 - 273.15f; 
    } else {
        _sensores.ntc2Ok = false;
    }

    // Calcular Promedio de Temperatura Ambiente (Redundancia)
    if (_sensores.dhtOk && _sensores.ntc2Ok) {
        _sensores.tempPromedio = (_sensores.tempAmb + _sensores.tempAmb2) / 2.0f;
    } else if (_sensores.dhtOk) {
        _sensores.tempPromedio = _sensores.tempAmb;
    } else if (_sensores.ntc2Ok) {
        _sensores.tempPromedio = _sensores.tempAmb2;
    } else {
        _sensores.tempPromedio = -999.0f; // Ambos fallaron
    }

    _sensores.co2Ok = false;
    _sensores.co2 = 400; 
}

float HardwareController::calcularVPD(float tempC, float humRH) {
    float svp = 0.61078f * exp((17.27f * tempC) / (tempC + 237.3f));
    float avp = svp * (humRH / 100.0f);
    return svp - avp;
}

void HardwareController::_ejecutarAccion(int pin, bool& estadoActual, bool nuevoEstado, unsigned long& ultimoCambio, unsigned long now, bool ignorarFiltro) {
    if (estadoActual == nuevoEstado) return;

    // ── FILTRO ANTI-SHORT-CYCLE (Solo protege re-encendido) ──────────────
    // Lógica industrial: APAGAR siempre es inmediato (protege el cultivo).
    // RE-ENCENDER requiere esperar MIN_RELAY_TIME_MS (protege el relé/motor).
    // Ejemplo: fogger se apaga al instante si humedad > setpoint,
    //          pero no puede re-encenderse por 3 minutos tras apagarse.
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

        // Lectura segura de sensores (Ambiental ahora usa tempPromedio)
        float tempActual = _sensores.tempPromedio;
        float humActual = _sensores.dhtOk ? _sensores.humAmb : -999.0f;
        int co2Actual = _sensores.co2Ok ? _sensores.co2 : 400;

        // Falla catastrófica de sensores: Apagar por seguridad (Safe Mode)
        if (tempActual == -999.0f) {
            proxEstado = EstadoOperacional::SAFE_MODE;
        } else {
            // Jerarquía de Supervivencia:
            // 1. Calor Extremo o Failsafe Absoluto
            if (tempActual >= _config.failsafes.max_internal_temp_limit_c || tempActual >= _config.crop.temp_crit_max) {
                req_extractor = true;
                req_cooler = true;
                proxEstado = EstadoOperacional::EMERGENCIA;
            } 
            // 2. Toxicidad de Gases (CO2)
            else if (co2Actual >= _config.crop.co2_crit_max) {
                req_extractor = true;
                if (proxEstado == EstadoOperacional::NORMAL) proxEstado = EstadoOperacional::NORMAL; // O EMERGENCIA
            }
            // 3. Frío Extremo o Demanda de Calor
            else if (tempActual <= _config.crop.temp_ideal_min) {
                req_heater = true;
                proxEstado = EstadoOperacional::CALENTANDO;
            }
            // 4. Demanda de Frío
            else if (tempActual >= _config.crop.temp_ideal_max) {
                req_cooler = true;
                req_extractor = true; // Refrescar 
                proxEstado = EstadoOperacional::ENFRIANDO;
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
        _ejecutarAccion(PIN_HEATER, _actuadores.heater_ON, req_heater, _last_heater_switch, now, false);
        _ejecutarAccion(PIN_FOGGER, _actuadores.fogger_ON, req_fogger, _last_fogger_switch, now, false);
        
        // Peltier exento de filtro de tiempo
        _ejecutarAccion(PIN_COOLER, _actuadores.cooler_ON, req_cooler, _last_cooler_switch, now, true);
        
        // Luz exenta de filtro de tiempo
        _ejecutarAccion(PIN_LIGHT, _actuadores.light_ON, req_light, _last_light_switch, now, true);
    }
}
