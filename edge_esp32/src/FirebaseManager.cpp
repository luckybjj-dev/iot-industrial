#include "FirebaseManager.h"

// ============================================================
// Puntero estático para callbacks
// Como las funciones de callback de Firebase (Streams) deben ser
// estáticas o globales, usamos un puntero a la instancia actual
// para poder acceder a los miembros no estáticos de la clase.
// ============================================================
FirebaseManager* FirebaseManager::_instancia = nullptr;

FirebaseManager::FirebaseManager(const String& deviceId, HardwareController& hw, FileManager& fm)
    : _deviceId(deviceId),
      _hw(hw),
      _fm(fm)
{
    _instancia = this;
}

// ============================================================
// begin()
// ============================================================
void FirebaseManager::begin() {
    Serial.println(F("[Firebase] Iniciando SDK..."));
    
    _config.database_url = FIREBASE_DATABASE_URL;
    _config.api_key = FIREBASE_API_KEY;
    _auth.user.email = FIREBASE_USER_EMAIL;
    _auth.user.password = FIREBASE_USER_PASSWORD;

    Firebase.begin(&_config, &_auth);
    Firebase.reconnectWiFi(true); // RESTAURADO: Permite que Firebase mantenga vivo el WiFi durante los handshakes SSL

    Serial.println(F("[Firebase] Autenticando (Asincrono)..."));
}

// ============================================================
// end()
// ============================================================
void FirebaseManager::end() {
    Serial.println(F("[Firebase] Deteniendo streams y liberando buffers TLS..."));
    _fbdoStream.clear();
    _fbdo.clear();
    _conectado = false;
    _streamConfigurado = false;
}

// ============================================================
// loop()
// ============================================================
void FirebaseManager::loop() {
    if (Firebase.ready()) {
        _conectado = true;
        _intervaloReconexionMs = 2000; // Restablecer intervalo al recuperar conexión
        if (!_streamConfigurado) {
            if (configurarStreams()) {
                _streamConfigurado = true;
            }
        }
        
        if (_streamPendiente) {
            _streamPendiente = false;
            _procesarPayloadStream(_streamPath, _streamData);
        }

        // Si el stream levantó la bandera, forzamos un envío de telemetría de inmediato
        if (_forzarTelemetria) {
            _forzarTelemetria = false;
            publicarTelemetria();
        }
    } else {
        _conectado = false;
        _streamConfigurado = false; // Forzar reconfiguración al reconectar

        unsigned long now = millis();
        if (now - _ultimoIntentoReconexion > _intervaloReconexionMs) {
            _ultimoIntentoReconexion = now;
            _intervaloReconexionMs = (_intervaloReconexionMs * 2 < MAX_INTERVALO_RECONEXION_MS) 
                                     ? (_intervaloReconexionMs * 2) 
                                     : MAX_INTERVALO_RECONEXION_MS;
            Serial.printf("[Firebase] Desconectado. Reintentando... Siguiente backoff en %lu ms\n", _intervaloReconexionMs);
        }
    }
}

bool FirebaseManager::isConnected() const {
    return _conectado;
}

// ============================================================
// publicarTelemetria()
// ============================================================
void FirebaseManager::publicarTelemetria() {
    if (!isConnected()) return;

    const SensorData&   s = _hw.getSensores();
    const ActuadorData& a = _hw.getActuadores();

    FirebaseJson json;

    struct timeval tv;
    gettimeofday(&tv, NULL);
    double epoch_ms = (double)tv.tv_sec * 1000.0 + (double)tv.tv_usec / 1000.0;
    json.set("timestamp", epoch_ms);

    if (s.ewmaInitialized) {
        json.set("vpd", (double)s.ewma_vpd);
    } else if (s.dhtOk || s.dht2Ok) {
        json.set("vpd", (double)s.vpd);
    }
    
    if (s.dhtOk) {
        json.set("temp_dht1", (double)s.tempAmb);
        json.set("hum_dht1", (double)s.humAmb);
    }
    if (s.dht2Ok) {
        json.set("temp_dht2", (double)s.tempAmb2);
        json.set("hum_dht2", (double)s.humAmb2);
    }
    if (s.ewmaInitialized && s.analogicoOk) {
        json.set("sensor_analogico", (double)s.ewma_sustrato);
    } else if (s.analogicoOk) {
        json.set("sensor_analogico", (double)s.valorAnalogico);
    }
    if (s.ewmaInitialized && s.co2Ok) {
        json.set("co2_ppm", (int)s.ewma_co2);
    } else if (s.co2Ok) {
        json.set("co2_ppm", (int)s.co2);
    }

    if (s.ewmaInitialized && s.tempPromedio != -999.0f) {
        json.set("temp_promedio", (double)s.ewma_temp);
    } else if (s.tempPromedio != -999.0f) {
        json.set("temp_promedio", (double)s.tempPromedio);
    }
    
    if (s.ewmaInitialized && s.humPromedio != -999.0f) {
        json.set("humedad_promedio", (double)s.ewma_hum);
    } else if (s.humPromedio != -999.0f) {
        json.set("humedad_promedio", (double)s.humPromedio);
    }

    json.set("heater_on", a.heater_ON);
    json.set("cooler_on", a.cooler_ON);
    json.set("fogger_on", a.fogger_ON);
    json.set("extractor_on", a.extractor_ON);
    json.set("light_on", a.light_ON);

    unsigned long now = millis();
    json.set("heater_locked", !a.heater_ON && _hw.isHeaterLocked(now));
    json.set("fogger_locked", !a.fogger_ON && _hw.isFoggerLocked(now));
    json.set("extractor_locked", !a.extractor_ON && _hw.isExtractorLocked(now));

    json.set("dht_ok", s.dhtOk);
    json.set("dht2_ok", s.dht2Ok);
    json.set("analogico_ok", s.analogicoOk);

    // Enviar el estado actual del modo de operación y la máquina de estados al Dashboard
    json.set("modo_operacion", _hw.getModoOperacion() == ModoOperacion::AUTO ? "AUTO" : "MANUAL");
    
    String estadoStr = "MONITOREO";
    switch (_hw.getEstadoOperacional()) {
        case EstadoOperacional::STANDBY: estadoStr = "MONITOREO"; break;
        case EstadoOperacional::NORMAL: estadoStr = "NORMAL"; break;
        case EstadoOperacional::CALENTANDO: estadoStr = "CALENTANDO"; break;
        case EstadoOperacional::ENFRIANDO: estadoStr = "ENFRIANDO"; break;
        case EstadoOperacional::HUMIDIFICANDO: estadoStr = "HUMIDIFICANDO"; break;
        case EstadoOperacional::SAFE_MODE: estadoStr = "SAFE_MODE"; break;
        case EstadoOperacional::EMERGENCIA: estadoStr = "EMERGENCIA"; break;
        case EstadoOperacional::MANUAL: estadoStr = "MANUAL"; break;
    }
    json.set("estado_operacional", estadoStr);

    String path = "/telemetry/" + _deviceId + "/data";
    
    // Usamos setJSON()
    if (!Firebase.setJSON(_fbdo, path, json)) {
        Serial.print(F("[Firebase] Error publicando telemetría: "));
        Serial.println(_fbdo.errorReason());
    }
}

// ============================================================
// publicarHistorial()
// ============================================================
void FirebaseManager::publicarHistorial() {
    if (!isConnected()) return;

    const SensorData&   s = _hw.getSensores();
    const ActuadorData& a = _hw.getActuadores();

    FirebaseJson json;
    
    // ESTÁNDAR INDUSTRIAL: El ESP32 genera su propio Timestamp vía NTP
    // Esto desacopla el hardware de la plataforma en la nube (Zero Tech Debt)
    struct timeval tv;
    gettimeofday(&tv, NULL);
    double epoch_ms = (double)tv.tv_sec * 1000.0 + (double)tv.tv_usec / 1000.0;
    json.set("timestamp", epoch_ms);

    if (s.ewmaInitialized) {
        json.set("vpd", (double)s.ewma_vpd);
    } else if (s.dhtOk || s.dht2Ok) {
        json.set("vpd", (double)s.vpd);
    }
    
    if (s.dhtOk) {
        json.set("temp_dht1", (double)s.tempAmb);
        json.set("hum_dht1", (double)s.humAmb);
    }
    if (s.dht2Ok) {
        json.set("temp_dht2", (double)s.tempAmb2);
        json.set("hum_dht2", (double)s.humAmb2);
    }
    if (s.ewmaInitialized && s.analogicoOk) {
        json.set("sensor_analogico", (double)s.ewma_sustrato);
    } else if (s.analogicoOk) {
        json.set("sensor_analogico", (double)s.valorAnalogico);
    }
    if (s.ewmaInitialized && s.co2Ok) {
        json.set("co2_ppm", (int)s.ewma_co2);
    } else if (s.co2Ok) {
        json.set("co2_ppm", (int)s.co2);
    }

    if (s.ewmaInitialized && s.tempPromedio != -999.0f) {
        json.set("temp_promedio", (double)s.ewma_temp);
    } else if (s.tempPromedio != -999.0f) {
        json.set("temp_promedio", (double)s.tempPromedio);
    }
    
    if (s.ewmaInitialized && s.humPromedio != -999.0f) {
        json.set("humedad_promedio", (double)s.ewma_hum);
    } else if (s.humPromedio != -999.0f) {
        json.set("humedad_promedio", (double)s.humPromedio);
    }

    json.set("heater_on", a.heater_ON);
    json.set("cooler_on", a.cooler_ON);
    json.set("fogger_on", a.fogger_ON);
    json.set("extractor_on", a.extractor_ON);
    json.set("light_on", a.light_ON);

    String path = "/history/" + _deviceId;
    
    // pushJSON() empuja un nuevo hijo con una clave autogenerada única
    if (Firebase.pushJSON(_fbdo, path, json)) {
        Serial.print(F("[Firebase] Historial publicado en: "));
        Serial.println(_fbdo.dataPath());
    } else {
        Serial.print(F("[Firebase] Error al publicar historial: "));
        Serial.println(_fbdo.errorReason());
    }
}

/**
 * @brief Configuración y apertura del canal bidireccional de Firebase (Stream).
 * @details Utiliza Server-Sent Events (SSE) para mantener una conexión persistente
 * de muy baja latencia. Permite reaccionar a comandos del dashboard (ej. encender/apagar manual)
 * sin necesidad de "polling", cumpliendo con el paradigma de reactividad estricta para IoT.
 */
bool FirebaseManager::configurarStreams() {
    // Escuchar comandos manuales y configuraciones en RTDB
    String streamPath = "/devices/" + _deviceId + "/commands";
    Serial.print(F("[Firebase] Preparando suscripciones futuras (Stream) en: "));
    Serial.println(streamPath);
    
    if (!Firebase.beginStream(_fbdoStream, streamPath)) {
        Serial.printf("[Firebase] Error configurando stream: %s\n", _fbdoStream.errorReason().c_str());
        return false;
    } else {
        Firebase.setStreamCallback(_fbdoStream, FirebaseManager::streamCallback, FirebaseManager::streamTimeoutCallback);
        Serial.println(F("[Firebase] Stream configurado exitosamente."));
        return true;
    }
}

void FirebaseManager::streamCallback(StreamData data) {
    if (_instancia) {
        String payload = data.jsonString();
        if (payload.length() == 0) {
            if (data.dataType() == "boolean") {
                payload = data.boolData() ? "true" : "false";
            } else if (data.dataType() == "int") {
                payload = String(data.intData());
            } else if (data.dataType() == "float" || data.dataType() == "double") {
                payload = String(data.floatData());
            } else {
                payload = data.stringData();
            }
        }
        _instancia->_streamPath = data.dataPath();
        _instancia->_streamData = payload;
        _instancia->_streamPendiente = true;
    }
}

void FirebaseManager::streamTimeoutCallback(bool timeout) {
    if (timeout) {
        Serial.println(F("[Firebase] Stream timeout, reanudando..."));
    }
}

/**
 * @brief Procesador del Payload del Stream Bidireccional (RTDB Downlink).
 * @details Interpreta los datos entrantes (primitivas o JSON complejos).
 * Actualiza la máquina de estados local, sobreescribe los targets del PID o fuerza
 * actuadores (Overrides manuales). Cumple con el pivote a Firebase RTDB,
 * reemplazando al obsoleto subscriber MQTT, inyectando los comandos directamente
 * en el HardwareController.
 */
void FirebaseManager::_procesarPayloadStream(const String& path, const String& data) {
    Serial.printf("[Firebase] Stream procesando en main loop - Path: %s, Data: %s\n", path.c_str(), data.c_str());
    
    DynamicJsonDocument doc(3072);
    DeserializationError error = deserializeJson(doc, data);
    
    if (!error && doc.is<JsonObject>()) {
        // Es un objeto JSON completo (por ejemplo, en el arranque o al enviar múltiples configuraciones)
        String modo = doc.containsKey("modo_operacion") ? doc["modo_operacion"].as<String>() : "";
        if (modo == "AUTO") {
            _hw.setModoOperacion(ModoOperacion::AUTO);
        } else if (modo == "MANUAL") {
            _hw.setModoOperacion(ModoOperacion::MANUAL);
            if (doc.containsKey("heater_on")) _hw.setHeater(doc["heater_on"] | false);
            if (doc.containsKey("cooler_on")) _hw.setCooler(doc["cooler_on"] | false);
            if (doc.containsKey("fogger_on")) _hw.setFogger(doc["fogger_on"] | false);
            if (doc.containsKey("extractor_on")) _hw.setExtractor(doc["extractor_on"] | false);
            if (doc.containsKey("light_on")) _hw.setLight(doc["light_on"] | false);
        }
        
        if (doc.containsKey("max_manual_time_ms")) {
            ConfiguracionCultivo cfg = _hw.getConfiguracion();
            cfg.max_manual_time_ms = doc["max_manual_time_ms"].as<unsigned long>();
            _hw.setConfiguracion(cfg);
        }
        
        if (doc.containsKey("activeProfileName") || doc.containsKey("crop")) {
            _fm.guardarConfiguracionJson(data);
            _hw.setConfiguracion(_fm.cargarConfiguracion());
            Serial.println(F("✅ [Firebase] Configuración de cultivo recibida y sincronizada en LittleFS + HardwareController."));
        } else if (path == "/crop" || path == "/config" || path.indexOf("crop") >= 0) {
            String wrappedJson = "{\"crop\":" + data + "}";
            _fm.guardarConfiguracionJson(wrappedJson);
            _hw.setConfiguracion(_fm.cargarConfiguracion());
            Serial.println(F("✅ [Firebase] CropProfile recibido (subruta) y aplicado a LittleFS + Control."));
        }
    } else {
        // Es un valor primitivo (boolean o string), o JSON inválido que asumimos como primitivo.
        // Firebase manda los strings con comillas, así que las removemos.
        String val = data;
        val.replace("\"", ""); 
        val.trim(); // MUY IMPORTANTE: Eliminar saltos de linea o espacios
        
        if (path.indexOf("activeProfileName") >= 0) {
            if (val == "null" || val.length() == 0 || val == "STANDBY" || val == "NONE") {
                ConfiguracionCultivo cfg = _hw.getConfiguracion();
                cfg.crop_profile = "STANDBY";
                _hw.setConfiguracion(cfg);
                Serial.println(F("ℹ️ [Firebase] activeProfileName restablecido. Modo STANDBY / MONITOREO activado."));
            } else {
                ConfiguracionCultivo cfg = _hw.getConfiguracion();
                cfg.crop_profile = val;
                _hw.setConfiguracion(cfg);
                Serial.printf("✅ [Firebase] activeProfileName actualizado: %s\n", val.c_str());
            }
        } else if (path.indexOf("modo_operacion") >= 0) {
            if (val == "AUTO") _hw.setModoOperacion(ModoOperacion::AUTO);
            else if (val == "MANUAL") _hw.setModoOperacion(ModoOperacion::MANUAL);
        } else if (path.indexOf("heater_on") >= 0) {
            _hw.setHeater(val == "true" || val == "1");
        } else if (path.indexOf("cooler_on") >= 0) {
            _hw.setCooler(val == "true" || val == "1");
        } else if (path.indexOf("fogger_on") >= 0) {
            _hw.setFogger(val == "true" || val == "1");
        } else if (path.indexOf("extractor_on") >= 0) {
            _hw.setExtractor(val == "true" || val == "1");
        } else if (path.indexOf("light_on") >= 0) {
            _hw.setLight(val == "true" || val == "1");
        } else if (path.indexOf("max_manual_time_ms") >= 0) {
            ConfiguracionCultivo cfg = _hw.getConfiguracion();
            cfg.max_manual_time_ms = val.toInt();
            _hw.setConfiguracion(cfg);
        }
    }
    
    _forzarTelemetria = true;
}
