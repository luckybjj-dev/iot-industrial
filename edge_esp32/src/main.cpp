// ====================================================================
// main.cpp — Cámara Fungi Inteligente
// Sprint 7: Arquitectura Modular OOP
// ====================================================================
/* 
 * ARQUITECTURA DEL SISTEMA:
 * Este archivo actúa como el punto de entrada (Entry Point) y el orquestador 
 * principal del firmware de la Cámara Fungi. La arquitectura sigue el paradigma 
 * de Programación Orientada a Objetos (OOP), dividiendo las responsabilidades 
 * en módulos altamente cohesivos y con bajo acoplamiento:
 * 
 * - HardwareController: Abstrae y maneja toda la interacción física (sensores, relés, etc.).
 * - NetworkManager: Encargado de la conectividad WiFi y el portal cautivo asíncrono.
 * - FirebaseManager: Gestiona la comunicación segura y en tiempo real con la base de datos (RTDB).
 * - DisplayManager: Administra la interfaz visual de usuario (pantalla TFT).
 * - FileManager: Maneja el sistema de archivos (LittleFS) para persistir configuraciones.
 * 
 * POR QUÉ ESTA ESTRUCTURA:
 * Separar el código en estas clases permite que main.cpp sea intencionalmente
 * minimalista. Su única misión es:
 *   1. Instanciar los objetos del sistema.
 *   2. Inicializarlos ordenadamente en la función setup().
 *   3. Llamar a sus métodos de actualización de estado de forma concurrente 
 *      y no bloqueante dentro de la función loop().
 * Toda la lógica de negocio profunda (qué encender, cómo conectar, etc.) 
 * reside encapsulada en los módulos correspondientes. Esto facilita el
 * mantenimiento, las pruebas y la escalabilidad del código.
 */
// ====================================================================
#include <Arduino.h>
#include <WiFi.h>
#include <esp_task_wdt.h>
#include "Secrets.h"
#include "HardwareController.h"
#include "NetworkManager.h"
#include "FirebaseManager.h"
#include "DisplayManager.h"
#include <ArduinoOTA.h>

#ifndef OTA_PASSWORD
#define OTA_PASSWORD "agriedge2026"
#endif

// --------------------------------------------------------------------
// NOTA: Las credenciales WiFi se gestionan EXCLUSIVAMENTE mediante el
// Portal Cautivo (NetworkManager). No se hardcodean aquí por seguridad
// comercial. El dispositivo arrancará en modo AP si la NVS está vacía.
// --------------------------------------------------------------------

// --------------------------------------------------------------------
// Identidad dinámica del nodo (basada en MAC Address)
// --------------------------------------------------------------------
static String deviceId;

// --------------------------------------------------------------------
// Instanciación de módulos del sistema
// (Se usa forward-declaration implícita de deviceId)
// --------------------------------------------------------------------
/*
 * CÓMO SE INICIALIZAN LOS MÓDULOS:
 * Se instancian globalmente para que vivan durante toda la ejecución.
 * Nótese cómo algunos objetos reciben referencias a otros en su constructor 
 * (Inyección de Dependencias). Por ejemplo, DisplayManager necesita saber el 
 * estado del hardware, la red y firebase para dibujarlos en pantalla.
 */
FileManager        fileManager;
HardwareController hw;
NetworkManager     net;
FirebaseManager    firebase(deviceId, hw, fileManager);
DisplayManager     display(hw, net, firebase);

// --------------------------------------------------------------------
// Temporizadores asíncronos del loop
// --------------------------------------------------------------------
static unsigned long _ultimoCiclo = 0;
static constexpr long INTERVALO_CICLO = 5000L; // ms

static unsigned long _ultimoHistorial = 0;
static constexpr long INTERVALO_HISTORIAL = 300000L; // ms (5 minutos)

static bool _otaIniciado = false;

// ====================================================================
// SETUP - Inicialización del Sistema
// ====================================================================
/*
 * EL PROPÓSITO DEL SETUP:
 * La función setup() prepara el microcontrolador justo después del encendido.
 * El orden aquí es crítico:
 * 1. Serial: Para debug inmediato.
 * 2. Identidad: Necesaria para el resto de módulos (por ejemplo, para reportarse en Firebase).
 * 3. File System (LittleFS): Para cargar parámetros de configuración guardados antes de mover el hardware.
 * 4. Hardware: Inicializa pines y sensores con la configuración recién cargada.
 * 5. Red y Cloud: Se lanza la conectividad.
 * 6. Display: Arranca la interfaz visual ya con todos los demás componentes inicializados.
 */
void setup() {
    Serial.begin(115200);

    // Generar ID dinámico basado en la MAC Address del ESP32 antes de pasarlo a los managers.
    // Esto garantiza que cada dispositivo de la red sea único sin necesidad de hardcodear IDs.
    String mac = WiFi.macAddress();
    mac.replace(":", "");
    deviceId = "ESP32_" + mac;

    Serial.print(F("\n[SISTEMA] Arrancando Nodo: "));
    Serial.println(deviceId);

    fileManager.begin(); // Montar LittleFS (Sistema de archivos interno)
    hw.setConfiguracion(fileManager.cargarConfiguracion()); // Inyectar cerebro dinámico leyendo desde la memoria flash
    
    hw.begin();       // Configura los pines GPIO, sensores DHT de humedad/temp, y sonda NTC
    
    NetworkManager::setHardwareController(&hw); 
    net.iniciar();    // Inicia el Portal Cautivo Asíncrono (típicamente se delega al Core 0 para no frenar al resto del sistema)

    firebase.setDeviceId(deviceId); // Actualiza el ID dinámico antes de inicializar la nube
    // RETIRADO DEL SETUP: firebase.begin() ahora se iniciará de forma segura en el loop() solo cuando haya Internet.

    display.begin();  // Inicializar y encender la pantalla TFT

    // Lectura inicial inmediata para mostrar métricas en TFT desde el segundo 0
    hw.leerSensores();
    hw.procesarLogicaDeControl(millis(), net.getHoraInt());
    display.render();

    // 7. Hardware Watchdog Timer (WDT)
    // Previene cuelgues permanentes si un handshake TLS o bucle interno se bloquea.
    uint32_t wdtSec = hw.getConfiguracion().failsafes.watchdog_timeout_ms / 1000;
    if (wdtSec < 5) wdtSec = 15; // Mínimo de seguridad 15 segundos
    Serial.printf("[SISTEMA] Inicializando Hardware Watchdog (%u s)...\n", wdtSec);
    esp_task_wdt_init(wdtSec, true);
    esp_task_wdt_add(NULL); // Suscribir la tarea principal (loop) al Watchdog
}

// ====================================================================
// LOOP — Bucle Principal Totalmente No Bloqueante
// ====================================================================
/*
 * LA ARQUITECTURA DEL LOOP (NO BLOQUEANTE):
 * En un sistema IoT moderno, la función loop() NUNCA debe usar delay().
 * Usar delay() detendría el procesador por completo, causando desconexiones
 * de WiFi, pérdida de datos y una interfaz congelada.
 * 
 * En su lugar, usamos una arquitectura manejada por eventos y tiempo (millis()):
 * 1. Cada iteración del loop verifica rápidamente si hay tareas pendientes (por ejemplo, OTA o Firebase).
 * 2. Si ha transcurrido un delta de tiempo (INTERVALO_CICLO), ejecuta tareas pesadas como
 *    leer sensores o actualizar la pantalla.
 * 3. Si no ha pasado el tiempo, el ciclo termina instantáneamente y vuelve a empezar,
 *    permitiendo que los procesos en segundo plano (FreeRTOS) respiren.
 */
void loop() {
    // 0. Alimentar Hardware Watchdog en cada iteración del bucle principal
    esp_task_wdt_reset();

    // 0.1 Modulación rápida de alta frecuencia para el calefactor SSR (Time-Proportioning)
    hw.actualizarModulacionSSR(millis());

    // 1. Evaluación de Red (NetworkManager maneja WiFi internamente en Core 0)
    bool redOk = net.estaConectado();
    static bool _firebaseIniciado = false;

    if (redOk) {
        // Inicialización Segura (Lazy Init) de Firebase
        if (!_firebaseIniciado) {
            Serial.println(F("[SISTEMA] Red OK. Inicializando Firebase SDK de forma segura..."));
            firebase.begin();
            _firebaseIniciado = true;
        }

        // Inicialización "Lazy" (perezosa) de OTA (Over The Air):
        // Solo intentamos arrancar el servicio de actualización inalámbrica si el WiFi está listo.
        if (!_otaIniciado) {
            ArduinoOTA.setHostname(deviceId.c_str());
            // SEGURIDAD: Password requerido para flashear firmware via WiFi
            ArduinoOTA.setPassword(OTA_PASSWORD);
            // CALLBACKS: Desconectar Firebase durante el flash para evitar
            // competencia de CPU/heap que causa el fallo al 100% de OTA
            ArduinoOTA.onStart([]() {
                Serial.println(F("[OTA] Inicio de flash... Deteniendo Firebase para liberar Heap/Sockets."));
                firebase.end();
            });
            ArduinoOTA.onEnd([]() {
                Serial.println(F("[OTA] Flash completado. Reiniciando..."));
            });
            ArduinoOTA.onError([](ota_error_t error) {
                Serial.printf("[OTA] Error [%u]: ", error);
                if (error == OTA_AUTH_ERROR) Serial.println(F("Auth Failed"));
                else if (error == OTA_BEGIN_ERROR) Serial.println(F("Begin Failed"));
                else if (error == OTA_CONNECT_ERROR) Serial.println(F("Connect Failed"));
                else if (error == OTA_RECEIVE_ERROR) Serial.println(F("Receive Failed"));
                else if (error == OTA_END_ERROR) Serial.println(F("End Failed"));
            });
            ArduinoOTA.begin();
            _otaIniciado = true;
            Serial.println(F("[OTA] Servicio inalambrico listo y a la escucha."));
        }
        // Atiende peticiones entrantes de actualización de firmware de forma asíncrona.
        ArduinoOTA.handle();

        // Mantiene viva (keep-alive) la conexión asíncrona a Firebase y procesa mensajes entrantes.
        firebase.loop(); 
    }

    // 2. Control de Tiempo Asíncrono
    // millis() devuelve la cantidad de milisegundos desde que la placa se encendió.
    unsigned long now = millis();

    // 3. Ciclo de sensores, control y telemetría (se ejecuta una vez cada INTERVALO_CICLO ms)
    if (now - _ultimoCiclo > INTERVALO_CICLO) {
        // Actualizamos el marcador de tiempo
        _ultimoCiclo = now;

        // TAREAS PERIÓDICAS:
        // A) Leer el estado físico del mundo (Sensores).
        hw.leerSensores();
        
        // B) Evaluar la lógica, revisar parámetros de control y ejecutar acciones físicas si aplica.
        hw.procesarLogicaDeControl(now, net.getHoraInt());
        
        // C) Actualizar la interfaz gráfica de la pantalla para el usuario local.
        display.render();
        
        // D) Enviar los nuevos datos recolectados hacia la nube.
        if (net.estaConectado()) {
            firebase.publicarTelemetria();
        }
    }

    // 4. Ciclo de Historial (se ejecuta una vez cada INTERVALO_HISTORIAL ms)
    if (now - _ultimoHistorial > INTERVALO_HISTORIAL) {
        _ultimoHistorial = now;
        
        if (net.estaConectado()) {
            firebase.publicarHistorial();
        }
    }
}