# 🚀 Informe de Hito: Versión 1.0.0 (MVP)

**Fecha:** Agosto 2026  
**Fase:** Validación HIL (Hardware-in-the-Loop) Completada  
**Estado Actual:** MVP Listo para Despliegue Real en Producción

---

## 1. Resumen Ejecutivo
Nos complace informar que el **Motor Agnóstico IoT y Gestor SCADA** ha superado con éxito todas las pruebas físicas de relés y validaciones de firmware, alcanzando el estatus de **Producto Mínimo Viable (MVP)**. El sistema está capacitado para operar ambientes agrícolas de alta complejidad (CEA) de forma totalmente automatizada, segura y resiliente frente a cortes de conectividad.

Se ha logrado el objetivo principal del proyecto: **Desacoplar la agronomía del hardware**. El ESP32 funciona como un PLC (Autómata) industrial, mientras que React y Firebase actúan como el cerebro agronómico.

## 2. Arquitectura de Hardware Consolidada (ESP32 Wemos D1 R32)
Durante este hito, se superaron desafíos críticos relacionados con las limitaciones físicas de la placa y se logró una asignación de pines óptima:
*   **Gestión Ambiental:** 
    *   **Calefactor (Relé)**: GPIO 16
    *   **Enfriador / Peltier (Relé)**: GPIO 17 (Reemplazando pines sin header físico).
    *   **Extractor (Relé)**: GPIO 26
    *   **Humidificador / Fogger (Relé)**: GPIO 27
    *   **Luz (Relé, Activo LOW)**: GPIO 14
*   **Redundancia Sensorial (Fail-Safe):**
    *   Implementación de redundancia ambiental promediada entre el **DHT22** (GPIO 4) y la **Sonda NTC2** (GPIO 35).
    *   Soporte para temperatura de **Sustrato (NTC1)** en GPIO 34.

## 3. Desafíos Superados y Lecciones Aprendidas
A lo largo del desarrollo, nos enfrentamos a *bugs* profundos y silenciosos que fueron neutralizados exitosamente:
1.  **Desbordamiento de Memoria JSON:** El ESP32 ignoraba los perfiles agronómicos complejos debido a que superaban el buffer predeterminado de ArduinoJson (1024 bytes). **Solución:** Expansión de buffers estáticos a dinámicos de 4096 bytes en `FirebaseManager` y `FileManager`.
2.  **Bloqueo de Hardware en Modo Manual:** El stream de Firebase (RTDB) ignoraba comandos booleanos puros al estar esperando estructuras anidadas JSON. **Solución:** Refactorización del `streamCallback` en C++ para procesar datos primitivos instantáneos, permitiendo control manual de 0 latencia.
3.  **Flickering (Parpadeo) en TFT:** El repintado constante de la pantalla LCD SPI causaba destellos perjudiciales. **Solución:** Implementación de *Dirty Checking* y borrado selectivo de cajas delimitadoras en `DisplayManager`.
4.  **Desincronización Estado-UI:** Los tiempos de expiración (*timeouts*) del modo manual generaban estados fantasma. **Solución:** React asume control preventivo y el ESP32 inyecta un failsafe a los 5 minutos con retroalimentación vía RTDB.

## 4. Capacidades Actuales del SCADA (Frontend)
El Dashboard web ya no es un prototipo, es una herramienta industrial:
*   **Topología ISA-95:** Navegación lógica jerárquica (Granja > Nave > Zona > Nodo).
*   **Telemetría Histórica:** Gráficos multivariable impulsados por Recharts, capaces de digerir 30 días de datos históricos y superponer VPD, Temperatura y Humedad en tiempo real.
*   **Gestor de Perfiles 2.0:** Enciclopedia biológica dividida entre Fungi (Shiitake, Ostra) y Plantae (Tomate, Cannabis), inyectando dinámicamente metas termodinámicas (Crop Steering) con consejos empíricos contextuales por etapa fenológica.

## 5. Conclusión
El código actual en la rama `main` representa un **sistema sólido, seguro e implementable**. Estamos oficialmente preparados para cerrar la fase beta e instalar las primeras unidades en invernaderos o cámaras de cultivo físicas.
