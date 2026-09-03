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
    const char* oldPath = "/config.json.old";
    const char* tmpPath = "/config.json.tmp";

    // Si config.json no existe, intentar restaurar desde respaldo transaccional
    if (!LittleFS.exists(_archivoConfig)) {
        if (LittleFS.exists(oldPath)) {
            Serial.println(F("⚠️ [LittleFS] config.json faltante. Restaurando desde config.json.old..."));
            LittleFS.rename(oldPath, _archivoConfig);
        } else if (LittleFS.exists(tmpPath)) {
            Serial.println(F("⚠️ [LittleFS] config.json faltante. Restaurando desde config.json.tmp..."));
            LittleFS.rename(tmpPath, _archivoConfig);
        } else {
            Serial.println(F("[LittleFS] No se encontró config.json ni respaldo. Día Cero detectado."));
            _crearConfiguracionPorDefecto();
        }
    }

    File file = LittleFS.open(_archivoConfig, "r");
    if (!file) {
        Serial.println(F("❌ [LittleFS] Fallo al abrir config.json para lectura."));
        return _configActual;
    }

    DynamicJsonDocument doc(4096);
    DeserializationError error = deserializeJson(doc, file);
    file.close();

    if (error) {
        Serial.print(F("❌ [LittleFS] Error parseando JSON: "));
        Serial.println(error.c_str());
        // Intentar rescatar desde backup old si el actual está corrupto
        if (LittleFS.exists(oldPath)) {
            Serial.println(F("⚠️ [LittleFS] Archivo corrupto. Restaurando desde config.json.old..."));
            LittleFS.remove(_archivoConfig);
            LittleFS.rename(oldPath, _archivoConfig);
            return cargarConfiguracion();
        }
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
    if (doc.containsKey("crop_profile")) {
        _configActual.crop_profile = doc["crop_profile"].as<String>();
    } else if (doc.containsKey("activeProfileName")) {
        _configActual.crop_profile = doc["activeProfileName"].as<String>();
    } else {
        _configActual.crop_profile = "STANDBY";
    }
    _configActual.max_manual_time_ms = doc["max_manual_time_ms"] | 900000;
    
    JsonObject failsafe = doc["failsafes"];
    _configActual.failsafes.watchdog_timeout_ms       = failsafe["watchdog_timeout_ms"] | 10000;
    _configActual.failsafes.max_internal_temp_limit_c = failsafe["max_internal_temp_limit_c"] | 35.0;

    JsonObject crop = doc["crop"];
    if (crop) {
        _configActual.crop.kingdom        = crop["kingdom"] | "NONE";
        _configActual.crop.temp_ideal_min = crop.containsKey("temp_ideal_min") ? crop["temp_ideal_min"].as<float>() : 0.0f;
        _configActual.crop.temp_ideal_max = crop.containsKey("temp_ideal_max") ? crop["temp_ideal_max"].as<float>() : 0.0f;
        _configActual.crop.temp_crit_min  = crop.containsKey("temp_crit_min") ? crop["temp_crit_min"].as<float>() : 0.0f;
        _configActual.crop.temp_crit_max  = crop.containsKey("temp_crit_max") ? crop["temp_crit_max"].as<float>() : 35.0f;
        
        _configActual.crop.temp_sustrato_ideal    = crop.containsKey("temp_sustrato_ideal") ? crop["temp_sustrato_ideal"].as<float>() : 0.0f;
        _configActual.crop.temp_sustrato_crit_max = crop.containsKey("temp_sustrato_crit_max") ? crop["temp_sustrato_crit_max"].as<float>() : 35.0f;
        
        _configActual.crop.hum_ideal_min  = crop.containsKey("hum_ideal_min") ? crop["hum_ideal_min"].as<float>() : 0.0f;
        _configActual.crop.hum_ideal_max  = crop.containsKey("hum_ideal_max") ? crop["hum_ideal_max"].as<float>() : 100.0f;
        _configActual.crop.hum_crit_min   = crop.containsKey("hum_crit_min") ? crop["hum_crit_min"].as<float>() : 0.0f;
        
        _configActual.crop.co2_ideal_min  = crop.containsKey("co2_ideal_min") ? crop["co2_ideal_min"].as<int>() : 0;
        _configActual.crop.co2_ideal_max  = crop.containsKey("co2_ideal_max") ? crop["co2_ideal_max"].as<int>() : 2000;
        _configActual.crop.co2_crit_max   = crop.containsKey("co2_crit_max") ? crop["co2_crit_max"].as<int>() : 3000;
        
        _configActual.crop.light_hours_on = crop.containsKey("light_hours_on") ? crop["light_hours_on"].as<int>() : 0;

        _configActual.crop.hum_suelo_ideal_min = crop.containsKey("hum_suelo_ideal_min") ? crop["hum_suelo_ideal_min"].as<float>() : 0.0f;
        _configActual.crop.hum_suelo_ideal_max = crop.containsKey("hum_suelo_ideal_max") ? crop["hum_suelo_ideal_max"].as<float>() : 0.0f;
        _configActual.crop.hum_suelo_crit_min  = crop.containsKey("hum_suelo_crit_min") ? crop["hum_suelo_crit_min"].as<float>() : 0.0f;
    }

    Serial.println("[LittleFS] Configuración cargada con éxito. Perfil: " + _configActual.crop_profile);
    return _configActual;
}


void FileManager::_crearConfiguracionPorDefecto() {
    Serial.println(F("[LittleFS] Creando perfil inicial (STANDBY / MONITOREO) por defecto..."));
    
    _configActual.greenhouse_id = "CHAMBER_01";
    _configActual.crop_profile  = "STANDBY";
    _configActual.max_manual_time_ms = 900000; // 15 minutos

    _configActual.failsafes.watchdog_timeout_ms       = 10000;
    _configActual.failsafes.max_internal_temp_limit_c = 35.0; // Umbral de emergencia global

    // Sin perfil biológico activo por defecto (actuadores en reposo)
    _configActual.crop.kingdom        = "NONE";
    _configActual.crop.temp_ideal_min = 0.0f;
    _configActual.crop.temp_ideal_max = 0.0f;
    _configActual.crop.temp_crit_min  = 0.0f;
    _configActual.crop.temp_crit_max  = 35.0f;
    
    _configActual.crop.temp_sustrato_ideal    = 0.0f;
    _configActual.crop.temp_sustrato_crit_max = 35.0f;
    
    _configActual.crop.hum_ideal_min = 0.0f;
    _configActual.crop.hum_ideal_max = 100.0f;
    _configActual.crop.hum_crit_min  = 0.0f;
    
    _configActual.crop.co2_ideal_min = 0;
    _configActual.crop.co2_ideal_max = 2000;
    _configActual.crop.co2_crit_max  = 3000;
    
    _configActual.crop.light_hours_on = 0;
    _configActual.crop.hum_suelo_ideal_min = 0.0f;
    _configActual.crop.hum_suelo_ideal_max = 0.0f;
    _configActual.crop.hum_suelo_crit_min  = 0.0f;

    guardarConfiguracion(_configActual);
}

bool FileManager::guardarConfiguracion(const ConfiguracionCultivo& config) {
    DynamicJsonDocument doc(4096);
    
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
    crop["hum_suelo_ideal_min"] = config.crop.hum_suelo_ideal_min;
    crop["hum_suelo_ideal_max"] = config.crop.hum_suelo_ideal_max;
    crop["hum_suelo_crit_min"]  = config.crop.hum_suelo_crit_min;


    const char* tmpPath = "/config.json.tmp";
    const char* oldPath = "/config.json.old";

    File file = LittleFS.open(tmpPath, "w");
    if (!file) {
        Serial.println(F("❌ [LittleFS] Fallo al abrir archivo temporal para escritura atómica."));
        return false;
    }

    if (serializeJson(doc, file) == 0) {
        Serial.println(F("❌ [LittleFS] Fallo al escribir JSON temporal."));
        file.close();
        LittleFS.remove(tmpPath);
        return false;
    }
    file.close();

    // Reemplazo atómico seguro con backup
    if (LittleFS.exists(oldPath)) LittleFS.remove(oldPath);
    if (LittleFS.exists(_archivoConfig)) LittleFS.rename(_archivoConfig, oldPath);
    if (!LittleFS.rename(tmpPath, _archivoConfig)) {
        Serial.println(F("❌ [LittleFS] Fallo al renombrar archivo temporal a config.json."));
        if (LittleFS.exists(oldPath)) LittleFS.rename(oldPath, _archivoConfig);
        return false;
    }
    if (LittleFS.exists(oldPath)) LittleFS.remove(oldPath);

    Serial.println(F("✅ [LittleFS] Configuración guardada atómicamente en disco."));
    return true;
}

bool FileManager::guardarConfiguracionJson(const String& jsonString) {
    DynamicJsonDocument doc(4096);
    DeserializationError error = deserializeJson(doc, jsonString);
    
    if (error) {
        Serial.println(F("❌ [LittleFS] JSON entrante inválido, no se guarda."));
        return false;
    }
    
    ConfiguracionCultivo nuevaConfig;
    nuevaConfig.greenhouse_id = doc.containsKey("greenhouse_id") ? doc["greenhouse_id"].as<String>() : _configActual.greenhouse_id;
    if (doc.containsKey("crop_profile")) {
        nuevaConfig.crop_profile = doc["crop_profile"].as<String>();
    } else if (doc.containsKey("activeProfileName")) {
        nuevaConfig.crop_profile = doc["activeProfileName"].as<String>();
    } else {
        nuevaConfig.crop_profile = _configActual.crop_profile;
    }
    nuevaConfig.max_manual_time_ms = doc.containsKey("max_manual_time_ms") ? doc["max_manual_time_ms"].as<unsigned long>() : _configActual.max_manual_time_ms;
    
    if (doc.containsKey("failsafes")) {
        JsonObject failsafe = doc["failsafes"];
        nuevaConfig.failsafes.watchdog_timeout_ms = failsafe.containsKey("watchdog_timeout_ms") ? failsafe["watchdog_timeout_ms"].as<unsigned long>() : _configActual.failsafes.watchdog_timeout_ms;
        nuevaConfig.failsafes.max_internal_temp_limit_c = failsafe.containsKey("max_internal_temp_limit_c") ? failsafe["max_internal_temp_limit_c"].as<float>() : _configActual.failsafes.max_internal_temp_limit_c;
    } else {
        nuevaConfig.failsafes = _configActual.failsafes;
    }
    
    if (doc.containsKey("crop")) {
        JsonObject crop = doc["crop"];
        nuevaConfig.crop.kingdom = crop.containsKey("kingdom") ? crop["kingdom"].as<String>() : _configActual.crop.kingdom;
        nuevaConfig.crop.temp_ideal_min = crop.containsKey("temp_ideal_min") ? crop["temp_ideal_min"].as<float>() : _configActual.crop.temp_ideal_min;
        nuevaConfig.crop.temp_ideal_max = crop.containsKey("temp_ideal_max") ? crop["temp_ideal_max"].as<float>() : _configActual.crop.temp_ideal_max;
        nuevaConfig.crop.temp_crit_min  = crop.containsKey("temp_crit_min") ? crop["temp_crit_min"].as<float>() : _configActual.crop.temp_crit_min;
        nuevaConfig.crop.temp_crit_max  = crop.containsKey("temp_crit_max") ? crop["temp_crit_max"].as<float>() : _configActual.crop.temp_crit_max;
        
        nuevaConfig.crop.temp_sustrato_ideal    = crop.containsKey("temp_sustrato_ideal") ? crop["temp_sustrato_ideal"].as<float>() : _configActual.crop.temp_sustrato_ideal;
        nuevaConfig.crop.temp_sustrato_crit_max = crop.containsKey("temp_sustrato_crit_max") ? crop["temp_sustrato_crit_max"].as<float>() : _configActual.crop.temp_sustrato_crit_max;
        
        nuevaConfig.crop.hum_ideal_min = crop.containsKey("hum_ideal_min") ? crop["hum_ideal_min"].as<float>() : _configActual.crop.hum_ideal_min;
        nuevaConfig.crop.hum_ideal_max = crop.containsKey("hum_ideal_max") ? crop["hum_ideal_max"].as<float>() : _configActual.crop.hum_ideal_max;
        nuevaConfig.crop.hum_crit_min  = crop.containsKey("hum_crit_min") ? crop["hum_crit_min"].as<float>() : _configActual.crop.hum_crit_min;
        
        nuevaConfig.crop.co2_ideal_min = crop.containsKey("co2_ideal_min") ? crop["co2_ideal_min"].as<int>() : _configActual.crop.co2_ideal_min;
        nuevaConfig.crop.co2_ideal_max = crop.containsKey("co2_ideal_max") ? crop["co2_ideal_max"].as<int>() : _configActual.crop.co2_ideal_max;
        nuevaConfig.crop.co2_crit_max  = crop.containsKey("co2_crit_max") ? crop["co2_crit_max"].as<int>() : _configActual.crop.co2_crit_max;
        
        nuevaConfig.crop.light_hours_on = crop.containsKey("light_hours_on") ? crop["light_hours_on"].as<int>() : _configActual.crop.light_hours_on;
        
        // Parámetros de humedad de suelo (Reino PLANTAE — requiere sensor capacitivo en ADC)
        nuevaConfig.crop.hum_suelo_ideal_min = crop.containsKey("hum_suelo_ideal_min") ? crop["hum_suelo_ideal_min"].as<float>() : _configActual.crop.hum_suelo_ideal_min;
        nuevaConfig.crop.hum_suelo_ideal_max = crop.containsKey("hum_suelo_ideal_max") ? crop["hum_suelo_ideal_max"].as<float>() : _configActual.crop.hum_suelo_ideal_max;
        nuevaConfig.crop.hum_suelo_crit_min  = crop.containsKey("hum_suelo_crit_min")  ? crop["hum_suelo_crit_min"].as<float>()  : _configActual.crop.hum_suelo_crit_min;
    } else {
        nuevaConfig.crop = _configActual.crop;
    }
    
    _configActual = nuevaConfig;
    return guardarConfiguracion(_configActual);
}
