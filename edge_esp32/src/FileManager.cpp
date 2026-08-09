#include "FileManager.h"

FileManager::FileManager() {
}

bool FileManager::begin() {
    Serial.println(F("[LittleFS] Montando sistema de archivos..."));
    if (!LittleFS.begin(true)) {
        Serial.println(F("❌ [LittleFS] Error crítico al montar el sistema de archivos."));
        return false;
    }
    Serial.println(F("✅ [LittleFS] Sistema de archivos montado correctamente."));
    return true;
}

// Funciones de parsing de enum eliminadas (se usa CropProfile)


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

    DynamicJsonDocument doc(2048);
    DeserializationError error = deserializeJson(doc, file);
    file.close();

    if (error) {
        Serial.print(F("❌ [LittleFS] Error parseando JSON: "));
        Serial.println(error.c_str());
        Serial.println(F("[LittleFS] Cargando configuración de seguridad..."));
        _crearConfiguracionPorDefecto();
        return _configActual;
    }

    // Comprobar si el JSON cargado es el formato antiguo (Reglas en lugar de crop_profile)
    if (doc.containsKey("reglas") && !doc.containsKey("crop")) {
        Serial.println(F("⚠️ [LittleFS] Configuración antigua detectada (Motor de Reglas). Forzando migración a CropProfile..."));
        _crearConfiguracionPorDefecto();
        return _configActual;
    }

    _configActual.greenhouse_id = doc["greenhouse_id"] | "CHAMBER_01";
    _configActual.crop_profile  = doc["crop_profile"] | "DEFAULT";
    _configActual.max_manual_time_ms = doc["max_manual_time_ms"] | 900000;
    
    JsonObject failsafe = doc["failsafes"];
    _configActual.failsafes.watchdog_timeout_ms       = failsafe["watchdog_timeout_ms"] | 10000;
    _configActual.failsafes.max_internal_temp_limit_c = failsafe["max_internal_temp_limit_c"] | 35.0;

    JsonObject crop = doc["crop"];
    _configActual.crop.kingdom        = crop["kingdom"] | "FUNGI";
    _configActual.crop.temp_ideal_min = crop["temp_ideal_min"] | 20.0f;
    _configActual.crop.temp_ideal_max = crop["temp_ideal_max"] | 24.0f;
    _configActual.crop.temp_crit_min  = crop["temp_crit_min"] | 15.0f;
    _configActual.crop.temp_crit_max  = crop["temp_crit_max"] | 28.0f;
    
    _configActual.crop.temp_sustrato_ideal    = crop["temp_sustrato_ideal"] | 24.0f;
    _configActual.crop.temp_sustrato_crit_max = crop["temp_sustrato_crit_max"] | 27.0f;
    
    _configActual.crop.hum_ideal_min  = crop["hum_ideal_min"] | 85.0f;
    _configActual.crop.hum_ideal_max  = crop["hum_ideal_max"] | 95.0f;
    _configActual.crop.hum_crit_min   = crop["hum_crit_min"] | 70.0f;
    
    _configActual.crop.co2_ideal_min  = crop["co2_ideal_min"] | 400;
    _configActual.crop.co2_ideal_max  = crop["co2_ideal_max"] | 800;
    _configActual.crop.co2_crit_max   = crop["co2_crit_max"] | 1200;
    
    _configActual.crop.light_hours_on = crop["light_hours_on"] | 12;

    Serial.println("[LittleFS] Configuración cargada con éxito. Perfil: " + _configActual.crop_profile);
    return _configActual;
}


void FileManager::_crearConfiguracionPorDefecto() {
    Serial.println(F("[LittleFS] Creando perfil inicial (MODO FUNGI PMV) por defecto..."));
    
    _configActual.greenhouse_id = "FUNGI_CHAMBER_01";
    _configActual.crop_profile  = "Fungi_Fruiting_v1";
    _configActual.max_manual_time_ms = 900000; // 15 minutos

    _configActual.failsafes.watchdog_timeout_ms       = 10000;
    _configActual.failsafes.max_internal_temp_limit_c = 35.0; // Evitar apagar todo muy rápido

    // Setup de parámetros seguros de Fungi (Oyster Mushrooms por ejemplo)
    _configActual.crop.kingdom        = "FUNGI";
    _configActual.crop.temp_ideal_min = 18.0f;
    _configActual.crop.temp_ideal_max = 24.0f;
    _configActual.crop.temp_crit_min  = 10.0f;
    _configActual.crop.temp_crit_max  = 29.0f;
    
    _configActual.crop.temp_sustrato_ideal    = 24.0f;
    _configActual.crop.temp_sustrato_crit_max = 27.0f;
    
    _configActual.crop.hum_ideal_min = 85.0f;
    _configActual.crop.hum_ideal_max = 95.0f;
    _configActual.crop.hum_crit_min  = 75.0f;
    
    _configActual.crop.co2_ideal_min = 400;
    _configActual.crop.co2_ideal_max = 800;
    _configActual.crop.co2_crit_max  = 1000;
    
    _configActual.crop.light_hours_on = 12;

    guardarConfiguracion(_configActual);
}

bool FileManager::guardarConfiguracion(const ConfiguracionCultivo& config) {
    DynamicJsonDocument doc(2048);
    
    doc["greenhouse_id"] = config.greenhouse_id;
    doc["crop_profile"]  = config.crop_profile;
    doc["max_manual_time_ms"] = config.max_manual_time_ms;
    
    JsonObject failsafe = doc.createNestedObject("failsafes");
    failsafe["watchdog_timeout_ms"]       = config.failsafes.watchdog_timeout_ms;
    failsafe["max_internal_temp_limit_c"] = config.failsafes.max_internal_temp_limit_c;

    JsonObject crop = doc.createNestedObject("crop");
    crop["kingdom"]        = config.crop.kingdom;
    crop["temp_ideal_min"] = config.crop.temp_ideal_min;
    crop["temp_ideal_max"] = config.crop.temp_ideal_max;
    crop["temp_crit_min"]  = config.crop.temp_crit_min;
    crop["temp_crit_max"]  = config.crop.temp_crit_max;
    
    crop["temp_sustrato_ideal"]    = config.crop.temp_sustrato_ideal;
    crop["temp_sustrato_crit_max"] = config.crop.temp_sustrato_crit_max;
    
    crop["hum_ideal_min"] = config.crop.hum_ideal_min;
    crop["hum_ideal_max"] = config.crop.hum_ideal_max;
    crop["hum_crit_min"]  = config.crop.hum_crit_min;
    
    crop["co2_ideal_min"] = config.crop.co2_ideal_min;
    crop["co2_ideal_max"] = config.crop.co2_ideal_max;
    crop["co2_crit_max"]  = config.crop.co2_crit_max;
    
    crop["light_hours_on"] = config.crop.light_hours_on;

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

bool FileManager::guardarConfiguracionJson(const String& jsonString) {
    DynamicJsonDocument doc(2048);
    DeserializationError error = deserializeJson(doc, jsonString);
    
    if (error) {
        Serial.println(F("❌ [LittleFS] JSON entrante inválido, no se guarda."));
        return false;
    }
    
    ConfiguracionCultivo nuevaConfig;
    nuevaConfig.greenhouse_id = doc["greenhouse_id"] | _configActual.greenhouse_id;
    nuevaConfig.crop_profile  = doc["crop_profile"] | _configActual.crop_profile;
    nuevaConfig.max_manual_time_ms = doc["max_manual_time_ms"] | _configActual.max_manual_time_ms;
    
    JsonObject failsafe = doc["failsafes"];
    nuevaConfig.failsafes.watchdog_timeout_ms       = failsafe["watchdog_timeout_ms"] | _configActual.failsafes.watchdog_timeout_ms;
    nuevaConfig.failsafes.max_internal_temp_limit_c = failsafe["max_internal_temp_limit_c"] | _configActual.failsafes.max_internal_temp_limit_c;
    
    if (doc.containsKey("crop")) {
        JsonObject crop = doc["crop"];
        nuevaConfig.crop.kingdom        = crop["kingdom"] | _configActual.crop.kingdom;
        nuevaConfig.crop.temp_ideal_min = crop["temp_ideal_min"] | _configActual.crop.temp_ideal_min;
        nuevaConfig.crop.temp_ideal_max = crop["temp_ideal_max"] | _configActual.crop.temp_ideal_max;
        nuevaConfig.crop.temp_crit_min  = crop["temp_crit_min"] | _configActual.crop.temp_crit_min;
        nuevaConfig.crop.temp_crit_max  = crop["temp_crit_max"] | _configActual.crop.temp_crit_max;
        
        nuevaConfig.crop.temp_sustrato_ideal    = crop["temp_sustrato_ideal"] | _configActual.crop.temp_sustrato_ideal;
        nuevaConfig.crop.temp_sustrato_crit_max = crop["temp_sustrato_crit_max"] | _configActual.crop.temp_sustrato_crit_max;
        
        nuevaConfig.crop.hum_ideal_min = crop["hum_ideal_min"] | _configActual.crop.hum_ideal_min;
        nuevaConfig.crop.hum_ideal_max = crop["hum_ideal_max"] | _configActual.crop.hum_ideal_max;
        nuevaConfig.crop.hum_crit_min  = crop["hum_crit_min"] | _configActual.crop.hum_crit_min;
        
        nuevaConfig.crop.co2_ideal_min = crop["co2_ideal_min"] | _configActual.crop.co2_ideal_min;
        nuevaConfig.crop.co2_ideal_max = crop["co2_ideal_max"] | _configActual.crop.co2_ideal_max;
        nuevaConfig.crop.co2_crit_max  = crop["co2_crit_max"] | _configActual.crop.co2_crit_max;
        
        nuevaConfig.crop.light_hours_on = crop["light_hours_on"] | _configActual.crop.light_hours_on;
    } else {
        nuevaConfig.crop = _configActual.crop;
    }
    
    _configActual = nuevaConfig;
    return guardarConfiguracion(_configActual);
}
