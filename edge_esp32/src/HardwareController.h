#pragma once
// ============================================================
// HardwareController.h
// Responsabilidad: Sensores (DHT22, NTC) y Actuadores (Relés).
// Capa 0 - Sin dependencias externas.
// ============================================================
#include <Arduino.h>
#include <DHT.h>

// --- Constantes de Hardware ---
#define DHTPIN    27
#define DHTTYPE   DHT22
#define PIN_NTC   34

#define PIN_RELE_HUMIDIFICADOR  25
#define PIN_RELE_VENTILADOR     26
#define PIN_RELE_MANTA          4

// --- Constantes de Negocio (Umbrales Termodinámicos) ---
constexpr float UMBRAL_HUM_MIN       = 50.0f;
constexpr float UMBRAL_HUM_MAX       = 70.0f;
constexpr float UMBRAL_TEMP_MAX      = 28.0f;
constexpr float UMBRAL_TEMP_SEGURA   = 24.0f;
constexpr float UMBRAL_MANTA_ON      = 24.0f;
constexpr float UMBRAL_MANTA_OFF     = 26.0f;
constexpr float UMBRAL_SUSTRATO_ALERTA = 27.0f;

// Constantes NTC Steinhart-Hart
constexpr float NTC_BETA      = 3950.0f;
constexpr float NTC_R_NOMINAL = 10000.0f;
constexpr float NTC_T_NOMINAL = 25.0f;
constexpr float NTC_R_SERIE   = 10000.0f;

// Ciclos del ventilador FAE
constexpr long INTERVALO_VENTILADOR = 3600000L;
constexpr long DURACION_VENTILADOR  = 120000L;

// -----------------------------------------------------------
// Struct de datos de sensor para pasar por referencia const.
// Este es el "bus de datos" del sistema.
// -----------------------------------------------------------
struct SensorData {
    float tempAmb      = 0.0f;
    float humAmb       = 0.0f;
    float tempSustrato = 0.0f;
    bool  dhtOk        = false;
    bool  sustratoOk   = false;
};

// -----------------------------------------------------------
// Struct de estado de los actuadores.
// -----------------------------------------------------------
struct ActuadorData {
    bool humidificadorON = false;
    bool ventiladorON    = false;
    bool mantaON         = false;
};

class HardwareController {
public:
    HardwareController();
    void begin();

    // Lee físicamente los sensores y actualiza el estado interno
    void leerSensores();

    // Aplica la lógica termodinámica autónoma (Failsafe) y actúa sobre los GPIO
    void procesarLogicaDeControl(unsigned long now);

    // Setters de actuadores: uso exclusivo del MqttManager para control remoto.
    // Cada setter actualiza el estado lógico Y ejecuta el digitalWrite físico.
    void setManta(bool estado);
    void setHumidificador(bool estado);
    void setVentilador(bool estado);
    void setModoManual(bool modo);

    // Acceso de solo lectura al estado (para Display y Mqtt)
    const SensorData&   getSensores()   const { return _sensores; }
    const ActuadorData& getActuadores() const { return _actuadores; }
    bool isModoManual()                 const { return _modoManualRemoto; }

private:
    DHT          _dht;
    SensorData   _sensores;
    ActuadorData _actuadores;

    bool  _modoManualRemoto   = false;
    bool  _alertaCalor        = false;
    bool  _ventiladorEnCiclo  = false;
    unsigned long _ultimoCicloVentilador = 0;
};
