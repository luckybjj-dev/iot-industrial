#include "FileManager.h"

/*
 * ============================================================================
 * CONSTRUCTOR
 * ============================================================================
 * No realiza acciones pesadas. En sistemas embebidos, la interacción con el 
 * hardware (como inicializar memorias) se retrasa al método begin() para 
 * garantizar que el hardware base y los objetos de Arduino ya están listos.
 */
FileManager::FileManager() {
    // Constructor vacío, inicialización real en begin()
}

/*
 * ============================================================================
 * MONTAJE DEL SISTEMA DE ARCHIVOS (LittleFS)
 * ============================================================================
 * LittleFS requiere ser "montado" (preparado) antes de poder leer o escribir
 * archivos. El parámetro 'true' en LittleFS.begin(true) indica que, si la
 * memoria flash no está particionada o tiene un formato incorrecto (ej. es un 
 * chip nuevo de fábrica), el ESP32 la formateará automáticamente para poder
 * usarla.
 */
bool FileManager::begin() {
    Serial.println(F("[LittleFS] Montando sistema de archivos..."));
    
    // true = Formatear partición si falla el montaje
    if (!LittleFS.begin(true)) {
        Serial.println(F("❌ [LittleFS] Error crítico al montar el sistema de archivos."));
        return false;
    }
    
    Serial.println(F("✅ [LittleFS] Sistema de archivos montado correctamente."));
    return true;
}

/*
 * ============================================================================
 * DESERIALIZACIÓN JSON Y FALLBACKS DE SEGURIDAD (DEFAULT FALLBACKS)
 * ============================================================================
 * Este método extrae los datos desde el archivo persistente (config.json) 
 * hacia las estructuras de C++.
 * 
 * ¿Qué son los "Fallbacks"?
 * Es el mecanismo de seguridad usando el operador '|' que provee ArduinoJson.
 * Si en el JSON falta un campo (ej. porque hubo un error en la actualización), 
 * el operador '|' inyecta un valor seguro por defecto, asegurando que el 
 * sistema no tenga variables nulas (lo cual podría causar que la calefacción 
 * nunca se apague, por ejemplo).
 */
ConfiguracionCultivo FileManager::cargarConfiguracion() {
    if (!LittleFS.exists(_archivoConfig)) {
        Serial.println(F("[LittleFS] No se encontró config.json. Día Cero detectado."));
        _crearConfiguracionPorDefecto();
    }

    File file = LittleFS.open(_archivoConfig, "r");
    if (!file) {
        Serial.println(F("❌ [LittleFS] Fallo al abrir config.json para lectura."));
        return _configActual;
    }

    // Se asigna memoria estática en el Stack para procesar el JSON. 
    // 1024 bytes suelen ser suficientes para archivos de configuración pequeños.
    StaticJsonDocument<1024> doc;
    DeserializationError error = deserializeJson(doc, file);
    file.close();

    // Si el JSON está mal formado o corrupto, ejecutamos el plan de rescate.
    if (error) {
        Serial.print(F("❌ [LittleFS] Error parseando JSON: "));
        Serial.println(error.c_str());
        Serial.println(F("[LittleFS] Cargando configuración de seguridad..."));
        _crearConfiguracionPorDefecto();
        return _configActual;
    }

    /* 
     * Extracción con Fallbacks (|):
     * doc["clave"] | valor_por_defecto
     */
    _configActual.greenhouse_id = doc["greenhouse_id"] | "CHAMBER_01";
    _configActual.crop_profile  = doc["crop_profile"] | "DEFAULT";
    
    JsonObject climate = doc["climate"];
    _configActual.climate.temp_target_c       = climate["temp_target_c"] | 21.0;
    _configActual.climate.temp_hysteresis     = climate["temp_hysteresis"] | 1.0;
    _configActual.climate.humidity_target_pct = climate["humidity_target_pct"] | 50.0;
    _configActual.climate.humidity_hysteresis = climate["humidity_hysteresis"] | 5.0;
    _configActual.climate.co2_max_ppm         = climate["co2_max_ppm"] | 800;

    JsonObject vent = doc["ventilation"];
    _configActual.ventilation.fae_interval_min = vent["fae_interval_min"] | 60;
    _configActual.ventilation.fae_duration_sec = vent["fae_duration_sec"] | 120;

    JsonObject failsafe = doc["failsafes"];
    _configActual.failsafes.watchdog_timeout_ms       = failsafe["watchdog_timeout_ms"] | 10000;
    _configActual.failsafes.max_internal_temp_limit_c = failsafe["max_internal_temp_limit_c"] | 26.0;

    Serial.println("[LittleFS] Configuración cargada con éxito. Perfil: " + _configActual.crop_profile);
    return _configActual;
}

/*
 * ============================================================================
 * PLAN DE RESCATE: CONFIGURACIÓN POR DEFECTO (HARDCODED FALLBACK)
 * ============================================================================
 * Función de autocuración. Cuando detectamos que es la primera vez que se
 * enciende el dispositivo ("Día Cero") o que hubo una corrupción del archivo,
 * esta función sobreescribe las variables en memoria con un estado 
 * predefinido seguro (Modo Fungi) y guarda ese estado como el nuevo
 * archivo config.json estable.
 */
void FileManager::_crearConfiguracionPorDefecto() {
    Serial.println(F("[LittleFS] Creando perfil inicial (MODO FUNGI PMV) por defecto..."));
    
    // Perfil "Día Cero" basado en los requisitos de MVP 0 Fungi
    _configActual.greenhouse_id = "FUNGI_CHAMBER_01";
    _configActual.crop_profile  = "Fungi_Fruiting_v1";
    
    _configActual.climate.temp_target_c       = 21.0;
    _configActual.climate.temp_hysteresis     = 1.0;
    _configActual.climate.humidity_target_pct = 90.0;
    _configActual.climate.humidity_hysteresis = 3.0;
    _configActual.climate.co2_max_ppm         = 800;

    _configActual.ventilation.fae_interval_min = 10;
    _configActual.ventilation.fae_duration_sec = 60;

    _configActual.failsafes.watchdog_timeout_ms       = 10000;
    _configActual.failsafes.max_internal_temp_limit_c = 30.0;

    guardarConfiguracion(_configActual);
}

/*
 * ============================================================================
 * SERIALIZACIÓN JSON Y ESCRITURA EN DISCO
 * ============================================================================
 * Convierte el estado actual del equipo (estructuras de C++) en un texto 
 * estructurado (JSON).
 * Se crean "NestedObjects" para organizar el JSON de forma jerárquica
 * mejorando la legibilidad e interoperabilidad.
 * Finalmente, guarda este documento estructurado en el sistema LittleFS.
 */
bool FileManager::guardarConfiguracion(const ConfiguracionCultivo& config) {
    StaticJsonDocument<1024> doc;
    
    doc["greenhouse_id"] = config.greenhouse_id;
    doc["crop_profile"]  = config.crop_profile;
    
    JsonObject climate = doc.createNestedObject("climate");
    climate["temp_target_c"]       = config.climate.temp_target_c;
    climate["temp_hysteresis"]     = config.climate.temp_hysteresis;
    climate["humidity_target_pct"] = config.climate.humidity_target_pct;
    climate["humidity_hysteresis"] = config.climate.humidity_hysteresis;
    climate["co2_max_ppm"]         = config.climate.co2_max_ppm;

    JsonObject vent = doc.createNestedObject("ventilation");
    vent["fae_interval_min"] = config.ventilation.fae_interval_min;
    vent["fae_duration_sec"] = config.ventilation.fae_duration_sec;

    JsonObject failsafe = doc.createNestedObject("failsafes");
    failsafe["watchdog_timeout_ms"]       = config.failsafes.watchdog_timeout_ms;
    failsafe["max_internal_temp_limit_c"] = config.failsafes.max_internal_temp_limit_c;

    File file = LittleFS.open(_archivoConfig, "w");
    if (!file) {
        Serial.println(F("❌ [LittleFS] Fallo al abrir config.json para escritura."));
        return false;
    }

    if (serializeJson(doc, file) == 0) {
        Serial.println(F("❌ [LittleFS] Fallo al escribir JSON."));
        file.close();
        return false;
    }

    file.close();
    Serial.println(F("✅ [LittleFS] Configuración guardada en disco."));
    return true;
}

/*
 * ============================================================================
 * RECEPCIÓN E INYECCIÓN DE NUEVOS PARÁMETROS (DESDE MQTT / WEB)
 * ============================================================================
 * Cuando el dispositivo recibe un nuevo comando (ej. cambiar temperatura), 
 * este suele llegar como un texto JSON plano (String jsonString).
 * 
 * Aquí aplicamos una técnica de inyección segura:
 * 1. Intentamos leer el JSON recibido. Si falla, descartamos por completo.
 * 2. Si es válido, extraemos los nuevos valores. 
 * 3. FALLBACKS DE RETENCIÓN: Si el comando MQTT solo envía la temperatura,
 *    usamos el operador '|' apuntando a _configActual. Esto significa: 
 *    "Si me envían un nuevo valor, úsalo, de lo contrario, conserva el que
 *    ya teníamos". Esto permite actualizaciones parciales de configuración.
 */
bool FileManager::guardarConfiguracionJson(const String& jsonString) {
    StaticJsonDocument<1024> doc;
    DeserializationError error = deserializeJson(doc, jsonString);
    
    if (error) {
        Serial.println(F("❌ [LittleFS] JSON entrante inválido, no se guarda."));
        return false;
    }
    
    // Si es válido, lo inyectamos al método nativo con fallback a los valores actuales
    ConfiguracionCultivo nuevaConfig;
    nuevaConfig.greenhouse_id = doc["greenhouse_id"] | _configActual.greenhouse_id;
    nuevaConfig.crop_profile  = doc["crop_profile"] | _configActual.crop_profile;
    
    JsonObject climate = doc["climate"];
    nuevaConfig.climate.temp_target_c       = climate["temp_target_c"] | _configActual.climate.temp_target_c;
    nuevaConfig.climate.temp_hysteresis     = climate["temp_hysteresis"] | _configActual.climate.temp_hysteresis;
    nuevaConfig.climate.humidity_target_pct = climate["humidity_target_pct"] | _configActual.climate.humidity_target_pct;
    nuevaConfig.climate.humidity_hysteresis = climate["humidity_hysteresis"] | _configActual.climate.humidity_hysteresis;
    nuevaConfig.climate.co2_max_ppm         = climate["co2_max_ppm"] | _configActual.climate.co2_max_ppm;

    JsonObject vent = doc["ventilation"];
    nuevaConfig.ventilation.fae_interval_min = vent["fae_interval_min"] | _configActual.ventilation.fae_interval_min;
    nuevaConfig.ventilation.fae_duration_sec = vent["fae_duration_sec"] | _configActual.ventilation.fae_duration_sec;

    JsonObject failsafe = doc["failsafes"];
    nuevaConfig.failsafes.watchdog_timeout_ms       = failsafe["watchdog_timeout_ms"] | _configActual.failsafes.watchdog_timeout_ms;
    nuevaConfig.failsafes.max_internal_temp_limit_c = failsafe["max_internal_temp_limit_c"] | _configActual.failsafes.max_internal_temp_limit_c;
    
    _configActual = nuevaConfig;
    return guardarConfiguracion(_configActual);
}
