#pragma once
// ============================================================
// HardwareController.h
// Capa Agnóstica: Sensores Universales y Relés Genéricos.
//
// Esta clase actúa como el núcleo de interacción con el hardware,
// abstrayendo la lógica termodinámica y de control de los
// periféricos físicos (sensores y actuadores) del resto del
// sistema.
// ============================================================
#include <Arduino.h>
#include <DHT.h>
#include "FileManager.h"

// --- Pines Físicos Semánticos ---
#define DHTPIN    27
#define DHTTYPE   DHT22
#define PIN_ANALOGICO 34 // NTC o Humedad de Suelo

#define PIN_HEATER    4 // Control Térmico (Calefactor - Asignado a GPIO 4)
#define PIN_FOGGER    25 // Control Hídrico (Humidificador)
#define PIN_EXTRACTOR 26 // Control de Gases / Aire (Ventilador)
#define PIN_LIGHT     16 // Control de Iluminación

// Constantes NTC Steinhart-Hart (por defecto)
// Utilizadas para calcular la temperatura a partir de la resistencia del termistor NTC
constexpr float NTC_BETA      = 3950.0f;
constexpr float NTC_R_NOMINAL = 10000.0f;
constexpr float NTC_T_NOMINAL = 25.0f;
constexpr float NTC_R_SERIE   = 10000.0f;

// -----------------------------------------------------------
// Struct de datos de sensor
// Almacena el estado actual de las variables climáticas.
// -----------------------------------------------------------
struct SensorData {
    float tempAmb      = 0.0f;
    float humAmb       = 0.0f;
    /*
     * VPD (Déficit de Presión de Vapor - Vapor Pressure Deficit)
     * Es una métrica crucial en el cultivo que indica la diferencia 
     * entre la cantidad de humedad en el aire y la cantidad máxima de 
     * humedad que el aire puede retener cuando está saturado. 
     * Determina la tasa de transpiración de las plantas u hongos.
     */
    float vpd          = 0.0f; // Déficit de Presión de Vapor (kPa)
    float valorAnalogico= 0.0f; // Temp Sustrato o Humedad Suelo
    int   co2          = 0;    // ppm
    
    bool  dhtOk        = false; // Estado de salud del sensor DHT
    bool  analogicoOk  = false; // Estado de salud del sensor analógico
    bool  co2Ok        = false; // Estado de salud del sensor de CO2
};

// -----------------------------------------------------------
// Struct de estado de los actuadores semánticos
// -----------------------------------------------------------
struct ActuadorData {
    bool heater_ON    = false; // Térmico (Sube temperatura)
    bool fogger_ON    = false; // Hídrico (Sube humedad)
    bool extractor_ON = false; // Gases (Renueva aire / baja temperatura)
    bool light_ON     = false; // Luz (Ciclo circadiano / fotoperiodo)
};

// -----------------------------------------------------------
// Estado Operacional (Telemetría de Máquina de Estados)
// -----------------------------------------------------------
enum class EstadoOperacional {
    NORMAL,
    CALENTANDO,
    ENFRIANDO, // Futura expansión
    HUMIDIFICANDO,
    SAFE_MODE,
    EMERGENCIA,
    MANUAL
};

enum class ModoOperacion {
    AUTO,
    MANUAL
};

class HardwareController {
public:
    HardwareController();
    void begin();

    // Inyectar dependencias desde LittleFS (Configuración cargada de JSON)
    void setConfiguracion(const ConfiguracionCultivo& config);

    // Lee físicamente los sensores y calcula el VPD
    void leerSensores();

    /*
     * procesarLogicaDeControl: Motor termodinámico
     * Esta es la máquina de estados principal que decide qué actuadores
     * encender o apagar basándose en las lecturas de los sensores,
     * las metas establecidas (targets) en la configuración, las bandas de
     * histéresis y mecanismos de seguridad (failsafes).
     */
    void procesarLogicaDeControl(unsigned long now, int horaDia);

    // Setters manuales (Sobrescritura por MQTT o UI Local)
    void setHeater(bool estado);
    void setFogger(bool estado);
    void setExtractor(bool estado);
    void setLight(bool estado);
    void setModoOperacion(ModoOperacion modo);

    // Getters de estado
    const SensorData&   getSensores()   const { return _sensores; }
    const ActuadorData& getActuadores() const { return _actuadores; }
    const ConfiguracionCultivo& getConfiguracion() const { return _config; }
    ModoOperacion getModoOperacion()    const { return _modoActual; }
    EstadoOperacional getEstadoOperacional() const { return _estadoActual; }

    // Consultas de bloqueo por protección de hardware (Anti-Short Cycle)
    bool isHeaterLocked(unsigned long now) const { return (now - _last_heater_switch < MIN_RELAY_TIME_MS && _last_heater_switch != 0); }
    bool isFoggerLocked(unsigned long now) const { return (now - _last_fogger_switch < MIN_RELAY_TIME_MS && _last_fogger_switch != 0); }
    bool isExtractorLocked(unsigned long now) const { return (now - _last_extractor_switch < MIN_RELAY_TIME_MS && _last_extractor_switch != 0); }

private:
    DHT          _dht;
    SensorData   _sensores;
    ActuadorData _actuadores;
    ConfiguracionCultivo _config; // El cerebro dinámico (umbrales de control)

    ModoOperacion _modoActual = ModoOperacion::AUTO;
    EstadoOperacional _estadoActual = EstadoOperacional::NORMAL;
    unsigned long _tiempoInicioManual = 0;
    
    // Capa 3: Filtro de Hardware (Debounce)
    const unsigned long MIN_RELAY_TIME_MS = 180000; // 3 Minutos de seguridad (Anti-Corto Ciclo)
    unsigned long _last_heater_switch = 0;
    unsigned long _last_fogger_switch = 0;
    unsigned long _last_extractor_switch = 0;
    unsigned long _last_light_switch = 0; // La luz no usa filtro anti-short-cycle, pero necesita persistencia de estado

    bool _alertaCalor = false;

    // Métodos internos
    void _ejecutarAccion(int pin, bool& estadoActual, bool nuevoEstado, unsigned long& ultimoCambio, unsigned long now, bool ignorarFiltro = false);
    /*
     * calcularVPD: Calcula el déficit de presión de vapor utilizando la 
     * fórmula de Tetens para obtener la presión de vapor de saturación.
     */
    float calcularVPD(float tempC, float humRH);
};
