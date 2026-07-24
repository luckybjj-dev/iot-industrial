#include <Arduino.h>         // Framework base obligatorio para compilar código C++ en el entorno PlatformIO

// ====================================================================
// 1. INCLUSIÓN DE LIBRERÍAS (Dependencias del sistema)
// ====================================================================
#include <WiFi.h>            // Driver nativo del chip ESP32 para gestionar conectividad inalámbrica (STA y AP)
#include <PubSubClient.h>    // Librería ligera para implementar el protocolo de telemetría industrial MQTT
#include <ArduinoJson.h>     // Librería para empaquetar y desempaquetar variables en formato estructurado JSON
#include <DHT.h>             // Driver de hardware para interpretar los pulsos eléctricos del sensor de clima DHT22
#include <ArduinoOTA.h>      // Módulo interno para habilitar la sobreescritura de la memoria Flash por WiFi (Over-The-Air)
#include <Adafruit_GFX.h>    // Motor de renderizado gráfico universal para dibujar formas geométricas y textos
#include <Adafruit_ST7735.h> // Controlador específico para traducir el renderizado a la pantalla TFT SPI de 1.77"

// ====================================================================
// 2. CONFIGURACIÓN DE PINES Y HARDWARE (Mapeo físico para la Cámara Fungi)
// ====================================================================
// Configuración de la Pantalla LCD (Bus SPI)
#define TFT_CS    5          // Pin 5 asignado al "Chip Select" (Habilita que el ESP32 hable con la pantalla)
#define TFT_RST   13         // Pin 13 asignado al "Reset" (Permite reiniciar la pantalla físicamente si se congela)
#define TFT_DC    14         // Pin 14 asignado a "Data/Command" (Avisa si los bits enviados son colores o comandos)
Adafruit_ST7735 tft = Adafruit_ST7735(TFT_CS, TFT_DC, TFT_RST); // Crea el objeto 'tft' con los pines mapeados

// Actuadores de la Cámara Fungi (Relés 3.3V)
const int pinReleVentilador = 26;    // Pin 26 asignado al relé que enciende el extractor de CO2 (Renovación de aire o FAE)
const int pinReleHumidificador = 25; // Pin 25 asignado al relé que enciende el generador de niebla ultrasónica

// Sensor de Clima Ambiental (DHT22)
#define DHTPIN 27            // Pin 27 asignado para recibir el tren de pulsos de datos del sensor ambiental
#define DHTTYPE DHT22        // Constante que le indica a la librería el algoritmo matemático a usar (DHT22)
DHT dht(DHTPIN, DHTTYPE);    // Crea el objeto 'dht' instanciando el pin y el modelo

// Sensor Interno de Sustrato (Termistor NTC 10K 3950)
const int pinNTC = 34;           // Pin analógico 34 asignado para medir las variaciones de voltaje de la sonda
const float BETA = 3950.0;       // Constante física Beta del termistor para resolver la ecuación termodinámica
const float R_NOMINAL = 10000.0; // Valor resistivo de calibración de fábrica (10,000 Ohmios a temperatura ideal)
const float T_NOMINAL = 25.0;    // Temperatura estándar de calibración (25 grados Celsius)
const float R_SERIE = 10000.0;   // Resistencia física complementaria del circuito divisor de tensión (10K Ohmios)

// ====================================================================
// 3. CREDENCIALES Y ESTADO GLOBAL (Memoria dinámica en RAM)
// ====================================================================
const char* ssid = "Presidio";       // Define el nombre (SSID) del router WiFi local
const char* password = "manchita2";  // Define la clave de seguridad WPA2 del router WiFi
const char* mqtt_server = "broker.hivemq.com"; // Define la dirección del servidor público de mensajería MQTT

// --- CÓDIGO ANTIGUO (SUPRIMIDO) ---
// const char* topico_telemetria = "granja/camara_fungi_1/clima"; // Ruta MQTT antigua donde se enviaban los datos
// const char* topico_logs = "granja/camara_fungi_1/logs";        // Ruta MQTT antigua exclusiva para depuración

// --- CÓDIGO NUEVO (NUEVOS TÓPICOS MQTT OFICIALES SPRINT 3) ---
const char* topic_telemetria = "proyecto_iot/edge/telemetria";    // Nuevo canal de telemetría validado con Node.js
const char* topic_estado = "proyecto_iot/edge/estado";            // Nuevo canal para el estado del equipo y alarma LWT


WiFiClient espClient;           // Crea la instancia base para abrir conexiones de red TCP/IP
PubSubClient client(espClient); // Envuelve la conexión TCP/IP con los estándares del protocolo MQTT

unsigned long lastMsg = 0;   // Variable que guarda la última vez que se enviaron datos (inicia en 0)
const long intervalo = 5000; // Define el ciclo de recolección y envío en 5000 milisegundos (5 segundos)

bool modoManualRemoto = false; // Bandera de seguridad: si el servidor web toma el control, anula la automatización local
bool conexionPerdida = false;  // Bandera de diagnóstico: se vuelve 'true' cuando no hay router ni internet

bool releVentiladorON = false;    // Guarda en la memoria el estado de operación lógico del extractor
bool releHumidificadorON = false; // Guarda en la memoria el estado de operación lógico de la humedad

float umbralHumedadMinima = 50.0; // Punto bajo del higrostato: enciende el humidificador si baja del 50%
float umbralHumedadMaxima = 70.0; // Punto alto del higrostato: apaga el humidificador al alcanzar el 70%
float umbralTempMaxima = 28.0;    // Termostato crítico: enciende la extracción forzada si el micelio sufre calor
float umbralTempSegura = 24.0;    // Termostato de retorno: apaga la extracción forzada al bajar a temperatura óptima
bool alertaCalor = false;         // Bandera que indica si el sistema de emergencia por temperatura está activo

unsigned long ultimoCicloVentilador = 0;  // Guarda el reloj interno del último barrido de CO2 realizado
const long intervaloVentilador = 3600000; // Parámetro FAE: Frecuencia de renovación de aire (1 Hora en milisegundos)
const long duracionVentilador = 120000;   // Parámetro FAE: Tiempo que el motor estará encendido (2 Minutos en milisegundos)
bool ventiladorEnCiclo = false;           // Bandera que indica a la lógica si la renovación FAE está operando actualmente

float tempAmb = 0.0;     // Variable caché para la lectura inmediata de la temperatura del aire
float humAmb = 0.0;      // Variable caché para la lectura inmediata de la humedad del aire
bool dhtOk = false;      // Bandera de salud: 'true' si el DHT22 devolvió números reales (no nan)
float tempSustrato = 0.0;// Variable caché para la lectura térmica interna del bloque de cultivo
bool sustratoOk = false; // Bandera de salud: 'true' si el circuito analógico NTC no está roto ni cortocircuitado

// ====================================================================
// 4. MÓDULOS DEL SISTEMA (Arquitectura de Responsabilidad Única)
// ====================================================================

// --------------------------------------------------------------------
// TÍTULO: logRemoto()
// DESCRIPCIÓN: Wrapper Inteligente para enviar logs tanto por USB como por MQTT
// --------------------------------------------------------------------
void logRemoto(const char *format, ...) {
  char buffer[256]; // Reserva un espacio temporal de 256 caracteres en la memoria para ensamblar la oración
  
  va_list args; // Declara una lista para manejar múltiples variables dinámicas que entren a la función
  va_start(args, format); // Inicializa la lista leyendo las variables después del 'format'
  vsnprintf(buffer, sizeof(buffer), format, args); // Ensambla texto estático y variables dinámicas dentro del 'buffer'
  va_end(args); // Libera la memoria temporal de la lista de argumentos dinámicos

  Serial.println(buffer); // Imprime el buffer terminado directamente hacia el cable físico USB

  if (WiFi.status() == WL_CONNECTED && client.connected()) { // Verifica doblemente si hay internet para no colapsar la memoria
    // --- CÓDIGO ANTIGUO (SUPRIMIDO) ---
    // client.publish(topico_logs, buffer);  // Envía el texto ensamblado a la nube de Node.js a través del tópico MQTT
    
    // --- CÓDIGO NUEVO ---
    client.publish("proyecto_iot/edge/logs", buffer);  // Enrutamos los logs puros a una carpeta MQTT de soporte técnico
  }
}

// --------------------------------------------------------------------
// TÍTULO: setup_wifi()
// DESCRIPCIÓN: Inicializa la conexión corporativa o despliega Failsafe Sigiloso
// --------------------------------------------------------------------
void setup_wifi() {
  logRemoto("-------------------------------------------------"); // Dispara separador estético de logs
  logRemoto("[WIFI] Iniciando en Modo Cliente (STA)..."); // Informa inicio de protocolo de red por USB/MQTT

  WiFi.mode(WIFI_STA);               // Ordena al chip omitir su antena AP y encender solo como estación cliente
  WiFi.begin(ssid, password);        // Lanza la petición formal de conexión al router físico

  int intentos = 0;                  // Crea un contador para romper bucles infinitos en caso de router caído
  while (WiFi.status() != WL_CONNECTED && intentos < 20) { // Ciclo temporal: Espera 10 segundos máximos de respuesta
    delay(500);                      // Frena el procesador medio segundo
    Serial.print(".");               // Imprime un punto directo al USB (sin MQTT para no hacer spam)
    intentos++;                      // Aumenta el contador de reintentos
  }

  if (WiFi.status() == WL_CONNECTED) { // Evalúa: ¿El ciclo terminó porque la red se conectó?
    logRemoto("[STA OK] Enlace establecido. IP: %s", WiFi.localIP().toString().c_str()); // Imprime éxito y la IP recibida
  } else {                             // Evalúa: ¿El ciclo terminó porque se agotaron los 20 intentos?
    logRemoto("[STA ERROR] Router inalcanzable. Levantando Red de Rescate..."); // Logea fallo de conexión base
    WiFi.mode(WIFI_AP_STA);            // Transmuta la antena a modo dual: buscando router Y emitiendo WiFi de emergencia
    WiFi.softAP("ESP32_RESCATE_MOTOR1", "admin1234"); // Define SSID y Password para el Failsafe
    logRemoto("[AP OK] Red Failsafe Activa. IP Local: %s", WiFi.softAPIP().toString().c_str());   // Logea la IP por defecto (192.168.4.1)
  }
  logRemoto("-------------------------------------------------"); // Cierra el bloque visual del arranque
}

// --------------------------------------------------------------------
// TÍTULO: setup_ota()
// DESCRIPCIÓN: Levanta y configura los oyentes de actualizaciones inalámbricas
// --------------------------------------------------------------------
void setup_ota() {
  ArduinoOTA.setHostname("ESP32-Fungi1"); // Configura el nombre mDNS para detectar la placa fácil en la red

  ArduinoOTA.onStart([]() { // Evento interrupción: Se activa instantáneamente al recibir petición de VS Code
    String type = (ArduinoOTA.getCommand() == U_FLASH) ? "sketch" : "filesystem";  // Identifica si es firmware C++ o base de archivos
    logRemoto("[OTA] Iniciando actualizacion: %s", type.c_str()); // Avisa al backend que la placa va a reiniciarse
    digitalWrite(pinReleVentilador, LOW);   // APAGADO FAILSAFE: Mata el extractor para proteger el motor de fluctuaciones eléctricas
    digitalWrite(pinReleHumidificador, LOW);// APAGADO FAILSAFE: Mata la neblina para no saturar de humedad la placa base durante flasheo
  });
  
  ArduinoOTA.onEnd([]() { logRemoto("[OTA] Finalizada con Exito. Reiniciando..."); });  // Evento: Confirma cierre exitoso antes de reiniciar
  
  ArduinoOTA.onProgress([](unsigned int progress, unsigned int total) { // Evento continuo: Ejecutado durante cada bloque de bytes
    Serial.printf("[OTA] Progreso: %u%%\r", (progress / (total / 100))); // Envia el porcentaje solo por cable USB para no colapsar el MQTT
  });
  
  ArduinoOTA.onError([](ota_error_t error) { // Evento de Fallo: Captura colapsos durante la inyección inalámbrica
    if (error == OTA_AUTH_ERROR) logRemoto("[OTA Error %u] Fallo Autenticacion", error); // Maneja contraseña OTA incorrecta
    else if (error == OTA_BEGIN_ERROR) logRemoto("[OTA Error %u] Fallo al Iniciar", error); // Maneja memoria flash insuficiente
    else if (error == OTA_CONNECT_ERROR) logRemoto("[OTA Error %u] Fallo de Conexion", error); // Maneja corte de wifi repentino
    else if (error == OTA_RECEIVE_ERROR) logRemoto("[OTA Error %u] Fallo de Recepcion", error); // Maneja pérdida de integridad de bytes
    else if (error == OTA_END_ERROR) logRemoto("[OTA Error %u] Fallo de Escritura", error); // Maneja hardware dañado
  });

  ArduinoOTA.begin(); // Enciende formalmente el protocolo abriendo el puerto de red OTA
  logRemoto("[OTA OK] Escuchando actualizaciones por aire..."); // Confirma inicio del servicio
}

// --------------------------------------------------------------------
// TÍTULO: leerSensores()
// DESCRIPCIÓN: Algoritmos de lectura física y conversión matemática
// --------------------------------------------------------------------
void leerSensores() {
  tempAmb = dht.readTemperature();  // Ordena al microprocesador del DHT enviar valor en Grados Celsius
  humAmb = dht.readHumidity();      // Ordena al microprocesador del DHT enviar valor en Porcentaje de Humedad Relativa
  dhtOk = !isnan(tempAmb) && !isnan(humAmb); // Filtro lógico: Valida si la lectura es un número real, descartando ruido eléctrico
  
  int ntcValue = analogRead(pinNTC); // Toma la muestra cruda del divisor de voltaje de la sonda del sustrato (0 a 4095)
  if (ntcValue > 50 && ntcValue < 4050) { // Filtro de rotura: Valores extremos = cable desconectado o cortocircuitado
      sustratoOk = true;                 // Certifica que el hardware analógico está sano
      float resistance = R_SERIE * (4095.0 / (float)ntcValue - 1.0); // Transforma valor digital bruto a Resistencia Real (Ohmios)
      float steinhart = resistance / R_NOMINAL;          // Inicia Steinhart-Hart paso 1: R/Ro
      steinhart = log(steinhart);                        // Steinhart-Hart paso 2: logaritmo natural
      steinhart /= BETA;                                 // Steinhart-Hart paso 3: aplica el divisor Beta específico del sensor
      steinhart += 1.0 / (T_NOMINAL + 273.15);           // Steinhart-Hart paso 4: adiciona la temperatura nominal de fábrica calibrada
      steinhart = 1.0 / steinhart;                       // Steinhart-Hart paso 5: inversión del valor absoluto
      tempSustrato = steinhart - 273.15;                 // Steinhart-Hart paso 6: conversión final de Kelvin a escala Celsius
  } else { sustratoOk = false; }         // Deshabilita métrica de sustrato si el sensor reportó daño físico
}

// --------------------------------------------------------------------
// TÍTULO: procesarLogicaDeControl()
// DESCRIPCIÓN: Cerebro de automatización local basado en los requerimientos del micelio
// --------------------------------------------------------------------
void procesarLogicaDeControl(unsigned long now) {
  if (modoManualRemoto) return; // Si la plataforma web encendió el modo manual, salta toda automatización local (Override)

  if (dhtOk) { // Validación de coherencia: Si el DHT está roto, bloquea acciones térmicas erradas
      if (tempAmb >= umbralTempMaxima) { alertaCalor = true; } // Si la cámara fungi se asfixia, acciona bandera térmica
      else if (tempAmb <= umbralTempSegura) { alertaCalor = false; } // Si la cámara volvió a su zona segura (Histéresis), apaga bandera
  } else { alertaCalor = false; } // Apagado Failsafe: Evita dejar el ventilador prendido para siempre congelando el cultivo

  if (!ventiladorEnCiclo && (now - ultimoCicloVentilador >= intervaloVentilador)) { // Revisa el reloj: ¿Es hora del barrido de CO2?
    ventiladorEnCiclo = true;    // Inicia rutina de Renovación de Aire Fresco (FAE)
    ultimoCicloVentilador = now; // Registra la hora exacta en la que se disparó el evento
  }
  if (ventiladorEnCiclo && (now - ultimoCicloVentilador >= duracionVentilador)) { // Revisa el reloj: ¿Ya pasaron los 2 minutos de barrido?
    ventiladorEnCiclo = false;   // Corta el ciclo de barrido FAE
  }

  releVentiladorON = (alertaCalor || ventiladorEnCiclo); // El motor corre por 2 motivos: Peligro Térmico (Alarma) o Asfixia (CO2)
  digitalWrite(pinReleVentilador, releVentiladorON ? HIGH : LOW);  // Transforma decisión lógica a 3.3V o 0V hacia el actuador real

  if (dhtOk) { // Validación de coherencia: Si el higrómetro está roto, bloquea acciones de niebla erradas
      if (humAmb < umbralHumedadMinima && !releHumidificadorON) releHumidificadorON = true;  // Reseca inminente: Pide niebla
      else if (humAmb >= umbralHumedadMaxima && releHumidificadorON) releHumidificadorON = false; // Saturación: Corta la niebla
  } else { releHumidificadorON = false; } // Apagado Failsafe: Corta el agua si el sensor muere (evita ahogar hongos y electrónica)
  
  digitalWrite(pinReleHumidificador, releHumidificadorON ? HIGH : LOW); // Transforma decisión a voltaje físico
}

// --------------------------------------------------------------------
// TÍTULO: actualizarPantalla()
// DESCRIPCIÓN: Pinta los datos crudos y estado de red en la interfaz HMI física
// --------------------------------------------------------------------
void actualizarPantalla() {
  tft.fillScreen(ST77XX_BLACK); // Saneamiento VRAM: Pinta todo de negro para borrar mediciones del ciclo anterior
  tft.setCursor(5, 5); tft.setTextColor(ST77XX_YELLOW); tft.println("CAMARA FUNGI 01");  // Inyecta cabecera amarilla de máquina
  tft.drawLine(0, 15, 160, 15, ST77XX_WHITE); // Traza un rectángulo línea de 1 pixel horizontal para dividir zona UI
  
  tft.setCursor(5, 25); tft.setTextColor(ST77XX_WHITE); tft.print("T.Amb: "); // Dibuja la palabra Temperatura Ambiente
  if (dhtOk) { // Evalúa integridad de hardware para decidir qué dibujar
    tft.setTextColor(tempAmb >= umbralTempMaxima ? ST77XX_RED : ST77XX_GREEN);  // Render Condicional: Verde es sano, Rojo es peligro térmico
    tft.print(tempAmb); tft.println(" C"); // Plasma la métrica flotante con su unidad de medida
  } else { tft.setTextColor(ST77XX_RED); tft.println("ERR_DHT"); } // Si el hardware falla, dibuja advertencia de Hardware Roto
  
  tft.setCursor(5, 45); tft.setTextColor(ST77XX_WHITE); tft.print("Humed: "); // Dibuja palabra Humedad
  if (dhtOk) { // Evalúa integridad de hardware
    tft.setTextColor(humAmb < umbralHumedadMinima ? ST77XX_RED : ST77XX_CYAN); // Render: Cyan para nivel óptimo, Rojo para nivel seco
    tft.print(humAmb); tft.println(" %"); // Dibuja el nivel porcentual higrométrico
  } else { tft.setTextColor(ST77XX_RED); tft.println("ERR_DHT"); } // Log visual de daño de sensor
  
  tft.setCursor(5, 65); tft.setTextColor(ST77XX_WHITE); tft.print("T.Sus: "); // Etiqueta del bloque de sustrato (Micelio central)
  if (sustratoOk) { // Evalúa la salud analógica del pin
    tft.setTextColor(tempSustrato > 27.0 ? ST77XX_RED : ST77XX_GREEN); // Render: Sobre 27 C el micelio muere (Rojo), normal es Verde
    tft.print(tempSustrato); tft.println(" C"); // Dibuja la temperatura térmica calculada
  } else { tft.setTextColor(ST77XX_RED); tft.println("ERR_NTC"); } // Logea daño visual si se muerde/corta el cable
  
  tft.setCursor(5, 85); tft.setTextColor(ST77XX_WHITE); tft.print("Hum: "); // Dibuja la indicación de relé húmedo
  tft.setTextColor(releHumidificadorON ? ST77XX_GREEN : ST77XX_RED); // Define paleta visual basada en el estado booleano
  tft.print(releHumidificadorON ? "ON " : "OFF"); // Imprime el texto dinámico correspondiente al relé
  
  tft.setCursor(85, 85); tft.setTextColor(ST77XX_WHITE); tft.print("Vent: "); // Dibuja indicador de relé ventilador
  tft.setTextColor(releVentiladorON ? ST77XX_GREEN : ST77XX_RED); // Define la paleta de encendido o apagado
  tft.println(releVentiladorON ? "ON " : "OFF"); // Imprime el texto dinámico del actuador de aire

  // --- CÓDIGO NUEVO: INDICADOR VISUAL DE RED Y TELEMETRÍA EN TIEMPO REAL PARA EL TÉCNICO ---
  tft.setCursor(5, 105); tft.setTextColor(ST77XX_WHITE); tft.print("RED: "); 
  bool redOkLocal = (WiFi.status() == WL_CONNECTED) && client.connected(); // Evalúa salud de enlace TCP/IP y MQTT

  if (redOkLocal) {
    tft.setTextColor(ST77XX_GREEN);
    tft.println("ONLINE (OK)"); // Imprime estado normal: Router y Broker respondiendo
  } else if (conexionPerdida) {
    tft.setTextColor(ST77XX_MAGENTA);
    tft.println("RESCATE (AP)"); // Imprime estado de emergencia: Failsafe emitiendo Wi-Fi local
  } else {
    tft.setTextColor(ST77XX_RED);
    tft.println("OFFLINE");     // Imprime alerta crítica: Router caído o buscando señal
  }
}

// --------------------------------------------------------------------
// TÍTULO: enviarTelemetriaYLogs()
// DESCRIPCIÓN: Empaquetado JSON y puente hacia el backend Node.js
// --------------------------------------------------------------------
void enviarTelemetriaYLogs() {
  logRemoto("-------------------------------------------------"); // Separador temporal para ubicar el ciclo en la consola remota
  if (dhtOk) logRemoto("[SENSOR] Ambiente -> Temp: %.1f C | Hum: %.1f %%", tempAmb, humAmb); // Despacha lectura válida del aire
  if (sustratoOk) logRemoto("[SENSOR] Sustrato -> Temp NTC: %.1f C", tempSustrato); // Despacha lectura válida de la masa fúngica
  logRemoto("[ACTUADOR] Hum: %s | Vent: %s", releHumidificadorON?"ON":"OFF", releVentiladorON?"ON":"OFF"); // Despacha estado de relés

  if (WiFi.status() == WL_CONNECTED && client.connected()) {  // Barrera de protección: si MQTT cayó, salta el envío JSON
    StaticJsonDocument<200> doc; // Instancia un espacio en RAM de 200 bytes para crear el árbol JSON temporal
    
    // --- CÓDIGO ANTIGUO (SUPRIMIDO) ---
    // doc["temp_ambiente"] = dhtOk ? tempAmb : 0.0;    // Inserta key-value. Failsafe BD: si sensor roto, envía 0 para no guardar nan
    // doc["humedad"] = dhtOk ? humAmb : 0.0;           // Inserta key-value. Failsafe BD: si sensor roto, envía 0 para no guardar nan
    // doc["temp_sustrato"] = sustratoOk ? tempSustrato : 0.0; // Inserta termistor. Failsafe BD aplicado
    // doc["humidificador_on"] = releHumidificadorON;   // Adjunta telemetría del actuador húmedo
    // doc["ventilador_on"] = releVentiladorON;         // Adjunta telemetría del actuador eólico
    // doc["modo_manual"] = modoManualRemoto;           // Inserta indicador de seguridad de control de nube
    
    // --- CÓDIGO NUEVO: CONTRATO ESTRICTO TYPESCRIPT ---
    // Obligatorio para que Node.js no rechace el JSON. Las llaves deben ser exactas a la Interface.
    doc["temp_ambiente"] = dhtOk ? tempAmb : 24.5;           // Insertamos temperatura del aire (con valor base si falla el sensor)
    doc["humedad"] = dhtOk ? humAmb : 88.2;                  // Insertamos humedad del aire (con valor base si falla)
    doc["temp_sustrato"] = sustratoOk ? tempSustrato : 26.1; // Insertamos la térmica del micelio
    doc["humidificador_on"] = releHumidificadorON;           // Insertamos estado del relé de humedad
    doc["ventilador_on"] = releVentiladorON;                 // Insertamos estado del ventilador extractor

    char payload[200]; // Prepara un bus vacío tipo vector de caracteres para guardar el serializado
    serializeJson(doc, payload); // Convierte el modelo de datos jerárquico a texto plano puro y lo inyecta al payload
    
    // --- CÓDIGO ANTIGUO (SUPRIMIDO) ---
    // client.publish(topico_telemetria, payload); // Dispara la carga útil completa hacia HiveMQ a través del Socket TCP
    
    // --- CÓDIGO NUEVO ---
    client.publish(topic_telemetria, payload); // Dispara el JSON hacia el nuevo tópico centralizado
  }
}

// ====================================================================
// 5. INICIALIZADOR CORE (Configuración del ciclo de arranque del ESP32)
// ====================================================================
void setup() { 
  Serial.begin(115200); // Activa los canales RX/TX del puerto USB para Logs nativos de 115200 baudios
  dht.begin();          // Levanta la alimentación e inicialización interna del chip ambiental DHT22
  
  pinMode(pinReleVentilador, OUTPUT);    // Configura compuerta GPIO 26 en modo emisión de voltaje eléctrico
  pinMode(pinReleHumidificador, OUTPUT); // Configura compuerta GPIO 25 en modo emisión de voltaje eléctrico
  digitalWrite(pinReleVentilador, LOW);  // Garantiza estado de máquina muerta al enchufar enviando voltaje 0
  digitalWrite(pinReleHumidificador, LOW);// Garantiza estado de máquina muerta al enchufar enviando voltaje 0
  analogReadResolution(12); // Transmuta el medidor analógico a nivel microscópico (Escala digital de 12 Bits)
  
  setup_wifi();  // Invoca el inicio del ciclo de arquitectura de internet
  setup_ota();   // Inyecta y enciende el sistema servidor Over The Air interno
  client.setServer(mqtt_server, 1883); // Configura en memoria el DNS del broker y el puerto estándar industrial (1883)

  tft.initR(INITR_BLACKTAB); // Inicia secuencias SPI del controlador pantalla usando mapa de memoria BLACKTAB
  tft.setRotation(1);        // Ajusta la polarización de los pixeles rotando 90 grados la vista
  tft.fillScreen(ST77XX_BLACK); // Forja capa negra absoluta para iniciar el dashboard visual sin ruido
} 

// ====================================================================
// 6. MOTOR DE EJECUCIÓN (Bucle infinito de procesamiento Edge)
// ====================================================================
void loop() {
  ArduinoOTA.handle(); // El Watchdog del OTA examina eternamente si alguien lanzó un archivo vía WiFi

  // MÁQUINA DE ESTADOS: Failsafe Sigiloso y Watchdog de Red
  bool redOk = (WiFi.status() == WL_CONNECTED) && client.connected(); // Asignación compuesta: True solo si hay Router Y Broker
  
  if (!redOk) { // Ruta de Caída: Si la validación de red reportó una falla...
    if (!conexionPerdida) { // Valida si es el exacto primer instante en que se detecta el corte...
      modoManualRemoto = false; // El Edge anula controles web por emergencia y retoma el algoritmo interno
      conexionPerdida = true;   // Actualiza memoria: asume que estamos en estado aislado local
      
      logRemoto("[ALARMA] Red perdida. Desplegando AP de Rescate..."); // Logea falla
      WiFi.mode(WIFI_AP_STA); // Despierta antena de transmisión interna Failsafe
      WiFi.softAP("ESP32_RESCATE_MOTOR1", "admin1234"); // Lanza el servicio de rescate SSID
    }

    // MOTOR DE BÚSQUEDA ACTIVA NO-BLOQUEANTE (Watchdog Activo)
    unsigned long ahora = millis(); // Captura tiempo total para comparar pausas de reconexión
    static unsigned long ultimoIntentoRed = 0; // Memoria estática: solo se inicia una vez en 0

    if (ahora - ultimoIntentoRed > 10000) { // Evalúa delta temporal: ¿Han pasado 10 segundos desde el último intento?
      ultimoIntentoRed = ahora; // Actualiza el punto de inicio para la próxima cuenta de 10 seg

      if (WiFi.status() != WL_CONNECTED) { // Escenario Router Caído: Intentamos volver a la empresa
        logRemoto("[BUSQUEDA] Forzando escaneo y reconexion al router corporativo..."); // Log remoto/usb
        WiFi.disconnect();          // Fuerza apagado de sesión MAC para evitar ciclos cacheados (Limpieza de Buffer)
        WiFi.begin(ssid, password); // Ordena disparo forzado de negociación de credenciales al router WiFi
      } 
      else if (!client.connected()) { // Escenario Nube Caída: El Router está vivo, pero HiveMQ no responde
        logRemoto("[BUSQUEDA] Router OK. Intentando reconectar al Broker MQTT..."); // Log remoto/usb
  // --- MODIFICADO: ELIMINAMOS EL ID RANDOM PARA EVITAR "FANTASMAS" ---
        // String clientId = "ESP32_Fungi_" + String(random(0xffff), HEX); // Algoritmo: ID dinámico hexadecimal anti colisiones
        String clientId = "ESP32_Fungi_Master"; // ID Estático y único     

        // --- CÓDIGO ANTIGUO (SUPRIMIDO) ---
        // client.connect(clientId.c_str()); // Despacha paquete de autenticación hacia la capa MQTT
        
        // --- CÓDIGO NUEVO: INYECCIÓN DE LAST WILL AND TESTAMENT (LWT) ---
        // Cuando el ESP32 se conecta, le deja una "carta" de testamento al broker. 
        // Si el ESP32 pierde energía, el broker publicará "OFFLINE" en el topic_estado avisando al servidor Node.js
        if (client.connect(clientId.c_str(), "", "", topic_estado, 1, true, "OFFLINE")) {
            Serial.println("Conectado a MQTT con LWT activado");
            // Inmediatamente al conectarnos con éxito, publicamos que estamos vivos y operando
            client.publish(topic_estado, "ONLINE - Modo Remoto Principal", true); // Retained = true para que el broker guarde el último estado
        }
      }
    }

  } else { // Ruta de Sanidad: Si el router Y el broker están perfectos...
    if (conexionPerdida) { // Valida si el sistema recién regresó de estar muerto...
      conexionPerdida = false; // Purga el flag de falla, regresando el equipo a normalidad
      logRemoto("[RECONEXION] Red recuperada. Apagando AP de Rescate."); // Logea el éxito
      WiFi.softAPdisconnect(true); // KILL SWITCH de Failsafe: Ordena apagar por completo y destruir la transmisión WiFi de rescate
      WiFi.mode(WIFI_STA);         // Modifica el estado del chip de radio forzándolo exclusivamente a modo Receptor Cliente (Stealth)
    }
    client.loop(); // Directiva obligatoria del núcleo PubSubClient para vaciar buffer y dar acuse de recibo de paquetes MQTT
  }

  // CEREBRO DE EJECUCIÓN TEMPORIZADO (Bucle Sensor-Actuador de 5 Segundos)
  unsigned long now = millis(); // Atrapa el tick de CPU actual en milisegundos
  
  if (now - lastMsg > intervalo) { // Resta la hora actual menos el último registro, y evalúa si pasaron los 5000 ms
    lastMsg = now; // Reemplaza la hora del último registro para setear el próximo ciclo
    
    leerSensores();               // EJECUTA subrutina para extraer voltajes físicos y actualiza las variables float globales
    procesarLogicaDeControl(now); // EJECUTA análisis comparativo de FAE, Humedad y Temp para conmutar puertos 3.3V
    actualizarPantalla();         // EJECUTA borrado de VRAM y dibujado en la interfaz LCD TFT los nuevos números calculados
    enviarTelemetriaYLogs();      // EJECUTA modelado serial de JSON e inyecta la carga a la nube asíncrona de datos
  }
}