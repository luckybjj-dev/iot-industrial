#include "FirebaseManager.h"

// ============================================================
// Puntero estático para callbacks
// Como las funciones de callback de Firebase (Streams) deben ser
// estáticas o globales, usamos un puntero a la instancia actual
// para poder acceder a los miembros no estáticos de la clase.
// ============================================================
FirebaseManager* FirebaseManager::_instancia = nullptr;

FirebaseManager::FirebaseManager(const String& deviceId, HardwareController& hw, FileManager& fm)
    : _deviceId(deviceId),
      _hw(hw),
      _fm(fm)
{
    _instancia = this;
}

// ============================================================
// begin()
// Flujo de Autenticación con Firebase:
// 1. Se asignan la URL de la base de datos y la API Key a `_config`.
// 2. Se asignan las credenciales de usuario (Email y Password) a `_auth`.
//    Firebase ESP32 Client soporta varios métodos de autenticación; 
//    aquí usamos "Email/Password provider".
// 3. Se llama a `Firebase.begin(&_config, &_auth)` lo cual inicializa 
//    el cliente en segundo plano e intenta obtener un idToken de autenticación.
// 4. `Firebase.reconnectWiFi(true)` instruye a la librería para que 
//    reintente conectar el WiFi si se cae la conexión.
// ============================================================
void FirebaseManager::begin() {
    Serial.println(F("[Firebase] Iniciando SDK..."));
    
    _config.database_url = FIREBASE_DATABASE_URL;
    _config.api_key = FIREBASE_API_KEY;
    _auth.user.email = FIREBASE_USER_EMAIL;
    _auth.user.password = FIREBASE_USER_PASSWORD;

    Firebase.begin(&_config, &_auth);
    Firebase.reconnectWiFi(true);

    Serial.println(F("[Firebase] Autenticando..."));
    
    // Lanzar un intento de lectura simple para confirmar que la autenticación fue exitosa y estamos listos
    String path = "/telemetry/" + _deviceId + "/status";
    Firebase.setString(_fbdo, path, "ONLINE - Motor Agnostico");
    
    configurarStreams();
}

// ============================================================
// loop()
// Esta función debe ser llamada periódicamente en el loop principal (main loop).
// Firebase.ready() hace un par de cosas vitales internamente:
// - Mantiene el token de autenticación actualizado (refresca el token si va a expirar).
// - Retorna true si el dispositivo está conectado al WiFi y la autenticación
//   con Firebase está vigente.
// Es crucial llamar a esta función antes de realizar escrituras/lecturas.
// ============================================================
void FirebaseManager::loop() {
    if (Firebase.ready()) {
        _conectado = true;
    } else {
        _conectado = false;
    }
}

bool FirebaseManager::isConnected() const {
    return _conectado;
}

// ============================================================
// publicarTelemetria()
// Push de Telemetría en Tiempo Real:
// 1. Se obtienen los datos actuales de los sensores y actuadores
//    a través de `HardwareController`.
// 2. Se construye un objeto `FirebaseJson` añadiendo pares clave-valor.
//    Usar FirebaseJson es más eficiente para actualizar múltiples nodos a la vez 
//    (como un payload) y consume menos ancho de banda/tiempo en comparacion a
//    hacer múltiples llamadas `Firebase.setInt`, `Firebase.setFloat`, etc.
// 3. Se define la ruta de la base de datos (path) donde se escribirá.
// 4. `Firebase.setJSON()` serializa y envía el payload a Firebase Realtime Database
//    por medio de una petición HTTP/HTTPS RESTual de forma síncrona/bloqueante.
//    Existen también métodos asíncronos si se requiere evitar bloqueos en el loop.
// ============================================================
void FirebaseManager::publicarTelemetria() {
    if (!isConnected()) return;

    const SensorData&   s = _hw.getSensores();
    const ActuadorData& a = _hw.getActuadores();

    FirebaseJson json;

    if (s.dhtOk) {
        json.set("temp_aire", s.tempAmb);
        json.set("humedad_aire", s.humAmb);
        json.set("vpd", s.vpd);
    }
    if (s.analogicoOk) {
        json.set("sensor_analogico", s.valorAnalogico);
    }
    if (s.co2Ok) {
        json.set("co2_ppm", s.co2);
    }

    json.set("heater_on", a.heater_ON);
    json.set("fogger_on", a.fogger_ON);
    json.set("extractor_on", a.extractor_ON);
    json.set("light_on", a.light_ON);
    
    json.set("dht_ok", s.dhtOk);
    json.set("analogico_ok", s.analogicoOk);

    String path = "/telemetry/" + _deviceId + "/data";
    
    // Usamos setJSON()
    if (!Firebase.setJSON(_fbdo, path, json)) {
        Serial.print(F("[Firebase] Error publicando telemetría: "));
        Serial.println(_fbdo.errorReason());
    }
}

void FirebaseManager::configurarStreams() {
    // Escuchar comandos manuales y configuraciones en RTDB
    String streamPath = "/devices/" + _deviceId;
    Serial.println(F("[Firebase] Preparando suscripciones futuras (Stream)."));
}
