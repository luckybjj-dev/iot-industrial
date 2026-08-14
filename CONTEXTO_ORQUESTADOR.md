# Contexto del Orquestador (Antigravity)

Este archivo actúa como el "Cerebro Compartido" del Agente Orquestador. Al estar dentro de la carpeta del proyecto, puede ser leído y gestionado tanto desde el Antigravity IDE como desde la aplicación de escritorio Antigravity 2.0.

## 📌 Estado Actual del Proyecto
- **Fase:** Post-MVP (v1.0.0) — En corrección de deuda técnica tras Auditoría Integral V3.
- **Puntuación de Auditoría:** 7.0/10
- **Arquitectura:** PLC Agnóstico de 3 Capas. React (SCADA) inyecta CropProfiles con setpoints. ESP32 ejecuta termodinámica determinista con Árbitro de Conflictos, filtro EWMA (α=0.1) y PID Time-Proportioning.
- **Comunicación:** Firebase RTDB directo (SSE Streams). **NO se usa MQTT.**
- **Sprints Completados:** 17

## 🔴 Siguiente Tarea Activa (Deuda Crítica)

Las siguientes 3 correcciones son **bloqueantes** para la seguridad del sistema:

1. **Corregir bug de Safe Mode:** Cuando ambos DHTs fallan, `ewma_temp` se congela en su último valor válido (no -999.0f), impidiendo que el sistema entre en Safe Mode. El calefactor opera a ciegas. **Riesgo de incendio.**
   - Archivo: `HardwareController.cpp:167,247`
   - Esfuerzo: ~2h

2. **Activar Watchdog de Hardware:** Conectar `watchdog_timeout_ms` del CropProfile a `esp_task_wdt_init()` + feed en `loop()`.
   - Archivo: `main.cpp`
   - Esfuerzo: ~1h

3. **Rotar credenciales Firebase:** Regenerar API Key, cambiar password. Purgar `Secrets.h` del historial Git.
   - Archivos: `.git` history, Firebase Console
   - Esfuerzo: ~2h

## 📝 Instrucciones para el Agente
Si un nuevo agente lee este archivo desde otra plataforma:
1. Asume el rol de Orquestador Principal.
2. Lee la regla `arquitectura-firebase.md` en `.agents/rules/` — **NO uses MQTT**.
3. Revisa [`docs/AUDITORIA_INTEGRAL_V3_2026-08-14.md`](docs/AUDITORIA_INTEGRAL_V3_2026-08-14.md) para el listado completo de deuda técnica (18 hallazgos).
4. Revisa [`docs/INFORME_MAESTRO_AGRIEDGE_OS.md`](docs/INFORME_MAESTRO_AGRIEDGE_OS.md) para contexto histórico completo.
5. Continúa directamente con la corrección del **bug de Safe Mode** en `HardwareController.cpp` a menos que el usuario indique lo contrario.
