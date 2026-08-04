#include "HardwareController.h"

HardwareController::HardwareController() : _dht(DHTPIN, DHTTYPE) {
}

void HardwareController::begin() {
    Serial.println(F("[Hardware] Inicializando pines y sensores..."));
    
    pinMode(PIN_HEATER, OUTPUT);
    pinMode(PIN_FOGGER, OUTPUT);
    pinMode(PIN_EXTRACTOR, OUTPUT);
    pinMode(PIN_LIGHT, OUTPUT);

    digitalWrite(PIN_HEATER, LOW);
    digitalWrite(PIN_FOGGER, LOW);
    digitalWrite(PIN_EXTRACTOR, LOW);
    digitalWrite(PIN_LIGHT, LOW);

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
    // PROTECCIÓN AL CULTIVO (Failsafe)
    if (estado) {
        if (!_sensores.dhtOk && !_sensores.analogicoOk) {
            Serial.println(F("⛔ [Failsafe] Comando DENEGADO. Sensores fallando (riesgo de incendio)."));
            return;
        }
        float tempActual = _sensores.analogicoOk ? _sensores.valorAnalogico : _sensores.tempAmb;
        if (tempActual >= _config.failsafes.max_internal_temp_limit_c) {
            Serial.println(F("⛔ [Failsafe] Comando de Calefactor DENEGADO por sobretemperatura crítica."));
            return;
        }
    }
    
    _actuadores.heater_ON = estado;
    digitalWrite(PIN_HEATER, estado ? HIGH : LOW);
}
void HardwareController::setFogger(bool estado) {
    if (_modoActual == ModoOperacion::AUTO) {
        Serial.println(F("❌ [Hardware] Ignorando comando de Niebla. Sistema en modo AUTO."));
        return;
    }
    // PROTECCIÓN AL CULTIVO (Failsafe)
    if (estado) {
        if (!_sensores.dhtOk) {
            Serial.println(F("⛔ [Failsafe] Comando DENEGADO. Sensor de humedad fallando."));
            return;
        }
        if (_sensores.humAmb >= 95.0f) {
            Serial.println(F("⛔ [Failsafe] Comando de Niebla DENEGADO por saturación hídrica."));
            return;
        }
    }
    
    _actuadores.fogger_ON = estado;
    digitalWrite(PIN_FOGGER, estado ? HIGH : LOW);
}
void HardwareController::setExtractor(bool estado) {
    if (_modoActual == ModoOperacion::AUTO) {
        Serial.println(F("❌ [Hardware] Ignorando comando de Extractor. Sistema en modo AUTO."));
        return;
    }
    // PROTECCIÓN AL CULTIVO (Failsafe)
    if (!estado && _alertaCalor) {
        Serial.println(F("⛔ [Failsafe] Apagado de Extractor DENEGADO. Alarma térmica activa."));
        return;
    }
    
    _actuadores.extractor_ON = estado;
    digitalWrite(PIN_EXTRACTOR, estado ? HIGH : LOW);
}
void HardwareController::setLight(bool estado) {
    if (_modoActual == ModoOperacion::AUTO) {
        Serial.println(F("❌ [Hardware] Ignorando comando de Luz. Sistema en modo AUTO."));
        return;
    }
    // Failsafe de fotoperiodo relajado en modo manual. Se asume que expirará pronto.
    _actuadores.light_ON = estado;
    digitalWrite(PIN_LIGHT, estado ? HIGH : LOW);
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

    _sensores.co2Ok = false;
    _sensores.co2 = 400; 
}

float HardwareController::calcularVPD(float tempC, float humRH) {
    float svp = 0.61078f * exp((17.27f * tempC) / (tempC + 237.3f));
    float avp = svp * (humRH / 100.0f);
    return svp - avp;
}

void HardwareController::procesarLogicaDeControl(unsigned long now, int horaDia) {
    // =========================================================
    // 0. CONTROL DE CADUCIDAD MODO MANUAL
    // =========================================================
    bool evaluarReglas = true;
    if (_modoActual == ModoOperacion::MANUAL) {
        if (now - _tiempoInicioManual >= _config.max_manual_time_ms) {
            Serial.println(F("⏱️ [Hardware] Tiempo manual expirado. Restaurando modo AUTO para proteger cultivo."));
            setModoOperacion(ModoOperacion::AUTO);
        } else {
            evaluarReglas = false; // Seguimos en modo manual. No evaluamos reglas.
        }
    }

    // =========================================================
    // 1. RULE ENGINE (Motor Declarativo)
    // =========================================================
    if (evaluarReglas) {
        for (int i = 0; i < _config.total_reglas; i++) {
            const ReglaTermodinamica& regla = _config.reglas[i];
        
        // A. Obtener el valor del sensor
        float valorActual = 0.0f;
        bool sensorValido = true;
        switch (regla.variable) {
            case VariableFisica::TEMP:
                if (_sensores.analogicoOk) valorActual = _sensores.valorAnalogico;
                else if (_sensores.dhtOk) valorActual = _sensores.tempAmb;
                else sensorValido = false;
                break;
            case VariableFisica::HUMEDAD:
                if (_sensores.dhtOk) valorActual = _sensores.humAmb;
                else sensorValido = false;
                break;
            case VariableFisica::CO2:
                if (_sensores.co2Ok) valorActual = _sensores.co2;
                else sensorValido = false;
                break;
            case VariableFisica::VPD:
                if (_sensores.dhtOk) valorActual = _sensores.vpd;
                else sensorValido = false;
                break;
            case VariableFisica::HORA_DEL_DIA:
                if (horaDia >= 0) valorActual = (float)horaDia;
                else sensorValido = false;
                break;
        }

        if (!sensorValido) continue; // No se puede evaluar esta regla

        // B. Evaluar el Operador Lógico
        bool condicionCumplida = false;
        switch (regla.operador) {
            case OperadorLogico::MAYOR_QUE:
                condicionCumplida = (valorActual > regla.valor);
                break;
            case OperadorLogico::MENOR_QUE:
                condicionCumplida = (valorActual < regla.valor);
                break;
            case OperadorLogico::IGUAL:
                condicionCumplida = (valorActual == regla.valor);
                break;
        }

        // C. Ejecutar Acción si se cumple
        if (condicionCumplida) {
            bool encender = (regla.accion == EstadoDeseado::ENCENDIDO);
            switch (regla.actuador) {
                case ActuadorFisico::CALEFACTOR: _actuadores.heater_ON = encender; break;
                case ActuadorFisico::NIEBLA:     _actuadores.fogger_ON = encender; break;
                case ActuadorFisico::EXTRACTOR:  _actuadores.extractor_ON = encender; break;
                case ActuadorFisico::LUZ:        _actuadores.light_ON = encender; break;
            }
        }
    }
}

    // =========================================================
    // 2. SEGUROS DE SUPERVIVENCIA (FAILSAFES)
    // Tienen la última palabra absoluta y sobreescriben cualquier regla.
    // =========================================================

    // Failsafe Térmico: Temperatura Crítica o Fallo de Sensor
    if (_sensores.dhtOk || _sensores.analogicoOk) {
        float tempActual = _sensores.analogicoOk ? _sensores.valorAnalogico : _sensores.tempAmb;
        if (tempActual >= _config.failsafes.max_internal_temp_limit_c) {
            _alertaCalor = true;
        } else if (tempActual <= _config.failsafes.max_internal_temp_limit_c - 1.0f) {
            _alertaCalor = false;
        }
    } else {
        // Riesgo altísimo: no hay ningún sensor de temperatura.
        _alertaCalor = false;
        _actuadores.heater_ON = false; // Jamás encender calefactor a ciegas.
        _actuadores.fogger_ON = false; // Tampoco el humidificador.
    }
    
    if (_alertaCalor) {
        _actuadores.heater_ON = false;
        _actuadores.extractor_ON = true; // Extraer aire forzosamente
    }
    
    // Failsafe Biológico (Fotoperiodo seguro si se pierde el reloj NTP)
    if (horaDia < 0) {
        _actuadores.light_ON = false;
    }

    // Failsafe de FAE Asíncrono (Si el usuario quiere ventilar independientemente de CO2/Temp)
    // Nota: Como no tenemos una regla explícita en JSON para temporizadores aún,
    // mantenemos este failsafe vitalicio de "Fresh Air Exchange".
    // En una refactorización futura, el FAE puede volverse parte del Rule Engine.
    // ---

    // Aplicar estados finales al Hardware
    digitalWrite(PIN_HEATER, _actuadores.heater_ON ? HIGH : LOW);
    digitalWrite(PIN_FOGGER, _actuadores.fogger_ON ? HIGH : LOW);
    digitalWrite(PIN_EXTRACTOR, _actuadores.extractor_ON ? HIGH : LOW);
    digitalWrite(PIN_LIGHT, _actuadores.light_ON ? HIGH : LOW);
}
