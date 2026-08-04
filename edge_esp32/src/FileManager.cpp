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

// Helpers for Enum parsing (String <-> Enum)
VariableFisica parseVariable(const String& str) {
    if (str == "TEMP") return VariableFisica::TEMP;
    if (str == "HUMEDAD") return VariableFisica::HUMEDAD;
    if (str == "CO2") return VariableFisica::CO2;
    if (str == "VPD") return VariableFisica::VPD;
    if (str == "HORA_DEL_DIA") return VariableFisica::HORA_DEL_DIA;
    return VariableFisica::TEMP; // Default
}
String stringifyVariable(VariableFisica var) {
    switch(var) {
        case VariableFisica::TEMP: return "TEMP";
        case VariableFisica::HUMEDAD: return "HUMEDAD";
        case VariableFisica::CO2: return "CO2";
        case VariableFisica::VPD: return "VPD";
        case VariableFisica::HORA_DEL_DIA: return "HORA_DEL_DIA";
        default: return "TEMP";
    }
}

OperadorLogico parseOperador(const String& str) {
    if (str == "MAYOR_QUE") return OperadorLogico::MAYOR_QUE;
    if (str == "MENOR_QUE") return OperadorLogico::MENOR_QUE;
    if (str == "IGUAL") return OperadorLogico::IGUAL;
    return OperadorLogico::IGUAL; // Default
}
String stringifyOperador(OperadorLogico op) {
    switch(op) {
        case OperadorLogico::MAYOR_QUE: return "MAYOR_QUE";
        case OperadorLogico::MENOR_QUE: return "MENOR_QUE";
        case OperadorLogico::IGUAL: return "IGUAL";
        default: return "IGUAL";
    }
}

ActuadorFisico parseActuador(const String& str) {
    if (str == "CALEFACTOR") return ActuadorFisico::CALEFACTOR;
    if (str == "NIEBLA") return ActuadorFisico::NIEBLA;
    if (str == "EXTRACTOR") return ActuadorFisico::EXTRACTOR;
    if (str == "LUZ") return ActuadorFisico::LUZ;
    return ActuadorFisico::CALEFACTOR; // Default
}
String stringifyActuador(ActuadorFisico act) {
    switch(act) {
        case ActuadorFisico::CALEFACTOR: return "CALEFACTOR";
        case ActuadorFisico::NIEBLA: return "NIEBLA";
        case ActuadorFisico::EXTRACTOR: return "EXTRACTOR";
        case ActuadorFisico::LUZ: return "LUZ";
        default: return "CALEFACTOR";
    }
}

EstadoDeseado parseEstado(const String& str) {
    if (str == "ENCENDIDO") return EstadoDeseado::ENCENDIDO;
    if (str == "APAGADO") return EstadoDeseado::APAGADO;
    return EstadoDeseado::APAGADO; // Default
}
String stringifyEstado(EstadoDeseado est) {
    switch(est) {
        case EstadoDeseado::ENCENDIDO: return "ENCENDIDO";
        case EstadoDeseado::APAGADO: return "APAGADO";
        default: return "APAGADO";
    }
}


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

    DynamicJsonDocument doc(2048); // Aumentado para soportar arreglos de reglas
    DeserializationError error = deserializeJson(doc, file);
    file.close();

    if (error) {
        Serial.print(F("❌ [LittleFS] Error parseando JSON: "));
        Serial.println(error.c_str());
        Serial.println(F("[LittleFS] Cargando configuración de seguridad..."));
        _crearConfiguracionPorDefecto();
        return _configActual;
    }

    // Comprobar si el JSON cargado es el formato antiguo (no tiene "reglas")
    if (!doc.containsKey("reglas")) {
        Serial.println(F("⚠️ [LittleFS] Configuración antigua detectada (sin reglas). Forzando migración..."));
        _crearConfiguracionPorDefecto();
        return _configActual;
    }

    _configActual.greenhouse_id = doc["greenhouse_id"] | "CHAMBER_01";
    _configActual.crop_profile  = doc["crop_profile"] | "DEFAULT";
    _configActual.max_manual_time_ms = doc["max_manual_time_ms"] | 900000;
    
    JsonObject failsafe = doc["failsafes"];
    _configActual.failsafes.watchdog_timeout_ms       = failsafe["watchdog_timeout_ms"] | 10000;
    _configActual.failsafes.max_internal_temp_limit_c = failsafe["max_internal_temp_limit_c"] | 26.0;

    JsonArray reglasJson = doc["reglas"];
    _configActual.total_reglas = 0;
    for (JsonObject reglaJson : reglasJson) {
        if (_configActual.total_reglas >= 20) break; // Limite de seguridad
        
        ReglaTermodinamica regla;
        regla.variable = parseVariable(reglaJson["var"] | "TEMP");
        regla.operador = parseOperador(reglaJson["op"] | "IGUAL");
        regla.valor = reglaJson["val"] | 0.0f;
        regla.actuador = parseActuador(reglaJson["act"] | "CALEFACTOR");
        regla.accion = parseEstado(reglaJson["estado"] | "APAGADO");
        
        _configActual.reglas[_configActual.total_reglas] = regla;
        _configActual.total_reglas++;
    }

    Serial.println("[LittleFS] Configuración cargada con éxito. Perfil: " + _configActual.crop_profile);
    return _configActual;
}

void FileManager::_crearConfiguracionPorDefecto() {
    Serial.println(F("[LittleFS] Creando perfil inicial (MODO FUNGI PMV) por defecto..."));
    
    _configActual.greenhouse_id = "FUNGI_CHAMBER_01";
    _configActual.crop_profile  = "Fungi_Fruiting_v1";
    _configActual.max_manual_time_ms = 900000; // 15 minutos

    _configActual.failsafes.watchdog_timeout_ms       = 10000;
    _configActual.failsafes.max_internal_temp_limit_c = 30.0;

    _configActual.total_reglas = 0;
    
    // Reglas por defecto emulando la antigua histéresis
    // Temp < 20 -> Calefactor ON
    _configActual.reglas[0] = {VariableFisica::TEMP, OperadorLogico::MENOR_QUE, 20.0f, ActuadorFisico::CALEFACTOR, EstadoDeseado::ENCENDIDO};
    // Temp > 21 -> Calefactor OFF
    _configActual.reglas[1] = {VariableFisica::TEMP, OperadorLogico::MAYOR_QUE, 21.0f, ActuadorFisico::CALEFACTOR, EstadoDeseado::APAGADO};
    // Hum < 87 -> Niebla ON
    _configActual.reglas[2] = {VariableFisica::HUMEDAD, OperadorLogico::MENOR_QUE, 87.0f, ActuadorFisico::NIEBLA, EstadoDeseado::ENCENDIDO};
    // Hum > 90 -> Niebla OFF
    _configActual.reglas[3] = {VariableFisica::HUMEDAD, OperadorLogico::MAYOR_QUE, 90.0f, ActuadorFisico::NIEBLA, EstadoDeseado::APAGADO};
    // CO2 > 800 -> Extractor ON
    _configActual.reglas[4] = {VariableFisica::CO2, OperadorLogico::MAYOR_QUE, 800.0f, ActuadorFisico::EXTRACTOR, EstadoDeseado::ENCENDIDO};
    
    _configActual.total_reglas = 5;

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

    JsonArray reglasJson = doc.createNestedArray("reglas");
    for (int i = 0; i < config.total_reglas; i++) {
        JsonObject reglaJson = reglasJson.createNestedObject();
        reglaJson["var"] = stringifyVariable(config.reglas[i].variable);
        reglaJson["op"] = stringifyOperador(config.reglas[i].operador);
        reglaJson["val"] = config.reglas[i].valor;
        reglaJson["act"] = stringifyActuador(config.reglas[i].actuador);
        reglaJson["estado"] = stringifyEstado(config.reglas[i].accion);
    }

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
    
    // Extraer reglas si existen en el JSON, sino mantener las actuales
    if (doc.containsKey("reglas")) {
        JsonArray reglasJson = doc["reglas"];
        nuevaConfig.total_reglas = 0;
        for (JsonObject reglaJson : reglasJson) {
            if (nuevaConfig.total_reglas >= 20) break;
            
            ReglaTermodinamica regla;
            regla.variable = parseVariable(reglaJson["var"] | "TEMP");
            regla.operador = parseOperador(reglaJson["op"] | "IGUAL");
            regla.valor = reglaJson["val"] | 0.0f;
            regla.actuador = parseActuador(reglaJson["act"] | "CALEFACTOR");
            regla.accion = parseEstado(reglaJson["estado"] | "APAGADO");
            
            nuevaConfig.reglas[nuevaConfig.total_reglas] = regla;
            nuevaConfig.total_reglas++;
        }
    } else {
        // Copiar las actuales si el JSON no trajo reglas
        nuevaConfig.total_reglas = _configActual.total_reglas;
        for (int i = 0; i < _configActual.total_reglas; i++) {
            nuevaConfig.reglas[i] = _configActual.reglas[i];
        }
    }
    
    _configActual = nuevaConfig;
    return guardarConfiguracion(_configActual);
}
