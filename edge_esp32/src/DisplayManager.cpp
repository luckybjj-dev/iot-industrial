// ============================================================
// DisplayManager.cpp
// ============================================================
#include "DisplayManager.h"

DisplayManager::DisplayManager(const HardwareController& hw,
                               const NetworkManager&    net,
                               const MqttManager&       mqtt)
    : _tft(TFT_CS, TFT_DC, TFT_RST),
      _hw(hw), _net(net), _mqtt(mqtt) {}

void DisplayManager::begin() {
    _tft.initR(INITR_BLACKTAB);
    _tft.setRotation(1);
    _tft.fillScreen(ST77XX_BLACK);
    _tft.setTextSize(1);
    Serial.println(F("[DISPLAY] TFT inicializado."));
}

void DisplayManager::render() {
    _tft.fillScreen(ST77XX_BLACK);

    // --- Cabecera ---
    _tft.setCursor(5, 5);
    _tft.setTextColor(ST77XX_YELLOW);
    _tft.println(F("CAMARA FUNGI 01"));
    _tft.drawLine(0, 15, 160, 15, ST77XX_WHITE);

    _drawSensores(_hw.getSensores());
    _drawActuadores(_hw.getActuadores());

    _tft.drawLine(0, 80, 160, 80, ST77XX_WHITE);
    _drawEstadoRed();
}

void DisplayManager::_drawSensores(const SensorData& s) {
    // Temperatura Ambiente
    _tft.setCursor(5, 20);
    _tft.setTextColor(ST77XX_WHITE);
    _tft.print(F("T.Amb: "));
    if (s.dhtOk) {
        _tft.setTextColor(s.tempAmb >= UMBRAL_TEMP_MAX ? ST77XX_RED : ST77XX_GREEN);
        _tft.print(s.tempAmb, 1);
        _tft.println(F(" C"));
    } else {
        _tft.setTextColor(ST77XX_RED);
        _tft.println(F("DHT Error"));
    }

    // Humedad Ambiental
    _tft.setCursor(5, 30);
    _tft.setTextColor(ST77XX_WHITE);
    _tft.print(F("Humed: "));
    if (s.dhtOk) {
        _tft.setTextColor(s.humAmb < UMBRAL_HUM_MIN ? ST77XX_RED : ST77XX_CYAN);
        _tft.print(s.humAmb, 1);
        _tft.println(F(" %"));
    } else {
        _tft.setTextColor(ST77XX_RED);
        _tft.println(F("DHT Error"));
    }

    // Temperatura Sustrato (NTC)
    _tft.setCursor(5, 40);
    _tft.setTextColor(ST77XX_WHITE);
    _tft.print(F("T.Sus: "));
    if (s.sustratoOk) {
        _tft.setTextColor(s.tempSustrato > UMBRAL_SUSTRATO_ALERTA ? ST77XX_RED : ST77XX_GREEN);
        _tft.print(s.tempSustrato, 1);
        _tft.println(F(" C"));
    } else {
        _tft.setTextColor(ST77XX_RED);
        _tft.println(F("NTC Error"));
    }
}

void DisplayManager::_drawActuadores(const ActuadorData& a) {
    // Humidificador + Ventilador en la misma línea
    _tft.setCursor(5, 55);
    _tft.setTextColor(ST77XX_WHITE);
    _tft.print(F("Hum: "));
    _tft.setTextColor(a.humidificadorON ? ST77XX_GREEN : ST77XX_RED);
    _tft.print(a.humidificadorON ? F("ON ") : F("OFF"));

    _tft.setCursor(75, 55);
    _tft.setTextColor(ST77XX_WHITE);
    _tft.print(F("Vent: "));
    _tft.setTextColor(a.ventiladorON ? ST77XX_GREEN : ST77XX_RED);
    _tft.println(a.ventiladorON ? F("ON ") : F("OFF"));

    // Manta Calefactora
    _tft.setCursor(5, 65);
    _tft.setTextColor(ST77XX_WHITE);
    _tft.print(F("Manta: "));
    _tft.setTextColor(a.mantaON ? ST77XX_GREEN : ST77XX_RED);
    _tft.println(a.mantaON ? F("ON ") : F("OFF"));
}

void DisplayManager::_drawEstadoRed() {
    // Línea 1: Estado WiFi / Broker MQTT
    _tft.setCursor(5, 90);
    bool redOk = _net.isWifiConnected() && _mqtt.isConnected();
    if (redOk) {
        _tft.setTextColor(ST77XX_GREEN);
        _tft.println(F("RED: ONLINE"));
    } else if (_net.isApModeActive()) {
        _tft.setTextColor(ST77XX_MAGENTA);
        _tft.println(F("RED: RESCATE AP"));
    } else {
        _tft.setTextColor(ST77XX_RED);
        _tft.println(F("RED: OFFLINE"));
    }

    // Línea 2: Estado del Servidor Node.js (Latido Inverso)
    _tft.setCursor(5, 100);
    if (_mqtt.isServerAlive()) {
        _tft.setTextColor(ST77XX_GREEN);
        _tft.println(F("CEREBRO: OK"));
    } else {
        _tft.setTextColor(ST77XX_RED);
        _tft.println(F("CEREBRO: CAIDO"));
    }
}
