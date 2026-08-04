#pragma once
// ============================================================
// FirebaseManager.h
// Capa de integración asíncrona con Firebase RTDB (Mobizt v4+)
//
// EDUCACIONAL:
// Esta clase maneja toda la comunicación con Firebase Realtime Database (RTDB)
// utilizando la librería de Mobizt (Firebase ESP32 Client).
// Se encarga de:
// 1. Configurar los credenciales y la URL de la base de datos.
// 2. Manejar la autenticación (con usuario/contraseña o token).
// 3. Mantener la conexión activa y reconectar si es necesario.
// 4. Enviar datos de telemetría (sensores y actuadores) en formato JSON.
// 5. Opcionalmente, escuchar cambios en la base de datos (Streams) para recibir comandos.
// ============================================================
#include <Arduino.h>
#include <FirebaseESP32.h>
#include "Secrets.h"
#include "HardwareController.h"
#include "FileManager.h"
#include <ArduinoJson.h>

class FirebaseManager {
public:
    FirebaseManager(const String& deviceId, HardwareController& hw, FileManager& fm);
    
    // Inicializa la conexión y autenticación
    void begin();
    
    // Debe ser llamado en loop() frecuentemente para procesar tareas asíncronas de Firebase
    void loop();
    
    // Publica la telemetría actual a la RTDB
    void publicarTelemetria();
    
    // Publica el historial
    void publicarHistorial();
    
    // Verifica si Firebase está autenticado y conectado
    bool isConnected() const;

    // Actualizar Device ID
    void setDeviceId(const String& id) { _deviceId = id; }

private:
    String _deviceId;
    HardwareController& _hw;
    FileManager& _fm;

    // --- Firebase Core Objects ---
    // FirebaseConfig: Almacena la configuración (URL de base de datos, API Key, etc.)
    FirebaseConfig _config;
    
    // FirebaseAuth: Almacena los datos de autenticación (Email/Password, Custom Token, etc.)
    FirebaseAuth _auth;
    
    // FirebaseData: Objeto utilizado para realizar las operaciones de lectura/escritura en la base de datos.
    // Mantiene la sesión y procesa los datos HTTP que se envían y reciben de los servidores de Firebase.
    FirebaseData _fbdo;
    FirebaseData _fbdoStream;
    
    // Bandera de estado
    bool _conectado = false;
    bool _streamConfigurado = false;
    bool _forzarTelemetria = false;
    unsigned long _ultimoIntento = 0;
    
    // No async callbacks needed for simple FirebaseESP32
    
    // Handlers para Stream (Configuraciones y Comandos)
    bool configurarStreams();
    static void streamCallback(StreamData data);
    static void streamTimeoutCallback(bool timeout);

    // Mantenemos una instancia estática para que los callbacks puedan acceder a la clase
    static FirebaseManager* _instancia;

    void _procesarPayloadStream(const String& path, const String& data);
};
