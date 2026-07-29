#pragma once
// ============================================================
// NetworkManager.h
// Responsabilidad: WiFi (STA + AP Failsafe) y OTA.
// Capa 1 - Sin dependencias de otras clases del proyecto.
// ============================================================
#include <Arduino.h>
#include <WiFi.h>
#include <ArduinoOTA.h>

class NetworkManager {
public:
    NetworkManager(const char* ssid, const char* password, const String& deviceId);

    // Conexión inicial bloqueante (solo en setup())
    void begin();

    // Inicializa ArduinoOTA (llamado tras begin())
    void beginOta();

    // Debe llamarse en cada iteración del loop()
    void handle();

    // Intenta reconectar WiFi de forma asíncrona (no bloqueante)
    // Devuelve true si se realizó un intento de reconexión
    bool intentarReconexion(unsigned long now);

    bool isWifiConnected()  const { return WiFi.status() == WL_CONNECTED; }
    bool isMqttNeeded()     const { return isWifiConnected() && !_mqttConectado; }
    bool isApModeActive()   const { return _conexionPerdida; }

    // El MqttManager avisa a NetworkManager cuándo el MQTT está conectado
    // para que el AP de rescate se pueda apagar correctamente
    void onMqttConnected();
    void onNetworkLost();

private:
    const char* _ssid;
    const char* _password;
    const String& _deviceId;

    bool  _conexionPerdida = false;
    bool  _mqttConectado   = false;
    unsigned long _ultimoIntentoRed = 0;
};
