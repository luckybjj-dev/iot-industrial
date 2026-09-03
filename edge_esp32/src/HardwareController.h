#pragma once
/**
 * @file HardwareController.h
 * @brief Capa Agnóstica de Abstracción de Hardware y Motor Termodinámico.
 *
 * @details Esta clase actúa como el núcleo orquestador de interacción con el
 * hardware, abstrayendo la lógica termodinámica, el modelado matemático
 * (filtros EWMA, PID) y la protección de hardware (Anti-Short Cycle) del resto
 * del sistema IoT (red y persistencia). La arquitectura separa limpiamente el
 * "Qué" (sensores/actuadores) del "Cómo" y "Cuándo" (estrategia de control y
 * failsafes), garantizando una alta cohesión y bajo acoplamiento.
 */
#include "FileManager.h"
#include <Arduino.h>
#include <DHTesp.h>
#include <PID_v1.h>
#include <Wire.h>
#include <driver/adc.h>
#include <esp_adc_cal.h>


// La librería PID_v1.h define macros MANUAL y AUTOMATIC que colisionan con
// nuestro enum ModoOperacion.
#undef MANUAL
#undef AUTOMATIC

// --- Pines Físicos Semánticos ---
#define DHTPIN 27 // DHT1
#define DHT2PIN                                                                \
  26 // DHT2 (Restaurado a su pin original, el cable era el culpable!)
#define DHTTYPE DHT22
#define PIN_ANALOGICO 35 // NTC o Humedad de Suelo (ADC1_CHANNEL_6)

#define PIN_HEATER 4 // Control Térmico (Calefactor - Asignado a GPIO 4)
#define PIN_COOLER                                                             \
  17 // Control Térmico (Enfriador Peltier - Asignado a GPIO 17)
#define PIN_FOGGER 25 // Control Hídrico (Humidificador)
#define PIN_EXTRACTOR                                                          \
  32 // Control de Gases / Aire (Ventilador - Reasignado a 32 por conflicto con
     // DHT2)
#define PIN_LIGHT 16      // Control de Iluminación
#define PIN_IRRIGATION 33 // Control de Riego / Bomba (GPIO 33 - Reino Plantae)

// Constantes NTC Steinhart-Hart (por defecto)
// Utilizadas para calcular la temperatura a partir de la resistencia del
// termistor NTC
constexpr float NTC_BETA = 3950.0f;
constexpr float NTC_R_NOMINAL = 10000.0f;
constexpr float NTC_T_NOMINAL = 25.0f;
constexpr float NTC_R_SERIE = 10000.0f;

// Constantes de Histéresis Industrial (Banda Muerta)
constexpr float HIST_TEMP = 0.5f; // Margen de histéresis térmica (0.5 °C)
constexpr float HIST_HUM = 2.0f;  // Margen de histéresis hídrica (2.0 % RH)

/**
 * @brief Constante del Filtro Matemático EWMA (Exponentially Weighted Moving
 * Average).
 *
 * @details Decisión de Diseño Matemático: El filtro EWMA actúa como un filtro
 * pasa-bajos digital (IIR). En lugar de promediar las últimas N muestras (lo
 * cual consumiría memoria O(N)), pondera exponencialmente el histórico
 * consumiendo O(1) en RAM. Proporciona una excelente resistencia frente a
 * valores atípicos (outliers) y ruido electromagnético. Un ALPHA de 0.1
 * significa: 10% de peso a la lectura actual y 90% de peso a la inercia
 * acumulada.
 */
constexpr float ALPHA_EWMA = 0.1f;

// -----------------------------------------------------------
// Struct de datos de sensor
// Almacena el estado actual de las variables climáticas.
// -----------------------------------------------------------
struct SensorData {
  float tempAmb = 0.0f;      // Temp DHT1
  float tempAmb2 = 0.0f;     // Temp DHT2
  float tempPromedio = 0.0f; // Promedio de tempAmb y tempAmb2
  float humAmb = 0.0f;       // Humedad DHT1
  float humAmb2 = 0.0f;      // Humedad DHT2
  float humPromedio = 0.0f;  // Promedio de humAmb y humAmb2
  /*
   * VPD (Déficit de Presión de Vapor - Vapor Pressure Deficit)
   * Es una métrica crucial en el cultivo que indica la diferencia
   * entre la cantidad de humedad en el aire y la cantidad máxima de
   * humedad que el aire puede retener cuando está saturado.
   * Determina la tasa de transpiración de las plantas u hongos.
   */
  float vpd = 0.0f;            // Déficit de Presión de Vapor (kPa)
  float valorAnalogico = 0.0f; // Temp Sustrato o Humedad Suelo
  int co2 = 0;                 // ppm

  bool dhtOk = false;       // Estado de salud del DHT1
  bool dht2Ok = false;      // Estado de salud del DHT2
  bool analogicoOk = false; // Estado de salud del sensor analógico
  bool co2Ok = false;       // Estado de salud del sensor de CO2

  // --- Resultados del Filtrado Matemático (EWMA) ---
  /**
   * @brief Bandera para inicializar el filtro matemático EWMA.
   * @details Previene el sesgo inicial (arrastre desde cero). En el arranque,
   * las variables filtradas adoptan inmediatamente el primer valor crudo
   * válido.
   */
  bool ewmaInitialized = false;
  float ewma_temp = 0.0f;
  float ewma_hum = 0.0f;
  float ewma_sustrato = 0.0f;
  float ewma_vpd = 0.0f;
  float ewma_co2 = 0.0f;
};

// -----------------------------------------------------------
// Struct de estado de los actuadores semánticos
// -----------------------------------------------------------
struct ActuadorData {
  bool heater_ON = false;     // Térmico (Sube temperatura)
  bool cooler_ON = false;     // Térmico (Baja temperatura - Peltier)
  bool fogger_ON = false;     // Hídrico (Sube humedad)
  bool extractor_ON = false;  // Gases (Renueva aire / baja temperatura)
  bool light_ON = false;      // Luz (Ciclo circadiano / fotoperiodo)
  bool irrigation_ON = false; // Riego (Bomba de riego Plantae)
};

// -----------------------------------------------------------
// Estado Operacional (Telemetría de Máquina de Estados)
// -----------------------------------------------------------
enum class EstadoOperacional {
  STANDBY,
  NORMAL,
  CALENTANDO,
  ENFRIANDO, // Futura expansión
  HUMIDIFICANDO,
  SAFE_MODE,
  EMERGENCIA,
  MANUAL
};

enum class ModoOperacion { AUTO, MANUAL };

class HardwareController {
public:
  HardwareController();
  void begin();

  // Inyectar dependencias desde LittleFS (Configuración cargada de JSON)
  void setConfiguracion(const ConfiguracionCultivo &config);

  // Lee físicamente los sensores y calcula el VPD
  void leerSensores();

  /**
   * @brief Motor termodinámico y Máquina de Estados Principal.
   *
   * @details Actúa como el "Cerebro" del sistema de control. Procesa las
   * lecturas filtradas (EWMA), aplica el algoritmo de control PID para cargas
   * térmicas proporcionales y evalúa un árbol de decisiones jerárquico.
   * Prioriza los estados de emergencia (Failsafes como calor crítico o gases
   * tóxicos) por encima de las demandas normales, garantizando la supervivencia
   * del cultivo.
   *
   * @param now Timestamp actual (millis).
   * @param horaDia Hora del día (0-23) para el control del ciclo circadiano
   * (fotoperiodo).
   */
  void procesarLogicaDeControl(unsigned long now, int horaDia);

  /**
   * @brief Modulación Time-Proportioning de alta resolución para el Calefactor
   * (SSR).
   * @details Se ejecuta en cada ciclo rápido de loop() para conmutar el relé
   * SSR con precisión de milisegundos, desacoplando el PID de los ciclos lentos
   * de 5s.
   */
  void actualizarModulacionSSR(unsigned long now);

  // Setters manuales (Sobrescritura por MQTT o UI Local)
  void setHeater(bool estado);
  void setCooler(bool estado);
  void setFogger(bool estado);
  void setExtractor(bool estado);
  void setLight(bool estado);
  void setIrrigation(bool estado);
  void setModoOperacion(ModoOperacion modo);
  void setPerfilActivo(bool activo) { _perfilActivo = activo; }

  // Getters de estado
  const SensorData &getSensores() const { return _sensores; }
  const ActuadorData &getActuadores() const { return _actuadores; }
  const ConfiguracionCultivo &getConfiguracion() const { return _config; }
  ModoOperacion getModoOperacion() const { return _modoActual; }
  EstadoOperacional getEstadoOperacional() const { return _estadoActual; }
  bool tienePerfilActivo() const { return _perfilActivo; }

  // Consultas de bloqueo por protección de hardware (Anti-Short Cycle)
  bool isHeaterLocked(unsigned long now) const {
    return (now - _last_heater_switch < MIN_RELAY_TIME_MS &&
            _last_heater_switch != 0);
  }
  bool isFoggerLocked(unsigned long now) const {
    return (now - _last_fogger_switch < MIN_RELAY_TIME_MS &&
            _last_fogger_switch != 0);
  }
  bool isExtractorLocked(unsigned long now) const {
    return (now - _last_extractor_switch < MIN_RELAY_TIME_MS &&
            _last_extractor_switch != 0);
  }
  bool isIrrigationLocked(unsigned long now) const {
    return (now - _last_irrigation_switch < MIN_RELAY_TIME_MS &&
            _last_irrigation_switch != 0);
  }

private:
  DHTesp _dht;
  DHTesp _dht2;
  SensorData _sensores;
  ActuadorData _actuadores;
  ConfiguracionCultivo _config; // El cerebro dinámico (umbrales de control)

  /**
   * @name Lazo de Control PID y Modulación de Ancho de Pulso Lento
   * (Time-Proportioning)
   * @details Decisión de Diseño: A diferencia de un control Bang-Bang (On/Off)
   * que genera histéresis y oscilaciones térmicas, se emplea un controlador PID
   * (Proporcional, Integral, Derivativo) para el cálculo continuo de la demanda
   * calórica. La salida analógica se traduce en un PWM de baja frecuencia
   * (ciclo de 5 segundos) mediante la técnica de "Time-Proportioning". Esto
   * evita el desgaste prematuro y estabiliza la temperatura con precisión
   * industrial. Diseñado para Relés de Estado Sólido (SSR).
   */
  ///@{
  double _pidInput, _pidOutput, _pidSetpoint;
  PID _heaterPID;
  unsigned long _windowStartTime;
  const unsigned long PID_WINDOW_SIZE = 5000; // 5 segundos, optimizado para SSR
  ///@}

  ModoOperacion _modoActual = ModoOperacion::AUTO;
  EstadoOperacional _estadoActual = EstadoOperacional::STANDBY;
  unsigned long _tiempoInicioManual = 0;
  bool _perfilActivo = false;

  // Capa 3: Filtro de Hardware (Debounce)
  const unsigned long MIN_RELAY_TIME_MS =
      180000; // 3 Minutos de seguridad (Anti-Corto Ciclo)
  unsigned long _last_heater_switch = 0;
  unsigned long _last_fogger_switch = 0;
  unsigned long _last_extractor_switch = 0;
  unsigned long _last_light_switch =
      0; // La luz no usa filtro anti-short-cycle, pero necesita persistencia de
         // estado
  unsigned long _last_cooler_switch =
      0; // El Peltier no usa filtro anti-short-cycle, persistencia de estado
  unsigned long _last_irrigation_switch = 0;
  unsigned long _irrigation_start_time = 0;

  bool _alertaCalor = false;

  // Calibración de ADC y Multisampling para Sonda NTC de Sustrato
  esp_adc_cal_characteristics_t _adcChars;
  static constexpr int NTC_SAMPLES = 32;
  static constexpr float V_REF_MV = 3300.0f;

  // Driver I2C para Sensor CO2 NDIR (SCD30 / SCD40)
  bool _scd30Presente = false;
  unsigned long _ultimoIntentoCO2 = 0;

  // Métodos internos
  void _ejecutarAccion(int pin, bool &estadoActual, bool nuevoEstado,
                       unsigned long &ultimoCambio, unsigned long now,
                       bool ignorarFiltro = false);
  /*
   * calcularVPD: Calcula el déficit de presión de vapor utilizando la
   * fórmula de Tetens para obtener la presión de vapor de saturación.
   */
  float calcularVPD(float tempC, float humRH);
};
