// ============================================================
// HardwareController.cpp
// ============================================================
#include "HardwareController.h"
#include <math.h>

HardwareController::HardwareController()
    : _dht(DHTPIN, DHTTYPE) {}

void HardwareController::begin() {
    _dht.begin();

    pinMode(PIN_RELE_HUMIDIFICADOR, OUTPUT);
    pinMode(PIN_RELE_VENTILADOR,    OUTPUT);
    pinMode(PIN_RELE_MANTA,         OUTPUT);

    digitalWrite(PIN_RELE_HUMIDIFICADOR, LOW);
    digitalWrite(PIN_RELE_VENTILADOR,    LOW);
    digitalWrite(PIN_RELE_MANTA,         LOW);

    analogReadResolution(12);

    Serial.println(F("[HW] Sensores y actuadores inicializados."));
}

void HardwareController::leerSensores() {
    _sensores.tempAmb = _dht.readTemperature();
    _sensores.humAmb  = _dht.readHumidity();
    _sensores.dhtOk   = !isnan(_sensores.tempAmb) && !isnan(_sensores.humAmb);

    int ntcValue = analogRead(PIN_NTC);
    if (ntcValue > 50 && ntcValue < 4050) {
        _sensores.sustratoOk = true;
        float resistance = NTC_R_SERIE * (4095.0f / (float)ntcValue - 1.0f);
        float steinhart  = resistance / NTC_R_NOMINAL;
        steinhart        = log(steinhart);
        steinhart       /= NTC_BETA;
        steinhart       += 1.0f / (NTC_T_NOMINAL + 273.15f);
        steinhart        = 1.0f / steinhart;
        _sensores.tempSustrato = steinhart - 273.15f;
    } else {
        _sensores.sustratoOk = false;
    }
}

void HardwareController::procesarLogicaDeControl(unsigned long now) {
    if (_modoManualRemoto) return;

    // --- Lógica de alerta de calor ---
    if (_sensores.dhtOk) {
        if      (_sensores.tempAmb >= UMBRAL_TEMP_MAX)    _alertaCalor = true;
        else if (_sensores.tempAmb <= UMBRAL_TEMP_SEGURA) _alertaCalor = false;
    } else {
        _alertaCalor = false;
    }

    // --- Ciclo periódico del ventilador FAE ---
    if (!_ventiladorEnCiclo && (now - _ultimoCicloVentilador >= INTERVALO_VENTILADOR)) {
        _ventiladorEnCiclo = true;
        _ultimoCicloVentilador = now;
    }
    if (_ventiladorEnCiclo && (now - _ultimoCicloVentilador >= DURACION_VENTILADOR)) {
        _ventiladorEnCiclo = false;
    }

    _actuadores.ventiladorON = (_alertaCalor || _ventiladorEnCiclo);
    digitalWrite(PIN_RELE_VENTILADOR, _actuadores.ventiladorON ? HIGH : LOW);

    // --- Control de humedad ---
    if (_sensores.dhtOk) {
        if (_sensores.humAmb < UMBRAL_HUM_MIN && !_actuadores.humidificadorON)
            _actuadores.humidificadorON = true;
        else if (_sensores.humAmb >= UMBRAL_HUM_MAX && _actuadores.humidificadorON)
            _actuadores.humidificadorON = false;
    } else {
        _actuadores.humidificadorON = false;
    }
    digitalWrite(PIN_RELE_HUMIDIFICADOR, _actuadores.humidificadorON ? HIGH : LOW);

    // --- Termostato local (Failsafe Manta Calefactora) ---
    if (_sensores.sustratoOk) {
        if      (_sensores.tempSustrato < UMBRAL_MANTA_ON)  _actuadores.mantaON = true;
        else if (_sensores.tempSustrato >= UMBRAL_MANTA_OFF) _actuadores.mantaON = false;
    } else {
        _actuadores.mantaON = false; // Safe-State obligatorio
    }
    digitalWrite(PIN_RELE_MANTA, _actuadores.mantaON ? HIGH : LOW);
}

void HardwareController::setManta(bool estado) {
    _actuadores.mantaON = estado;
    digitalWrite(PIN_RELE_MANTA, estado ? HIGH : LOW);
}

void HardwareController::setHumidificador(bool estado) {
    _actuadores.humidificadorON = estado;
    digitalWrite(PIN_RELE_HUMIDIFICADOR, estado ? HIGH : LOW);
}

void HardwareController::setVentilador(bool estado) {
    _actuadores.ventiladorON = estado;
    digitalWrite(PIN_RELE_VENTILADOR, estado ? HIGH : LOW);
}

void HardwareController::setModoManual(bool modo) {
    _modoManualRemoto = modo;
}
