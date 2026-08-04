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
// loop()
// ============================================================
void FirebaseManager::loop() {
    if (Firebase.ready()) {
        _conectado = true;
        if (!_streamConfigurado) {
            if (configurarStreams()) {
                _streamConfigurado = true;
            }
        }
        
        // Si el stream levantó la bandera, forzamos un envío de telemetría de inmediato
        if (_forzarTelemetria) {
            _forzarTelemetria = false;
            publicarTelemetria();
        }
    } else {
        _conectado = false;
        _streamConfigurado = false; // Forzar reconfiguración al reconectar
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

    if (s.dhtOk) {
        json.set("temp_aire", s.tempAmb);
        json.set("humedad_aire", s.humAmb);
        json.set("vpd", s.vpd);
    }
    if (s.analogicoOk) {
        json.set("sensor_analogico", s.valorAnalogico);
    }
    if (s.co2Ok) {
        json.set("co2_ppm", s.co2);
    }

    json.set("heater_on", a.heater_ON);
    json.set("fogger_on", a.fogger_ON);
    json.set("extractor_on", a.extractor_ON);
    json.set("light_on", a.light_ON);
    json.set("dht_ok", s.dhtOk);
    json.set("analogico_ok", s.analogicoOk);

    // Enviar el estado actual del modo de operación al Dashboard
    json.set("modo_operacion", _hw.getModoOperacion() == ModoOperacion::AUTO ? "AUTO" : "MANUAL");

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
    
    // .sv/timestamp hace que los servidores de Firebase escriban la hora UNIX exacta
    json.set("timestamp", ".sv/timestamp");

    if (s.dhtOk) {
        json.set("temp_aire", s.tempAmb);
        json.set("humedad_aire", s.humAmb);
        json.set("vpd", s.vpd);
    }
    if (s.analogicoOk) {
        json.set("sensor_analogico", s.valorAnalogico);
    }
    if (s.co2Ok) {
        json.set("co2_ppm", s.co2);
    }

    json.set("heater_on", a.heater_ON);
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
        _instancia->_procesarPayloadStream(data.dataPath(), data.jsonString().length() > 0 ? data.jsonString() : data.stringData());
    }
}

void FirebaseManager::streamTimeoutCallback(bool timeout) {
    if (timeout) {
        Serial.println(F("[Firebase] Stream timeout, reanudando..."));
    }
}

void FirebaseManager::_procesarPayloadStream(const String& path, const String& data) {
    Serial.printf("[Firebase] Stream recibido - Path: %s, Data: %s\n", path.c_str(), data.c_str());
    
    DynamicJsonDocument doc(1024);
    DeserializationError error = deserializeJson(doc, data);
    
    if (!error) {
        if (doc.is<JsonObject>()) {
            if (doc.containsKey("modo_operacion")) {
                String modo = doc["modo_operacion"].as<String>();
                if (modo == "AUTO") _hw.setModoOperacion(ModoOperacion::AUTO);
                else if (modo == "MANUAL") _hw.setModoOperacion(ModoOperacion::MANUAL);
            }
            if (doc.containsKey("heater_on")) _hw.setHeater(doc["heater_on"]);
            if (doc.containsKey("fogger_on")) _hw.setFogger(doc["fogger_on"]);
            if (doc.containsKey("extractor_on")) _hw.setExtractor(doc["extractor_on"]);
            if (doc.containsKey("light_on")) _hw.setLight(doc["light_on"]);
        }
        
        if (path == "/reglas" || path == "/config") {
            String wrappedJson = "{\"reglas\":" + data + "}";
            _fm.guardarConfiguracionJson(wrappedJson);
            _hw.setConfiguracion(_fm.cargarConfiguracion());
            Serial.println(F("✅ [Firebase] Reglas recibidas (ruta específica) y aplicadas."));
        } else if (doc.is<JsonObject>() && doc.containsKey("reglas")) {
            _fm.guardarConfiguracionJson(data);
            _hw.setConfiguracion(_fm.cargarConfiguracion());
            Serial.println(F("✅ [Firebase] Reglas recibidas (raíz) y aplicadas."));
        }
    } else {
        String val = data;
        val.replace("\"", ""); 
        
        if (path.indexOf("modo_operacion") >= 0) {
            if (val == "AUTO") _hw.setModoOperacion(ModoOperacion::AUTO);
            else if (val == "MANUAL") _hw.setModoOperacion(ModoOperacion::MANUAL);
        } else if (path.indexOf("heater_on") >= 0) {
            _hw.setHeater(val == "true" || val == "1");
        } else if (path.indexOf("fogger_on") >= 0) {
            _hw.setFogger(val == "true" || val == "1");
        } else if (path.indexOf("extractor_on") >= 0) {
            _hw.setExtractor(val == "true" || val == "1");
        } else if (path.indexOf("light_on") >= 0) {
            _hw.setLight(val == "true" || val == "1");
        }
    }
    
    _forzarTelemetria = true;
}
