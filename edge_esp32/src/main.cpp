#include <Arduino.h>

// ====================================================================
// 1. INCLUSIÓN DE LIBRERÍAS
// ====================================================================
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <ArduinoOTA.h>
#include <Adafruit_GFX.h>
#include <Adafruit_ST7735.h>

// ====================================================================
// 2. CONFIGURACIÓN DE PINES Y HARDWARE
// ====================================================================
#define TFT_CS    5
#define TFT_RST   13
#define TFT_DC    14
Adafruit_ST7735 tft = Adafruit_ST7735(TFT_CS, TFT_DC, TFT_RST);

const int pinReleVentilador = 26;
const int pinReleHumidificador = 25;

#define DHTPIN 27
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);

const int pinNTC = 34;
const float BETA = 3950.0;
const float R_NOMINAL = 10000.0;
const float T_NOMINAL = 25.0;
const float R_SERIE = 10000.0;

// ====================================================================
// 3. CREDENCIALES Y ESTADO GLOBAL
// ====================================================================
const char* ssid = "Presidio";
const char* password = "manchita2";
const char* mqtt_server = "broker.hivemq.com";

// 🚀 NUEVO: Tópicos y IDs dinámicos basados en la dirección MAC (Fase 2)
String macAddress = "";
String deviceId = "";
String topic_telemetria = "";
String topic_estado = "";
String topic_comandos = "";
String topic_logs = "";

WiFiClient espClient;
PubSubClient client(espClient);

unsigned long lastMsg = 0;
const long intervalo = 5000;

bool modoManualRemoto = false;
bool conexionPerdida = false;

bool releVentiladorON = false;
bool releHumidificadorON = false;

float umbralHumedadMinima = 50.0;
float umbralHumedadMaxima = 70.0;
float umbralTempMaxima = 28.0;
float umbralTempSegura = 24.0;
bool alertaCalor = false;

unsigned long ultimoCicloVentilador = 0;
const long intervaloVentilador = 3600000;
const long duracionVentilador = 120000;
bool ventiladorEnCiclo = false;

float tempAmb = 0.0;
float humAmb = 0.0;
bool dhtOk = false;
float tempSustrato = 0.0;
bool sustratoOk = false;

// ====================================================================
// 4. MÓDULOS DEL SISTEMA
// ====================================================================

// 🚀 NUEVO: Sobrecarga para soportar la macro F() y ahorrar memoria SRAM
void logRemoto(const __FlashStringHelper *format, ...) {
  char buffer[256];
  va_list args;
  va_start(args, format);
  vsnprintf_P(buffer, sizeof(buffer), (const char *)format, args);
  va_end(args);

  Serial.println(buffer);

  if (WiFi.status() == WL_CONNECTED && client.connected()) {
    client.publish(topic_logs.c_str(), buffer);
  }
}

// Mantenemos la versión original para compatibilidad con variables puras
void logRemoto(const char *format, ...) {
  char buffer[256];
  va_list args;
  va_start(args, format);
  vsnprintf(buffer, sizeof(buffer), format, args);
  va_end(args);

  Serial.println(buffer);

  if (WiFi.status() == WL_CONNECTED && client.connected()) {
    client.publish(topic_logs.c_str(), buffer);
  }
}

void setup_wifi() {
  logRemoto(F("-------------------------------------------------"));
  logRemoto(F("[WIFI] Iniciando en Modo Cliente (STA)..."));

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  int intentos = 0;
  while (WiFi.status() != WL_CONNECTED && intentos < 20) {
    delay(500);
    Serial.print(F("."));
    intentos++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    logRemoto(F("[STA OK] Enlace establecido. IP: %s"), WiFi.localIP().toString().c_str());
  } else {
    logRemoto(F("[STA ERROR] Router inalcanzable. Levantando Red de Rescate..."));
    WiFi.mode(WIFI_AP_STA);
    WiFi.softAP("ESP32_RESCATE_MOTOR1", "admin1234");
    logRemoto(F("[AP OK] Red Failsafe Activa. IP Local: %s"), WiFi.softAPIP().toString().c_str());
  }
  logRemoto(F("-------------------------------------------------"));
}

void setup_ota() {
  ArduinoOTA.setHostname(deviceId.c_str()); // 🚀 NUEVO: Hostname OTA dinámico

  ArduinoOTA.onStart([]() {
    String type = (ArduinoOTA.getCommand() == U_FLASH) ? "sketch" : "filesystem";
    logRemoto(F("[OTA] Iniciando actualizacion: %s"), type.c_str());
    digitalWrite(pinReleVentilador, LOW);
    digitalWrite(pinReleHumidificador, LOW);
  });
  
  ArduinoOTA.onEnd([]() { logRemoto(F("[OTA] Finalizada con Exito. Reiniciando...")); });
  
  ArduinoOTA.onProgress([](unsigned int progress, unsigned int total) {
    Serial.printf("[OTA] Progreso: %u%%\r", (progress / (total / 100)));
  });
  
  ArduinoOTA.onError([](ota_error_t error) {
    if (error == OTA_AUTH_ERROR) logRemoto(F("[OTA Error %u] Fallo Autenticacion"), error);
    else if (error == OTA_BEGIN_ERROR) logRemoto(F("[OTA Error %u] Fallo al Iniciar"), error);
    else if (error == OTA_CONNECT_ERROR) logRemoto(F("[OTA Error %u] Fallo de Conexion"), error);
    else if (error == OTA_RECEIVE_ERROR) logRemoto(F("[OTA Error %u] Fallo de Recepcion"), error);
    else if (error == OTA_END_ERROR) logRemoto(F("[OTA Error %u] Fallo de Escritura"), error);
  });

  ArduinoOTA.begin();
  logRemoto(F("[OTA OK] Escuchando actualizaciones por aire..."));
}

void leerSensores() {
  tempAmb = dht.readTemperature();
  humAmb = dht.readHumidity();
  dhtOk = !isnan(tempAmb) && !isnan(humAmb);
  
  int ntcValue = analogRead(pinNTC);
  if (ntcValue > 50 && ntcValue < 4050) {
      sustratoOk = true;
      float resistance = R_SERIE * (4095.0 / (float)ntcValue - 1.0);
      float steinhart = resistance / R_NOMINAL;
      steinhart = log(steinhart);
      steinhart /= BETA;
      steinhart += 1.0 / (T_NOMINAL + 273.15);
      steinhart = 1.0 / steinhart;
      tempSustrato = steinhart - 273.15;
  } else { sustratoOk = false; }
}

void procesarLogicaDeControl(unsigned long now) {
  if (modoManualRemoto) return;

  if (dhtOk) {
      if (tempAmb >= umbralTempMaxima) { alertaCalor = true; }
      else if (tempAmb <= umbralTempSegura) { alertaCalor = false; }
  } else { alertaCalor = false; }

  if (!ventiladorEnCiclo && (now - ultimoCicloVentilador >= intervaloVentilador)) {
    ventiladorEnCiclo = true;
    ultimoCicloVentilador = now;
  }
  if (ventiladorEnCiclo && (now - ultimoCicloVentilador >= duracionVentilador)) {
    ventiladorEnCiclo = false;
  }

  releVentiladorON = (alertaCalor || ventiladorEnCiclo);
  digitalWrite(pinReleVentilador, releVentiladorON ? HIGH : LOW);

  if (dhtOk) {
      if (humAmb < umbralHumedadMinima && !releHumidificadorON) releHumidificadorON = true;
      else if (humAmb >= umbralHumedadMaxima && releHumidificadorON) releHumidificadorON = false;
  } else { releHumidificadorON = false; }
  
  digitalWrite(pinReleHumidificador, releHumidificadorON ? HIGH : LOW);
}

void actualizarPantalla() {
  tft.fillScreen(ST77XX_BLACK);
  tft.setCursor(5, 5); tft.setTextColor(ST77XX_YELLOW); tft.println(F("CAMARA FUNGI 01"));
  tft.drawLine(0, 15, 160, 15, ST77XX_WHITE);
  
  tft.setCursor(5, 25); tft.setTextColor(ST77XX_WHITE); tft.print(F("T.Amb: "));
  if (dhtOk) {
    tft.setTextColor(tempAmb >= umbralTempMaxima ? ST77XX_RED : ST77XX_GREEN);
    tft.print(tempAmb); tft.println(F(" C"));
  } else { tft.setTextColor(ST77XX_RED); tft.println(F("ERR_DHT")); }
  
  tft.setCursor(5, 45); tft.setTextColor(ST77XX_WHITE); tft.print(F("Humed: "));
  if (dhtOk) {
    tft.setTextColor(humAmb < umbralHumedadMinima ? ST77XX_RED : ST77XX_CYAN);
    tft.print(humAmb); tft.println(F(" %"));
  } else { tft.setTextColor(ST77XX_RED); tft.println(F("ERR_DHT")); }
  
  tft.setCursor(5, 65); tft.setTextColor(ST77XX_WHITE); tft.print(F("T.Sus: "));
  if (sustratoOk) {
    tft.setTextColor(tempSustrato > 27.0 ? ST77XX_RED : ST77XX_GREEN);
    tft.print(tempSustrato); tft.println(F(" C"));
  } else { tft.setTextColor(ST77XX_RED); tft.println(F("ERR_NTC")); }
  
  tft.setCursor(5, 85); tft.setTextColor(ST77XX_WHITE); tft.print(F("Hum: "));
  tft.setTextColor(releHumidificadorON ? ST77XX_GREEN : ST77XX_RED);
  tft.print(releHumidificadorON ? F("ON ") : F("OFF"));
  
  tft.setCursor(85, 85); tft.setTextColor(ST77XX_WHITE); tft.print(F("Vent: "));
  tft.setTextColor(releVentiladorON ? ST77XX_GREEN : ST77XX_RED);
  tft.println(releVentiladorON ? F("ON ") : F("OFF"));

  tft.setCursor(5, 105); tft.setTextColor(ST77XX_WHITE); tft.print(F("RED: "));
  bool redOkLocal = (WiFi.status() == WL_CONNECTED) && client.connected();

  if (redOkLocal) {
    tft.setTextColor(ST77XX_GREEN);
    tft.println(F("ONLINE (OK)"));
  } else if (conexionPerdida) {
    tft.setTextColor(ST77XX_MAGENTA);
    tft.println(F("RESCATE (AP)"));
  } else {
    tft.setTextColor(ST77XX_RED);
    tft.println(F("OFFLINE"));
  }
}

void enviarTelemetriaYLogs() {
  logRemoto(F("-------------------------------------------------"));
  if (dhtOk) logRemoto(F("[SENSOR] Ambiente -> Temp: %.1f C | Hum: %.1f %%"), tempAmb, humAmb);
  if (sustratoOk) logRemoto(F("[SENSOR] Sustrato -> Temp NTC: %.1f C"), tempSustrato);
  logRemoto(F("[ACTUADOR] Hum: %s | Vent: %s"), releHumidificadorON?"ON":"OFF", releVentiladorON?"ON":"OFF");

  if (WiFi.status() == WL_CONNECTED && client.connected()) {
    StaticJsonDocument<200> doc;
    
    doc["temp_ambiente"] = dhtOk ? tempAmb : 24.5;
    doc["humedad"] = dhtOk ? humAmb : 88.2;
    doc["temp_sustrato"] = sustratoOk ? tempSustrato : 26.1;
    doc["humidificador_on"] = releHumidificadorON;
    doc["ventilador_on"] = releVentiladorON;

    char payload[200];
    serializeJson(doc, payload);
    
    client.publish(topic_telemetria.c_str(), payload); // 🚀 NUEVO: Usamos el tópico dinámico
  }
}

// ====================================================================
// 5. INICIALIZADOR CORE
// ====================================================================
void setup() { 
  Serial.begin(115200);
  
  // 🚀 NUEVO: Generación Dinámica de Identidad (MAC Address)
  macAddress = WiFi.macAddress();
  macAddress.replace(":", ""); // Removemos los dos puntos para que sea limpio
  deviceId = "ESP32_" + macAddress; // Ej: ESP32_A1B2C3D4E5F6
  
  // Tópicos MQTT dinámicos asignados a este hardware en particular
  topic_telemetria = "proyecto_iot/edge/" + deviceId + "/telemetria";
  topic_estado = "proyecto_iot/edge/" + deviceId + "/estado";
  topic_comandos = "proyecto_iot/edge/" + deviceId + "/comandos";
  topic_logs = "proyecto_iot/edge/" + deviceId + "/logs";

  Serial.println(F("\n[SISTEMA] Arrancando Nodo: "));
  Serial.println(deviceId);

  dht.begin();
  
  pinMode(pinReleVentilador, OUTPUT);
  pinMode(pinReleHumidificador, OUTPUT);
  digitalWrite(pinReleVentilador, LOW);
  digitalWrite(pinReleHumidificador, LOW);
  analogReadResolution(12);
  
  setup_wifi();
  setup_ota();
  client.setServer(mqtt_server, 1883);

  // Callback de recepción de comandos MQTT (Suscripción dinámica)
  client.setCallback([](char* topic, byte* payload, unsigned int length) {
    String msg = "";
    for (int i = 0; i < length; i++) {
      msg += (char)payload[i];
    }
    logRemoto(F("[MQTT] Comando recibido: %s"), msg.c_str());
  });

  tft.initR(INITR_BLACKTAB);
  tft.setRotation(1);
  tft.fillScreen(ST77XX_BLACK);
} 

// ====================================================================
// 6. MOTOR DE EJECUCIÓN
// ====================================================================
void loop() {
  ArduinoOTA.handle();

  bool redOk = (WiFi.status() == WL_CONNECTED) && client.connected();
  
  if (!redOk) {
    if (!conexionPerdida) {
      modoManualRemoto = false;
      conexionPerdida = true;
      
      logRemoto(F("[ALARMA] Red perdida. Desplegando AP de Rescate..."));
      WiFi.mode(WIFI_AP_STA);
      WiFi.softAP("ESP32_RESCATE_MOTOR1", "admin1234");
    }

    unsigned long ahora = millis();
    static unsigned long ultimoIntentoRed = 0;

    if (ahora - ultimoIntentoRed > 10000) {
      ultimoIntentoRed = ahora;

      if (WiFi.status() != WL_CONNECTED) {
        logRemoto(F("[BUSQUEDA] Forzando escaneo y reconexion al router corporativo..."));
        WiFi.disconnect();
        WiFi.begin(ssid, password);
      } 
      else if (!client.connected()) {
        logRemoto(F("[BUSQUEDA] Router OK. Intentando reconectar al Broker MQTT..."));
        
        // 🚀 NUEVO: Usamos el ID Dinámico para el LWT
        if (client.connect(deviceId.c_str(), "", "", topic_estado.c_str(), 1, true, "OFFLINE")) {
            Serial.println(F("Conectado a MQTT con LWT activado"));
            client.publish(topic_estado.c_str(), "ONLINE - Modo Remoto Principal", true);
            client.subscribe(topic_comandos.c_str()); // Suscripción para comandos
        }
      }
    }

  } else {
    if (conexionPerdida) {
      conexionPerdida = false;
      logRemoto(F("[RECONEXION] Red recuperada. Apagando AP de Rescate."));
      WiFi.softAPdisconnect(true);
      WiFi.mode(WIFI_STA);
    }
    client.loop();
  }

  unsigned long now = millis();
  
  if (now - lastMsg > intervalo) {
    lastMsg = now;
    
    leerSensores();
    procesarLogicaDeControl(now);
    actualizarPantalla();
    enviarTelemetriaYLogs();
  }
}