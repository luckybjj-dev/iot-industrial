// ============================================================
// MqttManager.cpp
// ============================================================
#include "MqttManager.h"

// Inicialización del puntero estático para el bridge del callback
MqttManager* MqttManager::_instancia = nullptr;

MqttManager::MqttManager(const char* brokerHost, int brokerPort,
                         const String& deviceId,
                         HardwareController& hw)
    : _brokerHost(brokerHost),
      _brokerPort(brokerPort),
      _deviceId(deviceId),
      _hw(hw),
      _client(_espClient)
{
    _instancia = this; // Guarda la referencia para el callback estático
}

void MqttManager::begin() {
    // Tópicos dinámicos basados en el Device ID (MAC Address)
    _topicTelemetria = "proyecto_iot/edge/" + _deviceId + "/telemetria";
    _topicEstado     = "proyecto_iot/edge/" + _deviceId + "/estado";
    _topicComandos   = "proyecto_iot/edge/" + _deviceId + "/comandos";
    _topicLogs       = "proyecto_iot/edge/" + _deviceId + "/logs";

    _client.setServer(_brokerHost, _brokerPort);
    _client.setCallback(MqttManager::onMessageStatic);

    Serial.println(F("[MQTT] Manager inicializado."));
    Serial.print(F("[MQTT] Topic telemetria: "));
    Serial.println(_topicTelemetria);
}

bool MqttManager::conectar() {
    if (_client.connected()) return true;

    Serial.println(F("[MQTT] Intentando conectar al Broker..."));

    // Conexión con LWT (Last Will and Testament)
    bool conectado = _client.connect(
        _deviceId.c_str(),
        "", "",
        _topicEstado.c_str(),
        1, true, "OFFLINE"
    );

    if (conectado) {
        _client.publish(_topicEstado.c_str(), "ONLINE - Modo Remoto Principal", true);
        _client.subscribe(_topicComandos.c_str());
        _client.subscribe("proyecto_iot/servidor/latido");
        Serial.println(F("[MQTT] Conectado con LWT. Suscripciones activas."));
    } else {
        Serial.print(F("[MQTT] Fallo de conexion. Estado: "));
        Serial.println(_client.state());
    }

    return conectado;
}

void MqttManager::loop() {
    _client.loop();
}

void MqttManager::evaluarLatido(unsigned long now) {
    if (!_servidorCaido && (now - _ultimoLatidoServidor > HEARTBEAT_TIMEOUT_MS)) {
        _servidorCaido = true;
        Serial.println(F("[MQTT] ALERTA: Servidor Node.js caido (No hay latidos)."));
    }
}

void MqttManager::publicarTelemetria() {
    if (!_client.connected()) return;

    const SensorData&   s = _hw.getSensores();
    const ActuadorData& a = _hw.getActuadores();

    // --- Log remoto de sensores ---
    if (s.dhtOk) {
        char bufDht[80];
        snprintf(bufDht, sizeof(bufDht),
                 "[SENSOR] Ambiente -> Temp: %.1f C | Hum: %.1f %%",
                 s.tempAmb, s.humAmb);
        log(bufDht);
    }
    if (s.sustratoOk) {
        char bufNtc[60];
        snprintf(bufNtc, sizeof(bufNtc),
                 "[SENSOR] Sustrato -> Temp NTC: %.1f C", s.tempSustrato);
        log(bufNtc);
    }

    // --- Serialización JSON del payload de telemetría ---
    StaticJsonDocument<200> doc;

    if (s.dhtOk) {
        doc[F("temp_ambiente")] = s.tempAmb;
        doc[F("humedad")]       = s.humAmb;
    } else {
        doc[F("temp_ambiente")] = (char*)0; // null explícito
        doc[F("humedad")]       = (char*)0;
    }

    if (s.sustratoOk) {
        doc[F("temp_sustrato")] = s.tempSustrato;
    } else {
        doc[F("temp_sustrato")] = (char*)0;
    }

    doc[F("humidificador_on")] = a.humidificadorON;
    doc[F("ventilador_on")]    = a.ventiladorON;
    doc[F("manta_on")]         = a.mantaON;
    doc[F("dht_ok")]           = s.dhtOk;
    doc[F("ntc_ok")]           = s.sustratoOk;

    char payload[200];
    serializeJson(doc, payload);
    _client.publish(_topicTelemetria.c_str(), payload);
}

void MqttManager::log(const char* mensaje) {
    Serial.println(mensaje);
    if (_client.connected()) {
        _client.publish(_topicLogs.c_str(), mensaje);
    }
}

// -------------------------------------------------------
// Callback estático: bridge hacia la instancia concreta
// -------------------------------------------------------
void MqttManager::onMessageStatic(char* topic, byte* payload, unsigned int length) {
    if (_instancia) {
        _instancia->_procesarMensaje(topic, payload, length);
    }
}

// -------------------------------------------------------
// Lógica real del callback de MQTT
// -------------------------------------------------------
void MqttManager::_procesarMensaje(char* topic, byte* payload, unsigned int length) {
    String topicStr(topic);

    // --- Intercepción del latido inverso del servidor ---
    if (topicStr == F("proyecto_iot/servidor/latido")) {
        _ultimoLatidoServidor = millis();
        _servidorCaido = false;
        return; // No procesamos más, ahorramos ciclos de CPU
    }

    // --- Procesamiento de comandos de actuadores ---
    String msg;
    msg.reserve(length);
    for (unsigned int i = 0; i < length; i++) {
        msg += (char)payload[i];
    }

    char logBuf[80];
    snprintf(logBuf, sizeof(logBuf), "[MQTT] Comando en: %s", topic);
    log(logBuf);

    StaticJsonDocument<200> doc;
    DeserializationError err = deserializeJson(doc, msg);
    if (err) {
        Serial.print(F("[MQTT] JSON invalido: "));
        Serial.println(err.c_str());
        return;
    }

    // Inyección de dependencia inversa: el callback actúa sobre
    // HardwareController vía métodos públicos (sin acceso a sus privados)
    if (doc.containsKey(F("manta_on"))) {
        bool estado = doc[F("manta_on")];
        _hw.setManta(estado);
        _hw.setModoManual(true);
        snprintf(logBuf, sizeof(logBuf), "[CMD] Manta: %s", estado ? "ON" : "OFF");
        log(logBuf);
    }
    if (doc.containsKey(F("humidificador_on"))) {
        bool estado = doc[F("humidificador_on")];
        _hw.setHumidificador(estado);
        _hw.setModoManual(true);
        snprintf(logBuf, sizeof(logBuf), "[CMD] Humidificador: %s", estado ? "ON" : "OFF");
        log(logBuf);
    }
    if (doc.containsKey(F("ventilador_on"))) {
        bool estado = doc[F("ventilador_on")];
        _hw.setVentilador(estado);
        _hw.setModoManual(true);
        snprintf(logBuf, sizeof(logBuf), "[CMD] Ventilador: %s", estado ? "ON" : "OFF");
        log(logBuf);
    }
    if (doc.containsKey(F("modo_manual"))) {
        bool modo = doc[F("modo_manual")];
        _hw.setModoManual(modo);
        snprintf(logBuf, sizeof(logBuf), "[CMD] Modo manual: %s", modo ? "ACTIVO" : "INACTIVO");
        log(logBuf);
    }
}
