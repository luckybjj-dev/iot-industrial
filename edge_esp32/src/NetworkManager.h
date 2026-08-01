// NetworkManager.h
/*
 * ======================================================================================
 * ARCHITECTURE OVERVIEW: NetworkManager
 * ======================================================================================
 * Esta clase orquesta la conectividad WiFi de manera autónoma y no bloqueante.
 * 
 * Conceptos Educativos Clave:
 * 1. MULTIHILO CON FreeRTOS (Core 0): 
 *    El ESP32 es dual-core. Por defecto, Arduino ejecuta setup() y loop() en el Core 1.
 *    Aquí, movemos toda la carga de red (WiFi, HTTP, DNS) al Core 0 (Pro Core) usando 
 *    FreeRTOS. Así evitamos que la conexión a internet congele el programa principal.
 * 
 * 2. PORTAL CAUTIVO (Captive Portal): 
 *    Si el dispositivo falla en conectarse a un router (credenciales malas o ausentes), 
 *    pasa a modo "Access Point" (emite su propio WiFi). Un servidor DNS intercepta 
 *    todo el tráfico y fuerza al móvil del usuario a abrir nuestra página web local 
 *    para ingresar la contraseña del WiFi de su casa.
 * 
 * 3. NTP (Network Time Protocol): 
 *    Una vez con acceso a internet, el sistema se sincroniza con servidores mundiales 
 *    de tiempo (pool.ntp.org) para corregir el reloj de tiempo real (RTC) interno. 
 *    Esto permite tener la hora exacta para logs, cronogramas y fotoperiodos.
 * ======================================================================================
 */
#ifndef NETWORK_MANAGER_H // Comprobamos si NETWORK_MANAGER_H aún no ha sido definido por el compilador
#define NETWORK_MANAGER_H // Definimos la macro NETWORK_MANAGER_H para evitar colisiones de inclusión múltiple

#include <Arduino.h> // Incluimos las definiciones y tipos base del framework oficial de Arduino/ESP32
#include <WiFi.h> // Incluimos la librería oficial que maneja la radio de conexión WiFi del hardware
#include <ESPAsyncWebServer.h> // Incluimos la poderosa librería externa para el servidor web no bloqueante
#include <DNSServer.h> // Incluimos el servicio DNS necesario para redirigir forzosamente todo tráfico al portal
#include <Preferences.h> // Incluimos el gestor de memoria Flash No-Volátil (NVS) para salvar credenciales
#include <time.h> // Incluimos la librería estándar C nativa para el manejo y sincronización de relojes (NTP)

class NetworkManager { // Declaramos explícitamente nuestra nueva clase orquestadora de redes
public: // Abrimos el bloque de acceso público para exponer métodos hacia el orquestador main.cpp
    NetworkManager(); // Declaramos el constructor por defecto de la clase
    void iniciar(); // Declaramos el método principal que disparará las tareas de FreeRTOS
    bool estaConectado() const; // Declaramos un método consultor (getter) para validar en tiempo real si hay internet
    bool estaEnModoAP() const; // Getter para consultar si el AP de rescate está activo
    void sincronizarReloj(); // Declaramos el método manual para forzar actualización de hora contra pool.ntp.org
    String getHoraActual() const; // Extrae la hora actual del RTC interno ya sincronizado
    int getHoraInt() const; // Devuelve la hora del día en entero (0-23) para lógica de fotoperiodo

private: // Abrimos el bloque de acceso privado (estricto encapsulamiento OOP)
    static Preferences preferencias; // Declaramos instancia estática de NVS, requerida por callbacks asíncronos de FreeRTOS
    static AsyncWebServer servidor; // Declaramos el servidor HTTP estático, operando de fábrica en el puerto 80
    static DNSServer dnsServer; // Declaramos el servidor DNS estático que orquestará el Portal Cautivo

    static bool modoAP; // Declaramos una bandera booleana para rastrear si estamos operando como Access Point
    static bool debeReiniciar; // Declaramos una bandera de seguridad para aislar el comando de reseteo del hilo HTTP

    static void tareaRed(void * parametro); // Declaramos el prototipo de la tarea principal que se anclará al Core 0
    static void configurarPortal(); // Declaramos el método modular que enrutará todos los Endpoints (GET/POST) web
}; // Fin absoluto de la definición de la clase NetworkManager

#endif // Fin de la directiva condicional del preprocesador
