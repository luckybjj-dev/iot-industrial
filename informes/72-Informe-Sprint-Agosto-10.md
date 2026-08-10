# Informe de Sprint (10 de Agosto)
**Fase:** Refactorización Arquitectónica y Estandarización del SCADA

## 1. Resumen Ejecutivo
Durante este sprint, el sistema abandonó las conexiones heredadas basadas en MQTT y API REST (Mock) para migrar hacia un ecosistema de Telemetría y Control Dinámico respaldado de manera 100% nativa por Firebase Realtime Database. Adicionalmente, se estandarizó toda la Enciclopedia de Cultivos a un formato universal de 4 fases biológicas, inyectando parámetros agronómicos de grado comercial.

## 2. Implementaciones Clave

### A. Estandarización de Perfiles de Cultivo (4 Fases Universales)
- Se eliminó el formato inestable de 5 fases.
- **Fungi:** 1. Incubación, 2. Inducción, 3. Fructificación, 4. Descanso.
- **Plantae:** 1. Germinación, 2. Vegetativo, 3. Floración, 4. Maduración.
- Se inyectó una nueva enciclopedia comercial con **20 especies de alto valor** (10 Fungi, incluyendo *Psilocybe cubensis*, y 10 Plantae), investigadas con parámetros estrictos (Temp, Humedad, CO2, VPD, Fotoperiodo y FAE).

### B. Migración de Base de Datos y Motor SCADA
- El `CropStatePanel.tsx` ahora lee y escribe los comandos directamente en los nodos de Firebase (`devices/{deviceId}/commands`).
- Se eliminó el uso de endpoints heredados (`steeringService.stopSteeringPlan`).
- El botón de "Detener Plan" ahora vacía correctamente los targets enviando valores `null` a Firebase, deteniendo instantáneamente el Crop Steering en el hardware.

### C. Refactorización del Interfaz y Caché
- Se construyó el algoritmo `getCustomProfiles()` para interceptar el `localStorage`, garantizando que cualquier perfil antiguo con 5 fases se recorte, reenumere y migre automáticamente "al vuelo" para no romper la interfaz del usuario.

## 3. Reglas y Estándares Adquiridos
Se incorporaron reglas de persistencia (Local Rules) para regir el comportamiento del equipo de agentes:
1. **`estandar-trabajo.md`:** Regla estricta de 6 pasos. Obliga al Agente a esperar retroalimentación de las pruebas empíricas del usuario antes de avanzar.
2. **`arquitectura-firebase.md`:** Instrucción crítica que prohíbe el uso de MQTT para el control bidireccional (Setpoints).
3. **`metodologia-parametros-agronomicos.md`:** Regla científica que establece el marco y el mapeo agronómico exacto para futuras incorporaciones de perfiles a la enciclopedia.

## 4. Estado Actual y Próximos Pasos
El sistema actual es estable y el Crop Steering responde bidireccionalmente.
- **Siguiente Hito Recomendado:** Diseño e implementación de **Sistema de Alertas / Notificaciones Push** para el monitoreo de límites críticos del hardware o desviaciones microclimáticas.
