#pragma once
// ============================================================
// MqttManager.h
// Responsabilidad: PubSubClient, LWT, suscripciones, 
// publicación de telemetría y Watchdog del latido inverso.
// Capa 2 - Depende de HardwareController por referencia.
// ============================================================
#include <Arduino.h>
#include <PubSubClient.h>
#include <WiFiClient.h>
#include <ArduinoJson.h>
#include "HardwareController.h"

// Timeout para declarar al servidor Node.js como caído
constexpr unsigned long HEARTBEAT_TIMEOUT_MS = 35000UL;

class MqttManager {
public:
    // Inyección de dependencia: recibe HardwareController por referencia
    MqttManager(const char* brokerHost, int brokerPort,
                const String& deviceId,
                HardwareController& hw);

    void begin();

    // Gestión de conexión/reconexión (no bloqueante)
    // Devuelve true si ahora está conectado al broker
    bool conectar();

    // Debe llamarse en el loop() cuando WiFi+MQTT estén activos
    void loop();

    // Publica la telemetría y logs del ciclo actual
    void publicarTelemetria();

    // Log remoto: publica en el tópico de logs si hay conexión
    void log(const char* mensaje);

    bool isConnected()    const { return _client.connected(); }
    bool isServerAlive()  const { return !_servidorCaido; }

    // Watchdog: evaluar timeout del latido inverso (llamar en cada loop())
    void evaluarLatido(unsigned long now);

    // Callback estático que PubSubClient necesita (puntero a función libre)
    // Lo registramos como wrapper al objeto real vía instancia global
    static void onMessageStatic(char* topic, byte* payload, unsigned int length);

private:
    const char* _brokerHost;
    int         _brokerPort;
    const String& _deviceId;

    WiFiClient           _espClient;
    mutable PubSubClient _client;   // mutable: connected() no es const en la librería PubSubClient

    HardwareController& _hw;

    // Tópicos dinámicos
    String _topicTelemetria;
    String _topicEstado;
    String _topicComandos;
    String _topicLogs;

    // Latido Inverso (Reverse Heartbeat)
    unsigned long _ultimoLatidoServidor = 0;
    bool          _servidorCaido        = true;

    // Procesamiento del callback recibido por el broker
    void _procesarMensaje(char* topic, byte* payload, unsigned int length);

    // Instancia singleton para el callback estático
    static MqttManager* _instancia;
};
