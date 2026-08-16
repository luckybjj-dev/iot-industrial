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
    _tft.initR(INITR_BLACKTAB);
    _tft.setRotation(1);
    _tft.fillScreen(ST77XX_BLACK);
    _tft.setTextSize(1);

    // Dibujar plantilla estática una sola vez para eliminar flickering
    _tft.setCursor(5, 5);
    _tft.setTextColor(ST77XX_YELLOW, ST77XX_BLACK);
    _tft.print(F("PERFIL: AGNOSTICO"));
    _tft.drawLine(0, 15, 160, 15, ST77XX_WHITE);
    _tft.drawLine(0, 85, 160, 85, ST77XX_WHITE);

    Serial.println(F("[DISPLAY] TFT inicializado con plantilla Anti-Flickering."));
}

void DisplayManager::render() {
    // No usamos fillScreen() en cada ciclo para evitar parpadeos perceptibles.
    // Los textos se sobreescriben directamente con setTextColor(fg, bg).
    _drawSensores(_hw.getSensores());
    _drawActuadores(_hw.getActuadores());
    _drawEstadoRed();
}

void DisplayManager::_drawSensores(const SensorData& s) {
    // Temperatura Ambiental (Promedio filtrado EWMA)
    _tft.setCursor(5, 20);
    _tft.setTextColor(ST77XX_WHITE, ST77XX_BLACK);
    _tft.print(F("T.Prom: "));
    if (s.tempPromedio != -999.0f) {
        _tft.setTextColor(ST77XX_YELLOW, ST77XX_BLACK);
        _tft.print(s.ewmaInitialized ? s.ewma_temp : s.tempPromedio, 1);
        _tft.println(F(" C    "));
    } else {
        _tft.setTextColor(ST77XX_RED, ST77XX_BLACK);
        _tft.println(F("FAIL!  "));
    }

    // Humedad Ambiental (Promedio filtrado EWMA)
    _tft.setCursor(5, 30);
    _tft.setTextColor(ST77XX_WHITE, ST77XX_BLACK);
    _tft.print(F("H.Prom: "));
    if (s.humPromedio != -999.0f) {
        _tft.setTextColor(ST77XX_CYAN, ST77XX_BLACK);
        _tft.print(s.ewmaInitialized ? s.ewma_hum : s.humPromedio, 1);
        _tft.println(F(" %    "));
    } else {
        _tft.setTextColor(ST77XX_RED, ST77XX_BLACK);
        _tft.println(F("FAIL!  "));
    }

    // Déficit de Presión de Vapor (VPD)
    _tft.setCursor(5, 40);
    _tft.setTextColor(ST77XX_WHITE, ST77XX_BLACK);
    _tft.print(F("VPD:    "));
    if (s.tempPromedio != -999.0f && s.humPromedio != -999.0f) {
        _tft.setTextColor(ST77XX_GREEN, ST77XX_BLACK);
        _tft.print(s.ewmaInitialized ? s.ewma_vpd : s.vpd, 2);
        _tft.println(F(" kPa  "));
    } else {
        _tft.setTextColor(ST77XX_RED, ST77XX_BLACK);
        _tft.println(F("--     "));
    }

    // Sensor Analógico (Sustrato NTC)
    _tft.setCursor(5, 50);
    _tft.setTextColor(ST77XX_WHITE, ST77XX_BLACK);
    _tft.print(F("Sustr:  "));
    if (s.analogicoOk) {
        _tft.setTextColor(ST77XX_MAGENTA, ST77XX_BLACK);
        _tft.print(s.ewmaInitialized ? s.ewma_sustrato : s.valorAnalogico, 1);
        _tft.println(F(" C    "));
    } else {
        _tft.setTextColor(ST77XX_RED, ST77XX_BLACK);
        _tft.println(F("N/A    "));
    }
}

void DisplayManager::_drawActuadores(const ActuadorData& a) {
    // Fila 1: Térmico (Calefactor + Enfriador) y Ventilación (Extractor)
    _tft.setCursor(5, 63);
    _tft.setTextColor(ST77XX_WHITE, ST77XX_BLACK);
    _tft.print(F("CAL:"));
    _tft.setTextColor(a.heater_ON ? ST77XX_GREEN : ST77XX_RED, ST77XX_BLACK);
    _tft.print(a.heater_ON ? F("ON ") : F("OFF"));

    _tft.setCursor(58, 63);
    _tft.setTextColor(ST77XX_WHITE, ST77XX_BLACK);
    _tft.print(F("FRI:"));
    _tft.setTextColor(a.cooler_ON ? ST77XX_GREEN : ST77XX_RED, ST77XX_BLACK);
    _tft.print(a.cooler_ON ? F("ON ") : F("OFF"));

    _tft.setCursor(110, 63);
    _tft.setTextColor(ST77XX_WHITE, ST77XX_BLACK);
    _tft.print(F("EXT:"));
    _tft.setTextColor(a.extractor_ON ? ST77XX_GREEN : ST77XX_RED, ST77XX_BLACK);
    _tft.println(a.extractor_ON ? F("ON ") : F("OFF"));

    // Fila 2: Hídrico (Fogger) e Iluminación (Luz)
    _tft.setCursor(5, 73);
    _tft.setTextColor(ST77XX_WHITE, ST77XX_BLACK);
    _tft.print(F("NBL:"));
    _tft.setTextColor(a.fogger_ON ? ST77XX_GREEN : ST77XX_RED, ST77XX_BLACK);
    _tft.print(a.fogger_ON ? F("ON ") : F("OFF"));

    _tft.setCursor(58, 73);
    _tft.setTextColor(ST77XX_WHITE, ST77XX_BLACK);
    _tft.print(F("LUZ:"));
    _tft.setTextColor(a.light_ON ? ST77XX_GREEN : ST77XX_RED, ST77XX_BLACK);
    _tft.println(a.light_ON ? F("ON ") : F("OFF"));
}

void DisplayManager::_drawEstadoRed() {
    // Línea 1: Estado WiFi
    _tft.setCursor(5, 90);
    bool redOk = _net.estaConectado() && _firebase.isConnected();
    if (redOk) {
        _tft.setTextColor(ST77XX_GREEN, ST77XX_BLACK);
        _tft.println(F("RED: ONLINE        "));
    } else if (_net.estaEnModoAP()) {
        _tft.setTextColor(ST77XX_MAGENTA, ST77XX_BLACK);
        _tft.println(F("RED: RESCATE AP    "));
    } else {
        _tft.setTextColor(ST77XX_RED, ST77XX_BLACK);
        _tft.println(F("RED: OFFLINE       "));
    }

    // Línea 2: Estado del Servidor RTDB
    _tft.setCursor(5, 100);
    if (redOk) {
        _tft.setTextColor(ST77XX_GREEN, ST77XX_BLACK);
        _tft.println(F("FIREBASE: CONECTADO"));
    } else {
        _tft.setTextColor(ST77XX_RED, ST77XX_BLACK);
        _tft.println(F("FIREBASE: REINTENTO"));
    }

    // Línea 3: Estado Operacional del Sistema
    _tft.setCursor(5, 112);
    EstadoOperacional estado = _hw.getEstadoOperacional();
    _tft.setTextColor(ST77XX_WHITE, ST77XX_BLACK);
    _tft.print(F("ESTADO: "));
    switch (estado) {
        case EstadoOperacional::SAFE_MODE:
            _tft.setTextColor(ST77XX_RED, ST77XX_BLACK);
            _tft.println(F("SAFE MODE  "));
            break;
        case EstadoOperacional::EMERGENCIA:
            _tft.setTextColor(ST77XX_RED, ST77XX_BLACK);
            _tft.println(F("EMERGENCIA "));
            break;
        case EstadoOperacional::CALENTANDO:
            _tft.setTextColor(ST77XX_YELLOW, ST77XX_BLACK);
            _tft.println(F("CALOR (PID)"));
            break;
        case EstadoOperacional::ENFRIANDO:
            _tft.setTextColor(ST77XX_BLUE, ST77XX_BLACK);
            _tft.println(F("ENFRIANDO  "));
            break;
        case EstadoOperacional::HUMIDIFICANDO:
            _tft.setTextColor(ST77XX_CYAN, ST77XX_BLACK);
            _tft.println(F("HUMIDIFICA "));
            break;
        case EstadoOperacional::MANUAL:
            _tft.setTextColor(ST77XX_MAGENTA, ST77XX_BLACK);
            _tft.println(F("MANUAL OVR "));
            break;
        default:
            _tft.setTextColor(ST77XX_GREEN, ST77XX_BLACK);
            _tft.println(F("NORMAL     "));
            break;
    }
}
