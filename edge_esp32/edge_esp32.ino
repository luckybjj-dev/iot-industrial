// ====================================================================
// 1. INCLUSIÓN DE LIBRERÍAS (Los manuales de instrucciones del ESP32)
// ====================================================================
#include <WiFi.h>            // Permite al ESP32 conectarse a redes inalámbricas
#include <PubSubClient.h>    // Librería para hablar el protocolo industrial MQTT
#include <ArduinoJson.h>     // Permite crear y leer paquetes de datos estructurados en formato JSON
#include <DHT.h>             // Librería para leer los sensores de clima (DHT11/DHT22)
#include <ArduinoOTA.h>      // Over The Air: Permite actualizar el código por WiFi sin cable USB
#include <Adafruit_GFX.h>    // Librería gráfica base para dibujar líneas, textos y formas
#include <Adafruit_ST7735.h> // Librería específica para el chip de nuestra pantalla de 1.77"

// ====================================================================
// 2. CONFIGURACIÓN DE PINES (Mapeo físico del hardware)
// ====================================================================
// Pines para la Pantalla SPI
#define TFT_CS    5     // Chip Select: Le dice a la pantalla "te estoy hablando a ti"
#define TFT_RST   13    // Reset: Reinicia la pantalla
#define TFT_DC    14    // Data/Command: Avisa si enviamos un comando (ej. color) o un dato (texto)
Adafruit_ST7735 tft = Adafruit_ST7735(TFT_CS, TFT_DC, TFT_RST); // Creamos el objeto "tft"

// Pines de los Actuadores (Relés de 3.3V)
const int pinReleVentilador = 26;    
const int pinReleHumidificador = 25; 

// Configuración del Sensor de Ambiente (DHT22)
#define DHTPIN 27         // Pin de señal del DHT22
#define DHTTYPE DHT22     // Le decimos a la librería el modelo exacto
DHT dht(DHTPIN, DHTTYPE); // Creamos el objeto "dht"

// Configuración de la Sonda Enterrada (NTC 10K 3950)
const int pinNTC = 34;           // Pin Analógico (ADC) que leerá el voltaje
const float BETA = 3950.0;       // Constante física de fábrica del sensor
const float R_NOMINAL = 10000.0; // El sensor opone 10,000 ohmios exactos a 25°C
const float T_NOMINAL = 25.0;    // Temperatura de referencia (25°C)
const float R_SERIE = 10000.0;   // Resistencia física que soldamos (o armamos) de 10K ohmios

// ====================================================================
// 3. VARIABLES Y RED (Credenciales y memoria temporal)
// ====================================================================
const char* ssid = "Presidio";       // Nombre de tu red WiFi
const char* password = "manchita2";  // Contraseña de tu red WiFi
const char* mqtt_server = "broker.hivemq.com"; // Servidor público MQTT en la nube
const char* topico_telemetria = "granja/camara_fungi_1/clima"; // El "Canal de TV" donde publicamos datos

WiFiClient espClient;           // Creamos un cliente de red básico
PubSubClient client(espClient); // Envolvemos la red en el protocolo MQTT

// Temporizadores No Bloqueantes (Reemplazo del comando "delay()")
unsigned long lastMsg = 0;   // Guarda el momento del último envío
const long intervalo = 5000; // Intervalo de muestreo: 5000 milisegundos (5 segundos)

bool modoManualRemoto = false; // Bandera: Si es true, ignora los umbrales y obedece al usuario remoto
bool conexionPerdida = false;  // Bandera para saber si nos caímos de la red

// Variables de estado de la memoria RAM para saber si están prendidos o apagados
bool releVentiladorON = false;
bool releHumidificadorON = false;

// Umbrales del Termostato y Humidistato
float umbralHumedadMinima = 50.0; // Si baja de 50%, enciende humedad
float umbralHumedadMaxima = 70.0; // Si llega a 70%, la apaga

float umbralTempMaxima = 20.0;   // Si pasa los 20°C, dispara alerta de calor
float umbralTempSegura = 26.0;   // (Ojo: ¡Esto es un bug tuyo! Segura debe ser MENOR que máxima)
bool alertaCalor = false;        // Bandera de emergencia por alta temperatura

// Lógica de Renovación de Aire (FAE / CO2)
unsigned long ultimoCicloVentilador = 0;  // Memoria del último ciclo
const long intervaloVentilador = 3600000; // 1 Hora en milisegundos (Espera)
const long duracionVentilador = 120000;   // 2 Minutos en milisegundos (Sopla)
bool ventiladorEnCiclo = false;           // Estado del ciclo FAE

// ====================================================================
// 4. SETUP (Configuración inicial, se ejecuta solo 1 vez al encender)
// ====================================================================
void setup() { 
  Serial.begin(115200); // Abre la comunicación con la PC a 115200 bits por segundo
  dht.begin();          // Despierta al sensor DHT22
  
  // Declaramos que los pines de los relés enviarán electricidad hacia afuera
  pinMode(pinReleVentilador, OUTPUT); 
  pinMode(pinReleHumidificador, OUTPUT); 
  
  // Apagamos los relés apenas arranca la máquina (LOW = 0 Voltios)
  digitalWrite(pinReleVentilador, LOW);   
  digitalWrite(pinReleHumidificador, LOW); 

  // Configura la "lupa" del lector analógico a 12 bits (lee valores de 0 a 4095)
  analogReadResolution(12);
  
  delay(10); 
  WiFi.begin(ssid, password); // Intenta conectarse al router
  // Mientras no esté conectado, imprime puntitos o espera 500ms
  while (WiFi.status() != WL_CONNECTED) { delay(500); } 
  
  // Le decimos al cliente MQTT dónde está nuestro servidor en la nube y por qué puerto (1883)
  client.setServer(mqtt_server, 1883); 

  // Inicializa la pantalla configurando el perfil de colores correcto
  tft.initR(INITR_BLACKTAB); 
  tft.setRotation(1);          // Rota la pantalla horizontalmente (Modo paisaje)
  tft.fillScreen(ST77XX_BLACK); // Pinta el fondo completamente de negro
  
  // Nombramos al dispositivo para verlo en la red local y activamos la función inlámbrica OTA
  ArduinoOTA.setHostname("ESP32-Fungi1"); 
  ArduinoOTA.begin(); 
} 

// ====================================================================
// 5. LOOP (El ciclo principal infinito, se ejecuta miles de veces por segundo)
// ====================================================================
void loop() {
  ArduinoOTA.handle(); // Escucha continuamente si queremos subirle un código por WiFi

  // Verificamos si tenemos Internet Y conexión al Broker MQTT
  bool redOk = (WiFi.status() == WL_CONNECTED) && client.connected();
  if (!redOk) {
    if (!conexionPerdida) { 
      modoManualRemoto = false; // Cortamos el remoto por seguridad
      conexionPerdida = true;   // Activamos modo Edge local
    }
    // Intento automático de reconexión MQTT si el WiFi funciona
    if (WiFi.status() == WL_CONNECTED) { 
      String clientId = "ESP32_Fungi_" + String(random(0xffff), HEX); 
      client.connect(clientId.c_str()); 
    }
  } else {
    if (conexionPerdida) { conexionPerdida = false; }
    client.loop(); // Mantiene viva la conexión MQTT recibiendo y enviando "pings"
  }

  // Reloj maestro del sistema: Cuenta cuántos milisegundos han pasado desde que se encendió
  unsigned long now = millis();
  
  // ¿Ya pasaron los 5000ms (5 seg) desde la última vez que leímos sensores?
  if (now - lastMsg > intervalo) {
    lastMsg = now; // Guardamos este momento como la nueva referencia
    
    // Lectura cruda del DHT22
    float tempAmb = dht.readTemperature();
    float humAmb = dht.readHumidity();
    // Revisa si el sensor no devolvió un error matemático (NaN = Not a Number)
    bool dhtOk = !isnan(tempAmb) && !isnan(humAmb);
    
    // LECTURA DE LA SONDA ENTERRADA (Ecuación de Steinhart-Hart)
    int ntcValue = analogRead(pinNTC); // Lee el voltaje crudo (0 a 4095)
    float tempSustrato = 0.0;
    bool sustratoOk = false;

    // Filtro de seguridad: Si lee < 50 o > 4050, asume que el cable se cortó
    if (ntcValue > 50 && ntcValue < 4050) {
        sustratoOk = true;
        // Matemáticas: Convierte el voltaje leído a resistencia en Ohmios
        float resistance = R_SERIE * (4095.0 / (float)ntcValue - 1.0);
        float steinhart = resistance / R_NOMINAL;          // (R/Ro)
        steinhart = log(steinhart);                        // ln(R/Ro)
        steinhart /= BETA;                                 // 1/B * ln(R/Ro)
        steinhart += 1.0 / (T_NOMINAL + 273.15);           // Suma Temperatura Nominal en Kelvin
        steinhart = 1.0 / steinhart;                       // Invierte el resultado final
        tempSustrato = steinhart - 273.15;                 // Convierte los Kelvin a grados Celsius
    }

    // --- AUTOMATIZACIÓN LOCAL (El cerebro EDGE tomando decisiones) ---
    if (!modoManualRemoto) { // Si nadie nos controla por internet...
        
        // CUIDADO: Aquí hay un error de lógica en tus umbrales (20 de máxima y 26 segura no tiene sentido para enfriar)
        if (dhtOk) {
            if (tempAmb >= umbralTempMaxima) { alertaCalor = true; } // Se está quemando
            else if (tempAmb <= umbralTempSegura) { alertaCalor = false; } // Ya se enfrió
        } else { alertaCalor = false; } // Si el sensor muere, apaga para no congelarlo por accidente

        // TEMPORIZADOR FAE (Mueve el aire viejo por CO2 cada hora)
        if (!ventiladorEnCiclo && (now - ultimoCicloVentilador >= intervaloVentilador)) {
          ventiladorEnCiclo = true; // Inicia el ciclo
          ultimoCicloVentilador = now; // Reinicia el reloj de la hora
        }
        if (ventiladorEnCiclo && (now - ultimoCicloVentilador >= duracionVentilador)) {
          ventiladorEnCiclo = false; // Apaga tras 2 minutos
        }

        // Si hay calor crítico O es hora de ventilar CO2, enciende.
        releVentiladorON = (alertaCalor || ventiladorEnCiclo);
        // Aplica el voltaje (HIGH = 3.3V enciende relé, LOW = 0V apaga)
        digitalWrite(pinReleVentilador, releVentiladorON ? HIGH : LOW);

        // Control del Humidificador
        if (dhtOk) {
            if (humAmb < umbralHumedadMinima && !releHumidificadorON) {
                releHumidificadorON = true;  // Falta humedad, encender
            } else if (humAmb >= umbralHumedadMaxima && releHumidificadorON) {
                releHumidificadorON = false; // Humedad lista, apagar
            }
        } else {
            releHumidificadorON = false; // Falla sensor = Apaga para evitar ahogar en agua la cámara
        }
        digitalWrite(pinReleHumidificador, releHumidificadorON ? HIGH : LOW);
    }

    // ====================================================================
    // IMPRESIÓN PARA EL INGENIERO (Monitor Serie)
    // ====================================================================
    Serial.println("-------------------------------------------------");
    if (dhtOk) {
        Serial.printf("🌬️ AMBIENTE -> Temp: %.1f °C | Hum: %.1f %%\n", tempAmb, humAmb);
        // El "? : " es un IF comprimido. Si es true imprime "ON rojo", sino "OFF blanco"
        Serial.printf("   [ACTUADOR] Humidificador: %s\n", releHumidificadorON ? "ON 🔴" : "OFF ⚪");
        Serial.printf("   [ACTUADOR] Ventilador   : %s\n", releVentiladorON ? "ON 🔴" : "OFF ⚪");
    } else { 
        Serial.println("🚨 [ALARMA] Sensor Ambiental DHT22 DESCONECTADO!"); 
    }

    if (sustratoOk) {
        Serial.printf("🌱 SUSTRATO -> Temp NTC: %.1f °C\n", tempSustrato);
    } else { 
        Serial.println("🚨 [ALARMA] Sonda NTC de Sustrato DESCONECTADA!"); 
    }
    
    // ====================================================================
    // PANTALLA FÍSICA TFT (Interfaz del Operador / HMI)
    // ====================================================================
    tft.fillScreen(ST77XX_BLACK); // Borra todo y pinta de negro para actualizar frames
    tft.setCursor(5, 5); tft.setTextColor(ST77XX_YELLOW); tft.println("CAMARA FUNGI 01");
    tft.drawLine(0, 15, 160, 15, ST77XX_WHITE); // Línea blanca separadora horizontal
    
    tft.setCursor(5, 25); tft.setTextColor(ST77XX_WHITE); tft.print("T.Amb: ");
    if (dhtOk) {
      // Si la temp es alta lo pinta ROJO, si es normal lo pinta VERDE
      tft.setTextColor(tempAmb > 22.0 ? ST77XX_RED : ST77XX_GREEN); 
      tft.print(tempAmb); tft.println(" C");
    } else { tft.setTextColor(ST77XX_RED); tft.println("ERR_DHT22"); }
    
    tft.setCursor(5, 45); tft.setTextColor(ST77XX_WHITE); tft.print("Humed: ");
    if (dhtOk) {
      tft.setTextColor(humAmb < umbralHumedadMinima ? ST77XX_RED : ST77XX_CYAN); 
      tft.print(humAmb); tft.println(" %");
    } else { tft.setTextColor(ST77XX_RED); tft.println("ERR_DHT22"); }

    tft.setCursor(5, 65); tft.setTextColor(ST77XX_WHITE); tft.print("T.Sus: ");
    if (sustratoOk) {
      tft.setTextColor(tempSustrato > 27.0 ? ST77XX_RED : ST77XX_GREEN); 
      tft.print(tempSustrato); tft.println(" C");
    } else { tft.setTextColor(ST77XX_RED); tft.println("ERR_NTC"); }

    // Dibuja el estado del humidificador en la zona baja de la pantalla
    tft.setCursor(5, 85); 
    tft.setTextColor(ST77XX_WHITE); 
    tft.print("Hum: ");
    tft.setTextColor(releHumidificadorON ? ST77XX_GREEN : ST77XX_RED); 
    tft.print(releHumidificadorON ? "ON " : "OFF");

    // Dibuja el estado del ventilador a la derecha del humidificador
    tft.setCursor(85, 85); 
    tft.setTextColor(ST77XX_WHITE); 
    tft.print("Vent: ");
    tft.setTextColor(releVentiladorON ? ST77XX_GREEN : ST77XX_RED); 
    tft.println(releVentiladorON ? "ON " : "OFF");

    // ====================================================================
    // EMPAQUETADO PARA BACKEND (Vuelo de datos MQTT a Node.js)
    // ====================================================================
    if (redOk) { // Solo arma el paquete si hay internet
      StaticJsonDocument<200> doc; // Reserva 200 bytes de memoria RAM estructurada
      
      // Creamos el "diccionario" Llave-Valor
      // Si el sensor falló (dhtOk=false), manda un '0.0' para evitar inyectar basura a la BD
      doc["temp_ambiente"] = dhtOk ? tempAmb : 0.0;
      doc["humedad"] = dhtOk ? humAmb : 0.0;
      doc["temp_sustrato"] = sustratoOk ? tempSustrato : 0.0;
      doc["humidificador_on"] = releHumidificadorON;
      doc["ventilador_on"] = releVentiladorON;
      doc["modo_manual"] = modoManualRemoto;

      // Crea un vagón de caracteres de 200 espacios vacíos
      char payload[200];
      // Serializa (aplasta el diccionario estructurado en texto plano puro) hacia el 'payload'
      serializeJson(doc, payload);
      // Dispara el texto plano hacia el servidor en la nube
      client.publish(topico_telemetria, payload);
    }
  }
}