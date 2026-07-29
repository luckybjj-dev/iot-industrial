// ====================================================================
// main.cpp — Cámara Fungi Inteligente
// Sprint 7: Arquitectura Modular OOP
// ====================================================================
// Este archivo es intencionalmente minimalista. Su única misión es:
//   1. Instanciar los objetos del sistema.
//   2. Inicializarlos en setup().
//   3. Llamar a sus métodos de actualización en loop().
// Toda la lógica de negocio reside en los módulos correspondientes.
// ====================================================================
#include <Arduino.h>
#include <WiFi.h>
#include "HardwareController.h"
#include "NetworkManager.h"
#include "MqttManager.h"
#include "DisplayManager.h"

// --------------------------------------------------------------------
// Credenciales y configuración de red
// --------------------------------------------------------------------
static const char* WIFI_SSID     = "Presidio";
static const char* WIFI_PASSWORD = "manchita2";
static const char* MQTT_BROKER   = "broker.hivemq.com";
static const int   MQTT_PORT     = 1883;

// --------------------------------------------------------------------
// Identidad dinámica del nodo (basada en MAC Address)
// --------------------------------------------------------------------
static String deviceId;

// --------------------------------------------------------------------
// Instanciación de módulos del sistema
// (Se usa forward-declaration implícita de deviceId)
// --------------------------------------------------------------------
HardwareController hw;
NetworkManager     net(WIFI_SSID, WIFI_PASSWORD, deviceId);
MqttManager        mqtt(MQTT_BROKER, MQTT_PORT, deviceId, hw);
DisplayManager     display(hw, net, mqtt);

// --------------------------------------------------------------------
// Temporizadores asíncronos del loop
// --------------------------------------------------------------------
static unsigned long _ultimoCiclo = 0;
static constexpr long INTERVALO_CICLO = 5000L; // ms

// ====================================================================
// SETUP
// ====================================================================
void setup() {
    Serial.begin(115200);

    // Generar ID dinámico antes de pasarlo a los managers
    String mac = WiFi.macAddress();
    mac.replace(":", "");
    deviceId = "ESP32_" + mac;

    Serial.print(F("\n[SISTEMA] Arrancando Nodo: "));
    Serial.println(deviceId);

    hw.begin();       // GPIO, DHT, NTC
    net.begin();      // WiFi STA / AP Failsafe
    net.beginOta();   // OTA

    mqtt.begin();     // Tópicos dinámicos + callback
    mqtt.conectar();  // Primer intento de conexión al broker

    display.begin();  // Inicializar pantalla TFT
}

// ====================================================================
// LOOP — Totalmente no bloqueante
// ====================================================================
void loop() {
    // 1. OTA y keepalive de red
    net.handle();

    bool redOk = net.isWifiConnected() && mqtt.isConnected();

    if (!redOk) {
        // Intentar reconexión cada 10 segundos
        if (net.intentarReconexion(millis())) {
            if (net.isWifiConnected()) {
                if (mqtt.conectar()) {
                    net.onMqttConnected();
                }
            }
        }
        // Notificar pérdida de red solo una vez
        net.onNetworkLost();

    } else {
        net.onMqttConnected(); // Asegura que el AP se apague si estaba activo
        mqtt.loop();           // Procesa mensajes entrantes (callbacks)
    }

    unsigned long now = millis();

    // 2. Watchdog del latido inverso (evaluación absoluta, no condicional)
    mqtt.evaluarLatido(now);

    // 3. Ciclo de sensores, control y telemetría (cada INTERVALO_CICLO ms)
    if (now - _ultimoCiclo > INTERVALO_CICLO) {
        _ultimoCiclo = now;

        hw.leerSensores();
        hw.procesarLogicaDeControl(now);
        display.render();
        mqtt.publicarTelemetria();
    }
}