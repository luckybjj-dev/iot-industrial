#pragma once
// ============================================================
// DisplayManager.h
// Responsabilidad: Renderizado HMI en la pantalla TFT.
// Capa 3 - Lee estado por referencia const. No escribe nada.
// ============================================================
#include <Arduino.h>
#include <Adafruit_GFX.h>
#include <Adafruit_ST7735.h>
#include "HardwareController.h"
#include "NetworkManager.h"
#include "MqttManager.h"

// Pines TFT
#define TFT_CS   5
#define TFT_RST  13
#define TFT_DC   14

class DisplayManager {
public:
    // Inyección de las 3 dependencias de solo lectura
    DisplayManager(const HardwareController& hw,
                   const NetworkManager&    net,
                   const MqttManager&       mqtt);

    void begin();

    // Renderiza el frame completo. Llamar cada ciclo de sensores.
    void render();

private:
    Adafruit_ST7735       _tft;
    const HardwareController& _hw;
    const NetworkManager&     _net;
    const MqttManager&        _mqtt;

    // Helpers internos
    void _drawSensores(const SensorData& s);
    void _drawActuadores(const ActuadorData& a);
    void _drawEstadoRed();
};
