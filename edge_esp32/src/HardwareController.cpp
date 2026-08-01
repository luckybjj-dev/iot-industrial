#include "HardwareController.h"

HardwareController::HardwareController() : _dht(DHTPIN, DHTTYPE) {
    // Constructor
}

void HardwareController::begin() {
    Serial.println(F("[Hardware] Inicializando pines y sensores..."));
    
    // Configuración de pines como Salida
    pinMode(PIN_HEATER, OUTPUT);
    pinMode(PIN_FOGGER, OUTPUT);
    pinMode(PIN_EXTRACTOR, OUTPUT);
    pinMode(PIN_LIGHT, OUTPUT);

    // Estado seguro inicial (Apagados, asumiendo lógica directa 3.3V)
    digitalWrite(PIN_HEATER, LOW);
    digitalWrite(PIN_FOGGER, LOW);
    digitalWrite(PIN_EXTRACTOR, LOW);
    digitalWrite(PIN_LIGHT, LOW);

    // Inicializar sensores
    _dht.begin();
    // TODO: Inicializar MH-Z19 (Serial2) cuando llegue el hardware
    
    Serial.println(F("✅ [Hardware] Inicializado correctamente."));
}

void HardwareController::setConfiguracion(const ConfiguracionCultivo& config) {
    _config = config;
}

void HardwareController::setModoManual(bool modo) {
    _modoManualRemoto = modo;
    if (modo) {
        Serial.println(F("⚠️ [Hardware] Modo MANUAL activado por MQTT. Lógica local suspendida."));
    } else {
        Serial.println(F("✅ [Hardware] Modo AUTO restaurado. Retomando control termodinámico."));
    }
}

// Sobrecarga de comandos manuales
void HardwareController::setHeater(bool estado) {
    _actuadores.heater_ON = estado;
    digitalWrite(PIN_HEATER, estado ? HIGH : LOW);
}
void HardwareController::setFogger(bool estado) {
    _actuadores.fogger_ON = estado;
    digitalWrite(PIN_FOGGER, estado ? HIGH : LOW);
}
void HardwareController::setExtractor(bool estado) {
    _actuadores.extractor_ON = estado;
    digitalWrite(PIN_EXTRACTOR, estado ? HIGH : LOW);
}
void HardwareController::setLight(bool estado) {
    _actuadores.light_ON = estado;
    digitalWrite(PIN_LIGHT, estado ? HIGH : LOW);
}

void HardwareController::leerSensores() {
    // Lectura DHT22 (Sensor 1)
    float t = _dht.readTemperature();
    float h = _dht.readHumidity();

    if (isnan(t) || isnan(h)) {
        _sensores.dhtOk = false;
        Serial.println(F("❌ [Sensor] Fallo al leer DHT22"));
    } else {
        _sensores.dhtOk = true;
        _sensores.tempAmb = t;
        _sensores.humAmb = h;
        // Calcular e inyectar el VPD tras obtener Temperatura y Humedad válidas
        _sensores.vpd = calcularVPD(t, h);
    }

    // Lectura Analógica (Sensor 2)
    int valorADC = analogRead(PIN_ANALOGICO);
    if (valorADC > 0 && valorADC < 4095) { // Rango razonable para descartar pin flotante
        _sensores.analogicoOk = true;
        
        /* 
         * Ecuación Steinhart-Hart simple
         * Se utiliza para calcular la temperatura a partir de un termistor NTC.
         * En lugar de usar complejas tablas de calibración (Look-Up Tables), 
         * usamos matemáticas para modelar la curva no lineal de resistencia vs temperatura.
         */
        float resistencia = NTC_R_SERIE / (4095.0f / (float)valorADC - 1.0f);
        float tempK = 1.0f / (1.0f / (NTC_T_NOMINAL + 273.15f) + (1.0f / NTC_BETA) * log(resistencia / NTC_R_NOMINAL));
        _sensores.valorAnalogico = tempK - 273.15f; 
    } else {
        _sensores.analogicoOk = false;
    }

    // Dummy CO2 por ahora
    _sensores.co2Ok = false;
    _sensores.co2 = 400; 
}

/*
 * CÁLCULO DEL VPD (Déficit de Presión de Vapor)
 * El VPD mide cuánta "sed" tiene el aire. 
 * Se calcula usando la Ecuación de Tetens para encontrar la Presión de 
 * Vapor de Saturación (SVP), que es la cantidad máxima de vapor de agua 
 * que el aire a una temperatura (tempC) puede retener.
 * Luego se calcula la Presión de Vapor Actual (AVP) aplicando la humedad 
 * relativa (humRH) al SVP. 
 * El resultado (SVP - AVP) nos da el Déficit en kilopascales (kPa).
 * Valores óptimos de VPD varían según la etapa (vegetativa, floración, etc.).
 */
float HardwareController::calcularVPD(float tempC, float humRH) {
    // Ecuación de Tetens para SVP
    float svp = 0.61078f * exp((17.27f * tempC) / (tempC + 237.3f));
    float avp = svp * (humRH / 100.0f);
    return svp - avp;
}

/*
 * LÓGICA DE CONTROL TERMODINÁMICO (Máquina de estados para actuadores)
 * Esta función es el "cerebro" reactivo del sistema. Actúa como un bucle de
 * control (parecido a un controlador Bang-Bang o control de encendido/apagado
 * con histéresis). Evalúa las lecturas actuales frente a las metas y decide 
 * qué hardware accionar.
 */
void HardwareController::procesarLogicaDeControl(unsigned long now, int horaDia) {
    // Si estamos en modo manual, evitamos sobrescribir los estados 
    // controlados remotamente o por un operador de planta.
    if (_modoManualRemoto) return;

    // =========================================================
    // 1. RELE HEATER (Control Térmico / Calefacción)
    // =========================================================
    /*
     * Lógica con Histéresis Térmica:
     * El concepto de histéresis evita que el relé "parpadee" encendiéndose 
     * y apagándose constantemente cuando la temperatura ronda el umbral, 
     * lo cual destruiría la vida útil del hardware. 
     * - Enciende cuando T < Meta - Histéresis.
     * - Apaga cuando T >= Meta.
     */
    // Usamos el termistor de sustrato si está, o el ambiental (DHT) como fallback.
    if (_sensores.analogicoOk) {
        if (_sensores.valorAnalogico < _config.climate.temp_target_c - _config.climate.temp_hysteresis) {
            _actuadores.heater_ON = true;
        }
        if (_sensores.valorAnalogico >= _config.climate.temp_target_c) {
            _actuadores.heater_ON = false;
        }
    } else if (_sensores.dhtOk) {
        if (_sensores.tempAmb < _config.climate.temp_target_c - _config.climate.temp_hysteresis) {
            _actuadores.heater_ON = true;
        }
        if (_sensores.tempAmb >= _config.climate.temp_target_c) {
            _actuadores.heater_ON = false;
        }
    } else {
        _actuadores.heater_ON = false; // Failsafe (Apagar en caso de fallo del sensor para evitar sobrecalentamiento e incendio)
    }
    digitalWrite(PIN_HEATER, _actuadores.heater_ON ? HIGH : LOW);


    // =========================================================
    // 2. RELE FOGGER (Control Hídrico / Humedad)
    // =========================================================
    /*
     * Lógica con Histéresis Hídrica:
     * Similar a la temperatura. El humidificador ultrasónico inyecta
     * agua atomizada al aire hasta alcanzar el Target y no vuelve a prender 
     * hasta que cae por debajo del Target - Histéresis.
     */
    if (_sensores.dhtOk) {
        if (_sensores.humAmb < _config.climate.humidity_target_pct - _config.climate.humidity_hysteresis) {
            _actuadores.fogger_ON = true;
        }
        if (_sensores.humAmb >= _config.climate.humidity_target_pct) {
            _actuadores.fogger_ON = false;
        }
    } else {
        _actuadores.fogger_ON = false; // Failsafe (Evitar inundación)
    }
    digitalWrite(PIN_FOGGER, _actuadores.fogger_ON ? HIGH : LOW);


    // =========================================================
    // 3. RELE EXTRACTOR (Control de Gases / FAE / Calor Crítico)
    // =========================================================
    /*
     * El extractor obedece a un sistema de múltiples prioridades, actuando
     * por ciclos, por calidad de aire o como mecanismo de seguridad.
     */
     
    // Regla 1: Control FAE Asíncrono (Fresh Air Exchange)
    // Se ejecuta cada 'X' minutos por una duración de 'Y' segundos,
    // utilizando millis() para no bloquear el procesador (no usar delay).
    long intervaloMs = _config.ventilation.fae_interval_min * 60000L;
    long duracionMs = _config.ventilation.fae_duration_sec * 1000L;
    
    if (!_ventiladorEnCiclo && (now - _ultimoCicloVentilador >= intervaloMs)) {
        _ventiladorEnCiclo = true;
        _ultimoCicloVentilador = now;
    }
    if (_ventiladorEnCiclo && (now - _ultimoCicloVentilador >= duracionMs)) {
        _ventiladorEnCiclo = false;
    }
    _actuadores.extractor_ON = _ventiladorEnCiclo;

    // Regla 2: CO2 Directo (Prioridad media)
    // Si hay exceso de CO2, encender extractor para purgar el aire 
    // independientemente del ciclo FAE.
    if (_sensores.co2Ok) {
        if (_sensores.co2 > _config.climate.co2_max_ppm) {
            _actuadores.extractor_ON = true;
        }
    }

    // Regla 3: Failsafe Térmico (Prioridad absoluta - Supervivencia)
    // Si la temperatura supera el límite crítico, forzamos la extracción 
    // para expulsar el aire caliente y salvar el cultivo, ignorando todo lo demás.
    if (_sensores.dhtOk) {
        if (_sensores.tempAmb >= _config.failsafes.max_internal_temp_limit_c) {
            _alertaCalor = true;
        } else if (_sensores.tempAmb <= _config.failsafes.max_internal_temp_limit_c - 1.0f) {
            _alertaCalor = false; // Tiene una ligera histéresis fija de 1ºC para salir de la alarma
        }
    } else {
        _alertaCalor = false;
    }
    
    if (_alertaCalor) {
        _actuadores.extractor_ON = true; // Overwrite de supervivencia (override a estado true)
    }

    digitalWrite(PIN_EXTRACTOR, _actuadores.extractor_ON ? HIGH : LOW);


    // =========================================================
    // 4. RELE LIGHT (Fotoperiodo / NTP)
    // =========================================================
    /*
     * Control del ciclo circadiano del cultivo basado en la hora del día.
     * Si no se pudo obtener la hora desde internet (NTP), se prefiere 
     * mantener apagado (failsafe biológico).
     */
    // Validar hora del día (0-23). Si es -1, significa que no hay conexión NTP u hora válida.
    if (horaDia >= 0) {
        // Lógica simplificada: Luz encendida desde las 08:00 hrs por N horas
        // En MVP 2 esto puede ser una matriz hora-a-hora
        int horaInicio = 8;
        int horasLuz = 12; // Valor hardcodeado temporal hasta añadirlo al config o dejarlo en 12h
        
        int horaFin = (horaInicio + horasLuz) % 24;
        
        // Manejo lógico en caso de que las horas pasen la medianoche.
        if (horaInicio < horaFin) {
            _actuadores.light_ON = (horaDia >= horaInicio && horaDia < horaFin);
        } else { // Caso de cruce de medianoche (Ej: Inicio 18:00, Fin 06:00)
            _actuadores.light_ON = (horaDia >= horaInicio || horaDia < horaFin);
        }
    } else {
        // Failsafe Biológico: Sin hora segura, apagamos para no alterar el ritmo biológico indefinidamente.
        // Evita estresar plantas dejándolas 24hs con luz si el WiFi se cae.
        _actuadores.light_ON = false;
    }
    
    digitalWrite(PIN_LIGHT, _actuadores.light_ON ? HIGH : LOW);
}
