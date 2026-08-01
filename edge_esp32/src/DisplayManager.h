#pragma once
// ============================================================
// DisplayManager.h
// Responsabilidad: Renderizado HMI en la pantalla TFT.
// Capa 3 - Lee estado por referencia const. No escribe nada.
// ============================================================

/*
 * ============================================================
 * [EDUCACIONAL] LÓGICA DE RENDERIZADO TFT Y DISEÑO DE UI
 * ============================================================
 * Esta clase se encarga exclusivamente de la capa visual (HMI - 
 * Human Machine Interface). 
 * Su diseño se basa en principios de "Immediate Mode GUI" 
 * simplificado, donde se repinta la pantalla a cada ciclo.
 *
 * Para evitar parpadeos (flickering), el enfoque actual es:
 * 1. fillScreen() limpia toda la pantalla (puede generar ligero parpadeo).
 * 2. Se reescriben los textos y formas encima.
 * 
 * *Mejora futura para parpadeos*: En lugar de usar fillScreen(), 
 * se recomienda repintar sólo las áreas que cambian (sobrescribiendo
 * el texto anterior con el color de fondo usando setTextCcolor(fg, bg)).
 * 
 * Distribución de UI (Layout):
 * - [0 - 15px] Cabecera: Muestra el perfil actual de cultivo.
 * - [15 - 80px] Cuerpo: Valores de los sensores (Temp, Hum, NTC) 
 *               y estados de actuadores (Relés).
 * - [80 - 128px] Pie: Información de red y conexión a la base de datos (Firebase).
 * ============================================================
 */

#include <Arduino.h>
#include <Adafruit_GFX.h>
#include <Adafruit_ST7735.h>
#include "HardwareController.h"
#include "NetworkManager.h"
#include "FirebaseManager.h"

// Pines TFT
#define TFT_CS   5
#define TFT_RST  13
#define TFT_DC   14

class DisplayManager {
public:
    // Inyección de las 3 dependencias de solo lectura
    DisplayManager(const HardwareController& hw,
                   const NetworkManager&    net,
                   const FirebaseManager&       firebase);

    void begin();

    // Renderiza el frame completo. Llamar cada ciclo de sensores.
    void render();

private:
    Adafruit_ST7735       _tft;
    const HardwareController& _hw;
    const NetworkManager&     _net;
    const FirebaseManager&        _firebase;

    // Helpers internos
    void _drawSensores(const SensorData& s);
    void _drawActuadores(const ActuadorData& a);
    void _drawEstadoRed();
};
