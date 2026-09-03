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
    _tft.setCursor(5, 5);
    if (_hw.tienePerfilActivo()) {
        _tft.setTextColor(ST77XX_GREEN, ST77XX_BLACK);
        String name = _hw.getConfiguracion().crop_profile;
        if (name.length() > 14) name = name.substring(0, 14);
        _tft.print(F("CULT: "));
        _tft.print(name);
        for (int i = name.length(); i < 14; i++) _tft.print(' ');
    } else {
        _tft.setTextColor(ST77XX_YELLOW, ST77XX_BLACK);
        _tft.print(F("ESTADO: MONITOREO   "));
    }

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

    // Sensor Analógico (Sustrato NTC en Fungi / Zona Radicular en Plantae)
    _tft.setCursor(5, 50);
    _tft.setTextColor(ST77XX_WHITE, ST77XX_BLACK);
    if (_hw.getConfiguracion().crop.kingdom == "PLANTAE") {
        _tft.print(F("Raiz:   "));
    } else {
        _tft.print(F("Sustr:  "));
    }
    if (s.analogicoOk && (s.ewmaInitialized ? s.ewma_sustrato : s.valorAnalogico) > 0.0f) {
        _tft.setTextColor(ST77XX_MAGENTA, ST77XX_BLACK);
        _tft.print(s.ewmaInitialized ? s.ewma_sustrato : s.valorAnalogico, 1);
        _tft.println(F(" C    "));
    } else {
        _tft.setTextColor(ST77XX_RED, ST77XX_BLACK);
        _tft.println(F("N/A    "));
    }
}

void DisplayManager::_drawActuadores(const ActuadorData& a) {
    const SensorData& s = _hw.getSensores();
    bool tienePerfil = _hw.tienePerfilActivo();
    EstadoOperacional estado = _hw.getEstadoOperacional();

    // Fila 1: Calefactor (CAL) + Enfriador (FRI) + Extractor (EXT)
    _tft.setCursor(5, 63);
    _tft.setTextColor(ST77XX_WHITE, ST77XX_BLACK);
    _tft.print(F("CAL:"));
    if (estado == EstadoOperacional::CALENTANDO && _hw.getModoOperacion() == ModoOperacion::AUTO) {
        _tft.setTextColor(ST77XX_YELLOW, ST77XX_BLACK);
        _tft.print(F("PID"));
    } else if (a.heater_ON) {
        _tft.setTextColor(ST77XX_GREEN, ST77XX_BLACK);
        _tft.print(F("ON "));
    } else {
        _tft.setTextColor(ST77XX_RED, ST77XX_BLACK);
        _tft.print(F("OF "));
    }

    _tft.setCursor(58, 63);
    _tft.setTextColor(ST77XX_WHITE, ST77XX_BLACK);
    _tft.print(F("FRI:"));
    if (a.cooler_ON) {
        _tft.setTextColor(ST77XX_GREEN, ST77XX_BLACK);
        _tft.print(F("ON "));
    } else {
        _tft.setTextColor(ST77XX_RED, ST77XX_BLACK);
        _tft.print(F("OF "));
    }

    _tft.setCursor(110, 63);
    _tft.setTextColor(ST77XX_WHITE, ST77XX_BLACK);
    _tft.print(F("EXT:"));
    if (a.extractor_ON) {
        _tft.setTextColor(ST77XX_GREEN, ST77XX_BLACK);
        _tft.println(F("ON "));
    } else {
        _tft.setTextColor(ST77XX_RED, ST77XX_BLACK);
        _tft.println(F("OF "));
    }

    // Fila 2: Niebla (NBL) + Luz (LUZ) + Riego (RIE)
    _tft.setCursor(5, 73);
    _tft.setTextColor(ST77XX_WHITE, ST77XX_BLACK);
    _tft.print(F("NBL:"));
    if (a.fogger_ON) {
        _tft.setTextColor(ST77XX_GREEN, ST77XX_BLACK);
        _tft.print(F("ON "));
    } else if (a.extractor_ON && tienePerfil && s.humPromedio != -999.0f && s.humPromedio < _hw.getConfiguracion().crop.hum_ideal_min && _hw.getModoOperacion() == ModoOperacion::AUTO) {
        _tft.setTextColor(ST77XX_MAGENTA, ST77XX_BLACK);
        _tft.print(F("INH")); // Inhibido por interlock de extracción
    } else {
        _tft.setTextColor(ST77XX_RED, ST77XX_BLACK);
        _tft.print(F("OF "));
    }

    _tft.setCursor(58, 73);
    _tft.setTextColor(ST77XX_WHITE, ST77XX_BLACK);
    _tft.print(F("LUZ:"));
    if (a.light_ON) {
        _tft.setTextColor(ST77XX_GREEN, ST77XX_BLACK);
        _tft.print(F("ON "));
    } else {
        _tft.setTextColor(ST77XX_RED, ST77XX_BLACK);
        _tft.print(F("OF "));
    }

    _tft.setCursor(110, 73);
    _tft.setTextColor(ST77XX_WHITE, ST77XX_BLACK);
    _tft.print(F("RIE:"));
    if (a.irrigation_ON) {
        _tft.setTextColor(ST77XX_GREEN, ST77XX_BLACK);
        _tft.println(F("ON "));
    } else {
        _tft.setTextColor(ST77XX_RED, ST77XX_BLACK);
        _tft.println(F("OF "));
    }
}

void DisplayManager::_drawEstadoRed() {
    const SensorData& s = _hw.getSensores();
    const ActuadorData& a = _hw.getActuadores();
    EstadoOperacional estado = _hw.getEstadoOperacional();
    bool tienePerfil = _hw.tienePerfilActivo();
    bool redOk = _net.estaConectado() && _firebase.isConnected();

    // Línea 1 Fija (Y=90): Estado de Red y Servidor
    _tft.setCursor(5, 90);
    if (redOk) {
        _tft.setTextColor(ST77XX_GREEN, ST77XX_BLACK);
        _tft.println(F("RED: ONLINE (RTDB OK)   "));
    } else if (_net.estaEnModoAP()) {
        _tft.setTextColor(ST77XX_MAGENTA, ST77XX_BLACK);
        _tft.println(F("RED: RESCATE AP         "));
    } else {
        _tft.setTextColor(ST77XX_RED, ST77XX_BLACK);
        _tft.println(F("RED: OFFLINE (LOCAL)    "));
    }

    // Ticker Rotativo de 2 líneas inferiores (Alterna cada 3000 ms)
    int pasoTicker = (millis() / 3000) % 2;

    // Línea 2 del Ticker (Y=102)
    _tft.setCursor(5, 102);
    if (!tienePerfil || estado == EstadoOperacional::STANDBY) {
        if (pasoTicker == 0) {
            _tft.setTextColor(ST77XX_CYAN, ST77XX_BLACK);
            _tft.println(F("ESTADO: MODO MONITOREO  "));
        } else {
            _tft.setTextColor(ST77XX_YELLOW, ST77XX_BLACK);
            _tft.println(F("PERFIL: EN REPOSO       "));
        }
    } else {
        if (pasoTicker == 0) {
            // Ciclo 0: Estado Térmico / Operacional Principal
            _tft.setTextColor(ST77XX_WHITE, ST77XX_BLACK);
            _tft.print(F("EST: "));
            switch (estado) {
                case EstadoOperacional::SAFE_MODE:
                    _tft.setTextColor(ST77XX_RED, ST77XX_BLACK);
                    _tft.println(F("SAFE MODE         "));
                    break;
                case EstadoOperacional::EMERGENCIA:
                    _tft.setTextColor(ST77XX_RED, ST77XX_BLACK);
                    _tft.println(F("EMERGENCIA        "));
                    break;
                case EstadoOperacional::CALENTANDO:
                    _tft.setTextColor(ST77XX_YELLOW, ST77XX_BLACK);
                    _tft.println(F("CALOR (PID SSR)   "));
                    break;
                case EstadoOperacional::ENFRIANDO:
                    _tft.setTextColor(ST77XX_BLUE, ST77XX_BLACK);
                    _tft.println(F("ENFRIANDO         "));
                    break;
                case EstadoOperacional::HUMIDIFICANDO:
                    _tft.setTextColor(ST77XX_CYAN, ST77XX_BLACK);
                    _tft.println(F("HUMIDIFICANDO     "));
                    break;
                case EstadoOperacional::MANUAL:
                    _tft.setTextColor(ST77XX_MAGENTA, ST77XX_BLACK);
                    _tft.println(F("MANUAL OVERRIDE   "));
                    break;
                default:
                    _tft.setTextColor(ST77XX_GREEN, ST77XX_BLACK);
                    _tft.println(F("CLIMA ESTABLE     "));
                    break;
            }
        } else {
            // Ciclo 1: Diagnóstico de Acciones Secundarias y Multivariable
            if (a.extractor_ON) {
                _tft.setTextColor(ST77XX_GREEN, ST77XX_BLACK);
                if (s.humPromedio != -999.0f && s.humPromedio >= _hw.getConfiguracion().crop.hum_ideal_max) {
                    _tft.printf("EXT: EXC HUM >%d%%      \n", (int)_hw.getConfiguracion().crop.hum_ideal_max);
                } else if (s.co2Ok && s.co2 >= _hw.getConfiguracion().crop.co2_crit_max) {
                    _tft.println(F("EXT: PURGA DE CO2       "));
                } else {
                    _tft.println(F("EXT: VENTILACION ACTIVA "));
                }
            } else if (a.fogger_ON) {
                _tft.setTextColor(ST77XX_CYAN, ST77XX_BLACK);
                _tft.println(F("NBL: INYECCION ACTIVA   "));
            } else if (a.irrigation_ON) {
                _tft.setTextColor(ST77XX_BLUE, ST77XX_BLACK);
                _tft.println(F("RIE: BOMBA RIEGO ON     "));
            } else if (!a.heater_ON && !a.cooler_ON && !a.fogger_ON && !a.extractor_ON && !a.light_ON && !a.irrigation_ON) {
                _tft.setTextColor(ST77XX_CYAN, ST77XX_BLACK);
                _tft.println(F("ACTUADORES: REPOSO (OF) "));
            } else if (a.light_ON) {
                _tft.setTextColor(ST77XX_YELLOW, ST77XX_BLACK);
                _tft.println(F("LUZ: FOTOPERIODO ON     "));
            } else {
                _tft.setTextColor(ST77XX_GREEN, ST77XX_BLACK);
                _tft.println(F("PARAMETROS EN RANGO     "));
            }
        }
    }

    // Línea 3 del Ticker (Y=114)
    _tft.setCursor(5, 114);
    if (!tienePerfil || estado == EstadoOperacional::STANDBY) {
        _tft.setTextColor(ST77XX_CYAN, ST77XX_BLACK);
        _tft.println(F("ACTUADORES: REPOSO (OF) "));
    } else {
        if (pasoTicker == 0) {
            if (estado == EstadoOperacional::CALENTANDO) {
                _tft.setTextColor(ST77XX_YELLOW, ST77XX_BLACK);
                _tft.println(F("CAL: MODULACION TERMICA "));
            } else if (estado == EstadoOperacional::ENFRIANDO) {
                _tft.setTextColor(ST77XX_BLUE, ST77XX_BLACK);
                _tft.println(F("FRI: COMPENSANDO CALOR  "));
            } else if (estado == EstadoOperacional::HUMIDIFICANDO) {
                _tft.setTextColor(ST77XX_CYAN, ST77XX_BLACK);
                _tft.println(F("NBL: REGULANDO VPD      "));
            } else {
                _tft.setTextColor(ST77XX_GREEN, ST77XX_BLACK);
                _tft.println(F("VARIABLES BAJO CONTROL  "));
            }
        } else {
            if (a.extractor_ON && s.humPromedio != -999.0f && s.humPromedio < _hw.getConfiguracion().crop.hum_ideal_min) {
                _tft.setTextColor(ST77XX_MAGENTA, ST77XX_BLACK);
                _tft.println(F("NBL: INHIBIDA X EXTRACT."));
            } else if (s.analogicoOk && s.ewma_sustrato >= _hw.getConfiguracion().crop.temp_sustrato_ideal) {
                _tft.setTextColor(ST77XX_MAGENTA, ST77XX_BLACK);
                _tft.println(F("SUSTR: CALOR METABOLICO "));
            } else {
                _tft.setTextColor(ST77XX_GREEN, ST77XX_BLACK);
                _tft.println(F("SUPERVISION LOCAL OK    "));
            }
        }
    }
}
