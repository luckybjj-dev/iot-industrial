#pragma once
#include <Arduino.h>
#include <LittleFS.h>
#include <ArduinoJson.h>

/*
 * ============================================================================
 * FILEMANAGER.H - GESTIÓN DE ALMACENAMIENTO NO VOLÁTIL Y SERIALIZACIÓN JSON
 * ============================================================================
 * Este módulo se encarga de guardar y leer la configuración del dispositivo
 * en la memoria flash interna del ESP32 utilizando el sistema de archivos
 * LittleFS. LittleFS está diseñado para ser resistente a fallos de energía y 
 * alargar la vida útil de la memoria flash mediante la nivelación de desgaste 
 * (wear leveling).
 * 
 * También hace uso de la librería ArduinoJson para convertir los datos del 
 * sistema (estructuras C++) a un formato JSON entendible por la nube, y 
 * viceversa (Deserialización / Serialización).
 * ============================================================================
 */

// --------------------------------------------------------------------
// Estructura Agnóstica (Universal) para cualquier cultivo
// --------------------------------------------------------------------
/*
 * Las siguientes estructuras definen de forma estática los parámetros
 * necesarios para controlar un entorno de cultivo. Al utilizar "structs"
 * aseguramos que la memoria requerida esté contigua y el acceso sea rápido.
 */
// --- Diccionario del Rule Engine ---
enum class VariableFisica { TEMP, HUMEDAD, CO2, VPD, HORA_DEL_DIA };
enum class OperadorLogico { MAYOR_QUE, MENOR_QUE, IGUAL };
enum class ActuadorFisico { CALEFACTOR, NIEBLA, EXTRACTOR, LUZ };
enum class EstadoDeseado  { ENCENDIDO, APAGADO };

struct ReglaTermodinamica {
    VariableFisica variable;
    OperadorLogico operador;
    float valor;
    ActuadorFisico actuador;
    EstadoDeseado  accion;
};

struct FailsafesConfig {
    int watchdog_timeout_ms;
    float max_internal_temp_limit_c;
};

struct ConfiguracionCultivo {
    String greenhouse_id;
    String crop_profile;
    
    unsigned long max_manual_time_ms; // Caducidad del modo manual
    
    ReglaTermodinamica reglas[20];
    int total_reglas;
    
    FailsafesConfig failsafes;
};

class FileManager {
public:
    FileManager();
    
    /* 
     * Inicia y monta la partición LittleFS. 
     * Si no se monta correctamente, intenta formatear la partición (útil en 
     * el primer inicio del microcontrolador).
     */
    bool begin();
    
    /* 
     * Carga el archivo config.json a la memoria RAM.
     * Implementa un sistema de "fallback" (rescate) donde si el archivo
     * no existe o está corrupto, se autogenera un perfil seguro por defecto.
     */
    ConfiguracionCultivo cargarConfiguracion();
    
    /* 
     * Convierte la estructura de configuración (C++) en un documento JSON
     * y lo guarda de forma persistente en LittleFS.
     */
    bool guardarConfiguracion(const ConfiguracionCultivo& config);
    
    /* 
     * Procesa una cadena de texto en formato JSON (generalmente proveniente
     * de MQTT o HTTP), extrae los valores de interés, actualiza la configuración
     * actual y los guarda en LittleFS, ignorando campos corruptos.
     */
    bool guardarConfiguracionJson(const String& jsonString);

private:
    const char* _archivoConfig = "/config.json";
    ConfiguracionCultivo _configActual;
    
    /*
     * Función interna que restablece los valores del sistema a un estado
     * conocido y funcional (Ej: Modo Fungi) para evitar fallos catastróficos.
     */
    void _crearConfiguracionPorDefecto();
};
