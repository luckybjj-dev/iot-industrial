// ============================================================
// DisplayManager.cpp
// ============================================================
#include "DisplayManager.h"

DisplayManager::DisplayManager(const HardwareController& hw,
                               const NetworkManager&    net,
                               const FirebaseManager&       firebase)
    : _tft(TFT_CS, TFT_DC, TFT_RST),
      _hw(hw), _net(net), _firebase(firebase) {}

void DisplayManager::begin() {
    /*
     * [EDUCACIONAL] INICIALIZACIÓN TFT
     * INITR_BLACKTAB: Indica el modelo específico del controlador ST7735.
     * Diferentes pantallas usan diferentes "tabs" (GREEN, RED, BLACK) 
     * según cómo estén cableados internamente los píxeles.
     */
    _tft.initR(INITR_BLACKTAB);
    
    // setRotation(1) configura la pantalla en modo horizontal (Landscape).
    _tft.setRotation(1);
    
    // Limpia la memoria de video asignando todos los píxeles a negro.
    _tft.fillScreen(ST77XX_BLACK);
    
    // Tamaño 1 es de 5x7 píxeles por carácter. Un buen balance para pantallas pequeñas.
    _tft.setTextSize(1);
    Serial.println(F("[DISPLAY] TFT inicializado."));
}

void DisplayManager::render() {
    /*
     * [EDUCACIONAL] CICLO DE RENDERIZADO
     * Aquí ocurre la magia visual. Cada vez que se llama a render():
     * 1. Se limpia todo el lienzo (fillScreen). Esto es sencillo pero 
     *    genera 'flickering' o parpadeo porque el ojo humano puede percibir 
     *    el refresco completo si la frecuencia es muy alta.
     * 
     * (Tip Pro: Para evitar flickering, no limpies la pantalla completa.
     * Usa _tft.setTextColor(color_texto, color_fondo) para que al imprimir
     * un texto nuevo, el fondo negro borre automáticamente el texto viejo).
     */
    _tft.fillScreen(ST77XX_BLACK);

    // --- Cabecera ---
    // [EDUCACIONAL] LAYOUT: La cabecera se ubica en las coordenadas (x=5, y=5).
    _tft.setCursor(5, 5);
    _tft.setTextColor(ST77XX_YELLOW);
    const ConfiguracionCultivo& config = _hw.getConfiguracion();
    _tft.print(F("PERFIL: "));
    _tft.println(F("AGNOSTICO"));
    
    // [EDUCACIONAL] Línea separadora horizontal para distinguir secciones UI.
    _tft.drawLine(0, 15, 160, 15, ST77XX_WHITE);

    _drawSensores(_hw.getSensores());
    _drawActuadores(_hw.getActuadores());

    // [EDUCACIONAL] Segunda línea separadora para el bloque inferior de red.
    _tft.drawLine(0, 80, 160, 80, ST77XX_WHITE);
    _drawEstadoRed();
}

void DisplayManager::_drawSensores(const SensorData& s) {
    const ConfiguracionCultivo& config = _hw.getConfiguracion();

    /*
     * [EDUCACIONAL] COLORACIÓN SEMÁNTICA
     * La UI ayuda al usuario cambiando los colores según el estado.
     * Por ejemplo, si hay error o peligro es ROJO, si todo está bien es VERDE o CIAN.
     */

    // Temperatura Ambiente
    _tft.setCursor(5, 20); // (X, Y)
    _tft.setTextColor(ST77XX_WHITE);
    _tft.print(F("T.Amb: "));
    if (s.dhtOk) {
        _tft.setTextColor(s.tempAmb >= config.failsafes.max_internal_temp_limit_c ? ST77XX_RED : ST77XX_GREEN);
        _tft.print(s.tempAmb, 1);
        _tft.println(F(" C"));
    } else {
        _tft.setTextColor(ST77XX_RED);
        _tft.println(F("Error"));
    }

    // Humedad Ambiental
    _tft.setCursor(5, 30);
    _tft.setTextColor(ST77XX_WHITE);
    _tft.print(F("Humed: "));
    if (s.dhtOk) {
        _tft.setTextColor(s.humAmb < (config.climate.humidity_target_pct - config.climate.humidity_hysteresis) ? ST77XX_RED : ST77XX_CYAN);
        _tft.print(s.humAmb, 1);
        _tft.println(F(" %"));
    } else {
        _tft.setTextColor(ST77XX_RED);
        _tft.println(F("Error"));
    }

    // Sensor Analógico (Sustrato / Suelo)
    _tft.setCursor(5, 40);
    _tft.setTextColor(ST77XX_WHITE);
    _tft.print(F("NTC:   "));
    if (s.analogicoOk) {
        _tft.setTextColor(s.valorAnalogico < (config.climate.temp_target_c - config.climate.temp_hysteresis) ? ST77XX_CYAN : ST77XX_GREEN);
        _tft.print(s.valorAnalogico, 1);
        _tft.println(F(" U"));
    } else {
        _tft.setTextColor(ST77XX_RED);
        _tft.println(F("Error"));
    }
}

void DisplayManager::_drawActuadores(const ActuadorData& a) {
    /*
     * [EDUCACIONAL] DISEÑO EN COLUMNAS
     * Para aprovechar el ancho de la pantalla (160 píxeles), 
     * los actuadores se distribuyen en dos columnas.
     * Columna izquierda en X=5, columna derecha en X=75.
     */

    // Relé A (Térmico) + Relé B (Hídrico)
    _tft.setCursor(5, 55);
    _tft.setTextColor(ST77XX_WHITE);
    _tft.print(F("CAL: "));
    _tft.setTextColor(a.heater_ON ? ST77XX_GREEN : ST77XX_RED);
    _tft.print(a.heater_ON ? F("ON ") : F("OFF"));

    _tft.setCursor(75, 55);
    _tft.setTextColor(ST77XX_WHITE);
    _tft.print(F("NBL: "));
    _tft.setTextColor(a.fogger_ON ? ST77XX_GREEN : ST77XX_RED);
    _tft.println(a.fogger_ON ? F("ON ") : F("OFF"));

    // Relé C (Gases) + Relé D (Luz)
    _tft.setCursor(5, 65);
    _tft.setTextColor(ST77XX_WHITE);
    _tft.print(F("EXT: "));
    _tft.setTextColor(a.extractor_ON ? ST77XX_GREEN : ST77XX_RED);
    _tft.print(a.extractor_ON ? F("ON ") : F("OFF"));

    _tft.setCursor(75, 65);
    _tft.setTextColor(ST77XX_WHITE);
    _tft.print(F("LUZ: "));
    _tft.setTextColor(a.light_ON ? ST77XX_GREEN : ST77XX_RED);
    _tft.println(a.light_ON ? F("ON ") : F("OFF"));
}

void DisplayManager::_drawEstadoRed() {
    /*
     * [EDUCACIONAL] FEEDBACK DEL SISTEMA (FOOTER)
     * Es vital en dispositivos IoT mostrar si hay conexión
     * a la red y a los servicios Cloud (Firebase).
     * Esto facilita el diagnóstico por parte del usuario sin
     * necesidad de conectar un puerto serial.
     */

    // Línea 1: Estado WiFi / Broker
    _tft.setCursor(5, 90);
    bool redOk = _net.estaConectado() && _firebase.isConnected();
    if (redOk) {
        _tft.setTextColor(ST77XX_GREEN);
        _tft.println(F("RED: ONLINE"));
    } else if (_net.estaEnModoAP()) {
        _tft.setTextColor(ST77XX_MAGENTA);
        _tft.println(F("RED: RESCATE AP"));
    } else {
        _tft.setTextColor(ST77XX_RED);
        _tft.println(F("RED: OFFLINE"));
    }

    // Línea 2: Estado del Servidor RTDB
    _tft.setCursor(5, 100);
    if (_firebase.isConnected()) {
        _tft.setTextColor(ST77XX_GREEN);
        _tft.println(F("FIREBASE: OK"));
    } else {
        _tft.setTextColor(ST77XX_RED);
        _tft.println(F("FIREBASE: CAIDO"));
    }
}
