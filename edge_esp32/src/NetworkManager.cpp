// ============================================================
// NetworkManager.cpp
// ============================================================
#include "NetworkManager.h"

NetworkManager::NetworkManager(const char* ssid, const char* password, const String& deviceId)
    : _ssid(ssid), _password(password), _deviceId(deviceId) {}

void NetworkManager::begin() {
    Serial.println(F("[NET] Iniciando en Modo Cliente (STA)..."));
    WiFi.mode(WIFI_STA);
    WiFi.begin(_ssid, _password);

    int intentos = 0;
    while (WiFi.status() != WL_CONNECTED && intentos < 20) {
        delay(500);
        Serial.print(F("."));
        intentos++;
    }
    Serial.println();

    if (WiFi.status() == WL_CONNECTED) {
        Serial.print(F("[NET] Enlace establecido. IP: "));
        Serial.println(WiFi.localIP());
    } else {
        Serial.println(F("[NET] Router inalcanzable. Levantando AP de Rescate..."));
        WiFi.mode(WIFI_AP_STA);
        WiFi.softAP("ESP32_RESCATE_MOTOR1", "admin1234");
        _conexionPerdida = true;
        Serial.print(F("[NET] AP Failsafe activo. IP: "));
        Serial.println(WiFi.softAPIP());
    }
}

void NetworkManager::beginOta() {
    ArduinoOTA.setHostname(_deviceId.c_str());

    ArduinoOTA.onStart([]() {
        String type = (ArduinoOTA.getCommand() == U_FLASH) ? "sketch" : "filesystem";
        Serial.print(F("[OTA] Iniciando actualizacion: "));
        Serial.println(type);
    });
    ArduinoOTA.onEnd([]() {
        Serial.println(F("[OTA] Finalizada. Reiniciando..."));
    });
    ArduinoOTA.onProgress([](unsigned int progress, unsigned int total) {
        Serial.printf("[OTA] Progreso: %u%%\r", (progress / (total / 100)));
    });
    ArduinoOTA.onError([](ota_error_t error) {
        Serial.printf("[OTA Error %u]\n", error);
    });

    ArduinoOTA.begin();
    Serial.println(F("[OTA] Escuchando actualizaciones por aire..."));
}

void NetworkManager::handle() {
    ArduinoOTA.handle();
}

bool NetworkManager::intentarReconexion(unsigned long now) {
    if (now - _ultimoIntentoRed <= 10000) return false;
    _ultimoIntentoRed = now;

    if (WiFi.status() != WL_CONNECTED) {
        Serial.println(F("[NET] Forzando reconexion WiFi..."));
        WiFi.disconnect();
        WiFi.begin(_ssid, _password);
        return true;
    }
    // WiFi OK pero MQTT no conectado: señal para que MqttManager intente conectarse
    return true;
}

void NetworkManager::onMqttConnected() {
    if (_conexionPerdida) {
        _conexionPerdida = false;
        _mqttConectado   = true;
        Serial.println(F("[NET] Conexion recuperada. Apagando AP de Rescate."));
        WiFi.softAPdisconnect(true);
        WiFi.mode(WIFI_STA);
    }
    _mqttConectado = true;
}

void NetworkManager::onNetworkLost() {
    if (!_conexionPerdida) {
        _conexionPerdida = true;
        _mqttConectado   = false;
        Serial.println(F("[NET] Red perdida. Desplegando AP de Rescate..."));
        WiFi.mode(WIFI_AP_STA);
        WiFi.softAP("ESP32_RESCATE_MOTOR1", "admin1234");
    }
}
