# Informe 31 — Resolución Bootloop ESP32, Corrección Dangling Pointers ArduinoJson y Estabilización Sistema

**Fecha:** 29 de Agosto de 2026  
**Versión Firmware:** post-v30 (Release)  
**Archivos Modificados:** FileManager.cpp, FirebaseManager.cpp, main.cpp, SemaforoEstabilidad.tsx

---

## 1. Causa Raíz — Dangling Pointers en ArduinoJson 6

### FileManager.cpp
El operador | de ArduinoJson 6 con String retorna const char* apuntando a la memoria interna del DynamicJsonDocument doc. Al destruirse doc al final de guardarConfiguracionJson(), los String de nuevaConfig quedan con dangling pointers. En guardarConfiguracion(_configActual) el acceso a memoria inválida produce Guru Meditation Error: LoadProhibited Core 0 y SW_CPU_RESET → bootloop.

### FirebaseManager.cpp
El mismo patrón | false para booleanos de actuadores hacía que todos los relés se forzaran a false al recibir el JSON de /commands, bloqueando el modo MANUAL.

## 2. Solución
- FileManager.cpp: Todas las asignaciones String → .as<String>() con containsKey() defensivo
- FirebaseManager.cpp: Booleanos → .as<bool>() para actuadores MANUAL
- main.cpp: Renderizado inmediato en setup() con hw.leerSensores() + display.render()
- SemaforoEstabilidad.tsx: Bug || → && en detección FALLO CRÍTICO (NTC es sensor opcional)
- Plugin Antigravity: Tarea programada Windows (AntigravityPluginFix) con stub permanente

## 3. Verificación
- tsc -b + vite build: SUCCESS, 0 errores
- PlatformIO: SUCCESS (RAM 16.4% / Flash 61.9%)
- Upload COM9: SUCCESS (1,222,896 bytes)
- Telemetría viva Firebase: estado_operacional MANUAL, fogger_on true, 20.6°C / 49.1% HR
- Usuario validó funcionamiento (Tier 2): APROBADO

## 4. Deuda Técnica Residual
- Sensor capacitivo suelo ADC: Pendiente llegada hardware
- Crop Steering E2E: Roadmap ítem 18
- Notificaciones Push Telegram/FCM: Roadmap ítem 19
