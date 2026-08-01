// NetworkManager.cpp
/*
 * ======================================================================================
 * IMPLEMENTACIÓN EDUCATIVA: NetworkManager
 * ======================================================================================
 * Este archivo implementa la lógica asíncrona de conectividad. Presta especial atención
 * a cómo se interactúa con el hardware del ESP32 mediante FreeRTOS, cómo se engaña 
 * al sistema operativo de los móviles con el Portal Cautivo, y cómo se mantiene 
 * la noción del tiempo de manera global.
 * ======================================================================================
 */
#include "NetworkManager.h" // Incluimos y enlazamos nuestra propia cabecera definida previamente

Preferences NetworkManager::preferencias; // Reservamos formalmente la memoria para el objeto estático Preferences
AsyncWebServer NetworkManager::servidor(80); // Instanciamos el servidor TCP Asíncrono en el puerto 80 (HTTP estándar)
DNSServer NetworkManager::dnsServer; // Reservamos memoria en el sistema para nuestro interceptor DNS
bool NetworkManager::modoAP = false; // Inicializamos asumiendo que NO somos AP hasta que el escaneo WiFi dictamine lo contrario
bool NetworkManager::debeReiniciar = false; // Inicializamos en falso para evitar reboots accidentales durante la operación normal

const char* servidorNTP = "pool.ntp.org"; // Definimos el servidor NTP global y gratuito a utilizar por el ESP32
const long gmtOffset_sec = -14400; // Chile Standard Time (UTC-4)
const int daylightOffset_sec = 3600; // Horario de verano (UTC-3)

const char index_html[] PROGMEM = R"rawliteral(
<!DOCTYPE html> <!-- Declaramos que el documento es HTML5 estándar -->
<html lang="es"> <!-- Abrimos la etiqueta HTML definiendo el idioma español -->
<head> <!-- Inicio de los metadatos invisibles de la página -->
    <meta charset="UTF-8"> <!-- Forzamos codificación UTF-8 para soportar acentos nativos (ñ, á) -->
    <meta name="viewport" content="width=device-width, initial-scale=1.0"> <!-- Aplicamos viewport Mobile-First para celulares -->
    <title>Configuración Fungi</title> <!-- Título visible en la pestaña del navegador del cliente -->
    <style> /* Inicio de la inyección de la hoja de estilos CSS (Vanilla CSS para ahorro de memoria) */
        /* Body: Aplicamos un tema oscuro (Dark Mode) industrial con Flexbox para centrado perfecto */
        body { font-family: 'Segoe UI', Tahoma, sans-serif; background-color: #121212; color: #e0e0e0; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
        /* Container: Creamos la tarjeta contenedora flotante con sombreado y bordes suaves */
        .container { background-color: #1e1e1e; padding: 30px; border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.5); width: 100%; max-width: 350px; }
        /* Título h2: Resaltado principal utilizando el verde ecológico/tecnológico corporativo */
        h2 { text-align: center; color: #4caf50; }
        /* Labels: Ajustamos las descripciones de los inputs en color gris sutil para máxima legibilidad */
        label { display: block; margin-bottom: 8px; font-size: 0.9em; color: #b3b3b3; }
        /* Inputs unificados: Aplicamos cajas de texto estilo consola oscura, retirando bordes blancos nativos */
        input[type="text"], input[type="password"] { width: 100%; padding: 10px; margin-bottom: 20px; border: 1px solid #333; background-color: #2c2c2c; color: #fff; border-radius: 5px; box-sizing: border-box; }
        /* Botón de acción: Diseño en bloque ancho 100% con color verde acentuado y transición suave */
        button { width: 100%; padding: 12px; background-color: #4caf50; color: white; border: none; border-radius: 5px; font-size: 1em; cursor: pointer; transition: background-color 0.3s; }
        /* Botón (Hover): Microinteracción de usabilidad (aclarar color al pasar el puntero/dedo) */
        button:hover { background-color: #45a049; }
    </style> <!-- Cierre obligatorio del bloque CSS interno -->
</head> <!-- Fin total de las configuraciones de cabecera -->
<body> <!-- Inicio del cuerpo del DOM (Lo que el cliente interactúa) -->
    <div class="container"> <!-- Div principal aplicando la clase visual '.container' definida arriba -->
        <h2>Cámara Fungi 2.0</h2> <!-- Título hero del portal cautivo industrial -->
        <form action="/guardar" method="POST"> <!-- Formulario web enrutado nativamente para disparar POST al ESP32 -->
            <label for="ssid">Red WiFi (SSID):</label> <!-- Etiqueta descriptiva para el usuario final -->
            <input type="text" id="ssid" name="ssid" required> <!-- Campo de texto obligatorio para atrapar la red de su hogar -->
            <label for="pass">Contraseña:</label> <!-- Etiqueta descriptiva de seguridad -->
            <input type="password" id="pass" name="pass" required> <!-- Campo ofuscado para atrapar el password sin revelarlo -->
            <button type="submit">Conectar y Guardar</button> <!-- Botón final de envío de formulario HTTP POST -->
        </form> <!-- Cierre jerárquico del formulario HTML -->
    </div> <!-- Cierre jerárquico del contenedor visual principal -->
</body> <!-- Cierre del cuerpo del documento HTML web -->
</html> <!-- Fin del documento, listo para ser despachado por el servidor asíncrono -->
)rawliteral"; // Cierre del delimitador C++ (Raw Literal) que almacena todo el string en memoria Flash (PROGMEM)

NetworkManager::NetworkManager() { // Implementación vacía del constructor de clase
    // Principio de diseño: No arrancar hardware ni RTOS en constructores para prevenir crasheos de instanciación global
} // Retorno sin acción

/*
 * --------------------------------------------------------------------------------------
 * EXPLICACIÓN EDUCATIVA: Multithreading y FreeRTOS (Core 0)
 * --------------------------------------------------------------------------------------
 * Al utilizar xTaskCreatePinnedToCore(), estamos solicitando a FreeRTOS que cree un 
 * nuevo hilo de ejecución (Thread). Por defecto, el framework Arduino de ESP32 ejecuta  
 * el código principal (setup() y loop()) en el Core 1. Al asignar ("pinnear") esta  
 * tarea al Core 0, el manejo de la red WiFi correrá en paralelo. 
 * - Beneficio 1: Si la conexión a internet es lenta o se bloquea, el programa 
 *   principal (Core 1) seguirá funcionando sin interrupciones.
 * - Beneficio 2: El Core 0 es el mismo núcleo que administra el stack de red a 
 *   bajo nivel. Colocar la lógica aquí mejora la sincronía con el hardware.
 * --------------------------------------------------------------------------------------
 */
void NetworkManager::iniciar() { // Función pública para encender el motor de red
    xTaskCreatePinnedToCore( // Invocación a la API nativa de FreeRTOS para bifurcación de hilos (Multithreading)
        tareaRed,            // Inyectamos el puntero a nuestra función estática que correrá eternamente
        "Tarea_Red_Fungi",   // Bautizamos la tarea internamente para debugging de asignación de memoria del RTOS
        8192,                // Reservamos de golpe 8 Kilobytes completos del Heap para prevenir Stack Overflow de mbedTLS/WiFi
        NULL,                // Inyectamos un puntero nulo ya que la tarea no requiere argumentos externos
        1,                   // Set de prioridad estándar de usuario (1) para balancear carga de la CPU
        NULL,                // Descartamos la captura del handle; esta tarea nunca será matada (killed) externamente
        0                    // 🚨 REQUISITO CRÍTICO: Forzamos anclaje al Core 0 (Pro Core) aislando el Core 1 para Termodinámica
    ); // Fin de la invocación de hardware dual-core
} // Cierre del método de inicialización

bool NetworkManager::estaConectado() const { // Wrapper limpio para consultar estado del hardware de red
    return WiFi.status() == WL_CONNECTED; // Devuelve true exclusivamente si el stack WiFi reporta enlace estable con el router
} // Cierre del método consultor

bool NetworkManager::estaEnModoAP() const { // Getter para consultar el portal cautivo
    return modoAP;
} // Cierre del getter

/*
 * --------------------------------------------------------------------------------------
 * EXPLICACIÓN EDUCATIVA: Protocolo de Tiempo de Red (NTP)
 * --------------------------------------------------------------------------------------
 * El NTP (Network Time Protocol) se usa para sincronizar el reloj de la placa.
 * - configTime() se comunica por debajo mediante UDP (User Datagram Protocol) a los 
 *   servidores "pool.ntp.org", que son de precisión atómica global.
 * - La placa calcula su hora local aplicando el offset de la zona horaria (GMT) y el 
 *   Horario de Verano (Daylight Saving).
 * - Una vez configurado, el chip ESP32 mantiene el tiempo por su cuenta internamente 
 *   usando su RTC (Real Time Clock).
 * --------------------------------------------------------------------------------------
 */
void NetworkManager::sincronizarReloj() { // Método dedicado para la inicialización y forcejeo del NTP
    if (WiFi.status() == WL_CONNECTED) { // Blindaje estructural: Nunca intentar NTP si no hay una antena conectada a internet
        Serial.println("[NTP] Core 0 solicitando TimeSync a pool.ntp.org..."); // Trazabilidad en puerto serie del evento criptográfico base
        configTime(gmtOffset_sec, daylightOffset_sec, servidorNTP); // Mandato C-Standard nativo del ESP32 para disparar peticiones UDP al servidor de tiempo
    } // Fin del blindaje
} // Cierre del método de sincronización

void NetworkManager::tareaRed(void * parametro) { // Función principal de FreeRTOS (El corazón del NetworkManager)
    preferencias.begin("fungi_cfg", false); // Abrimos/montamos el sistema de archivos NVS buscando la carpeta "fungi_cfg" (Modo lectura/escritura)
    String ssidGuardado = preferencias.getString("ssid", ""); // Intentamos rescatar el valor 'ssid'. Si no existe, entregamos string vacío ""
    String passGuardado = preferencias.getString("pass", ""); // Intentamos rescatar el valor 'pass'. Si no existe, entregamos string vacío ""

    if (ssidGuardado != "") { // Evaluamos si la placa ya ha sido provisionada anteriormente por el cliente
        Serial.println("[RED] Credenciales halladas. Intentando asociar a: " + ssidGuardado); // Trazabilidad de inicio de proceso STA
        WiFi.mode(WIFI_STA); // Forzamos apagado de antenas AP, activando solo recepción cliente (Station Mode)
        WiFi.disconnect(true); // Limpieza profunda: Borramos cualquier estado colgado en la RAM del chip WiFi
        vTaskDelay(100 / portTICK_PERIOD_MS); // Pequeño respiro para que el hardware asimile la limpieza
        
        WiFi.begin(ssidGuardado.c_str(), passGuardado.c_str()); // Disparamos el comando asíncrono de handshake WiFi
        
        unsigned long inicioIntento = millis(); // Capturamos un timestamp preciso del procesador
        // Aumentamos el timeout a 20 segundos (algunos routers demoran en asignar IP por DHCP)
        while (WiFi.status() != WL_CONNECTED && millis() - inicioIntento < 20000) { 
            vTaskDelay(500 / portTICK_PERIOD_MS); // YIELD CRÍTICO: Bloqueamos tarea por 500ms
            Serial.print("."); // Feedback visual mínimo en consola serial para el ingeniero
        } // Fin del bucle de espera de timeout
        Serial.println(); // Salto de línea estético post-bucle
    } // Fin del proceso condicional de modo STA

    /*
     * ----------------------------------------------------------------------------------
     * EXPLICACIÓN EDUCATIVA: Portal Cautivo (Captive Portal)
     * ----------------------------------------------------------------------------------
     * Cuando la red principal falla o no está configurada, entramos en Modo Rescate.
     * 1. WiFi.mode(WIFI_AP): Convierte al ESP32 en un router (Access Point).
     * 2. dnsServer.start(): Levanta un servidor DNS engañoso. Todo intento de 
     *    navegación del usuario (ej: buscar apple.com) será resuelto a la 
     *    IP local del ESP32 (192.168.4.1), obligando al móvil a abrir nuestro HTML.
     * 3. servidor.begin(): Enciende el servidor HTTP asíncrono para despachar el 
     *    formulario HTML que inyectamos previamente en memoria (PROGMEM).
     * ----------------------------------------------------------------------------------
     */
    if (WiFi.status() != WL_CONNECTED) { // Fallback de Resiliencia: Si pasaron 10s y no hay WiFi, o si la NVS vino vacía de fábrica
        Serial.println("[RED] Fracaso STA/Onboarding detectado. Subiendo Portal Cautivo..."); // Alarma de activación de modo rescate/setup
        modoAP = true; // Seteamos la bandera global para indicar a la tarea que debe procesar peticiones DNS
        
        WiFi.mode(WIFI_AP); // Conmutamos inmediatamente el chip de radio a modo Emisor (Access Point)
        
        String mac = WiFi.macAddress(); // Solicitamos al hardware su dirección MAC unívoca universal
        String apName = "Fungi_Setup_" + mac.substring(mac.length() - 5, mac.length() - 3) + mac.substring(mac.length() - 2); // Creamos un SSID único combinando el final de la MAC sin los dos puntos (:)
        
        WiFi.softAP(apName.c_str()); // Levantamos la antena emitiendo el SSID sin seguridad (Red Abierta) para atrapar el celular del usuario
        Serial.println("[RED] SSID Emitido: " + apName); // Documentamos en puerto serie la red que el usuario debe buscar
        Serial.println("[RED] IP Base Servidor: " + WiFi.softAPIP().toString()); // Documentamos la IP de la puerta de enlace (normalmente 192.168.4.1)

        dnsServer.start(53, "*", WiFi.softAPIP()); // Encendemos el sumidero DNS. El puerto 53 redirigirá todo (*) a nuestra propia IP local
        configurarPortal(); // Invocamos nuestra función modular que mapea los Endpoints GET/POST de la API local
        servidor.begin(); // ¡START! Encendemos la maquinaria del AsyncWebServer para empezar a escuchar sockets TCP
    } else { // Caso de éxito: El dispositivo logró colgarse del router del cliente
        Serial.println("[RED] Enlace STA Verde. IP Adquirida: " + WiFi.localIP().toString()); // Notificamos victoria y la IP asignada por el router local
        Serial.println("[NTP] Disparando Sincronización Inicial de Certificados..."); // Notificamos paso previo obligatorio de Firebase
        configTime(gmtOffset_sec, daylightOffset_sec, servidorNTP); // Lanzamos el trigger asíncrono para buscar hora real en internet
    } // Fin del bloque condicional de Arranque Dual (STA vs AP)

    for(;;) { // El bucle infinito e inmortal que exige FreeRTOS para toda tarea anclada
        if (modoAP) { // Evalúa de forma ultra rápida (microsegundos) si estamos en modo portal
            dnsServer.processNextRequest(); // Atendemos y resolvemos cualquier rastro de tráfico DNS entrante de iOS/Android
        } // Fin del chequeo DNS
        
        if (debeReiniciar) { // Bandera de seguridad (Evita crasheo del hilo TCP en AsyncWebServer)
            vTaskDelay(1000 / portTICK_PERIOD_MS); // Bloqueamos el hilo 1 segundo entero para que el socket HTTP envíe con éxito el mensaje "Reiniciando..." al celular
            ESP.restart(); // Fusible final: Matamos por software el microcontrolador. Todo el hardware volverá a arrancar desde cero.
        } // Fin de evaluación de reinicio diferido
        
        if (!modoAP && WiFi.status() != WL_CONNECTED) { // Modo Resiliencia Activa: Si ya configurado, de pronto el WiFi del cliente se cae...
            Serial.println("[RED] ⚠️ Router inaccesible. Forzando stack de reconexión..."); // Alerta técnica de pérdida de enlace
            WiFi.reconnect(); // Emitimos un petitorio formal a los drivers nativos de Espressif para forzar handshake re-try
            vTaskDelay(5000 / portTICK_PERIOD_MS); // Backoff pasivo: Bloqueamos red por 5 segundos para no asfixiar el router ni al Core 0
        } // Fin del bloque de reconexión autónoma
        
        vTaskDelay(10 / portTICK_PERIOD_MS); // 🚨 YIELD SUPREMO DE FREERTOS: Le devolvemos 10ms obligatorios al planificador central para evitar panics del RTOS en Core 0
    } // Cierre del bucle for infinito
} // Cierre de la función maestra TareaRed

void NetworkManager::configurarPortal() { // Función arquitectónica para definir las rutas HTTP del ESP32
    servidor.on("/", HTTP_GET, [](AsyncWebServerRequest *request){ // Callback asíncrono: Cuando un GET golpea la raíz del ESP32
        request->send(200, "text/html", index_html); // Despachamos el documento HTML directamente desde la memoria Flash, código HTTP 200 OK
    }); // Cierre del callback lambda

    servidor.on("/generate_204", HTTP_GET, [](AsyncWebServerRequest *request){ // Callback asíncrono especial: Endpoint buscado ciegamente por celulares Android
        request->send(200, "text/html", index_html); // Engañamos al celular enviándole el HTML, lo que invoca la ventana emergente de "Inicie sesión en esta red"
    }); // Cierre del callback Captive Android

    servidor.on("/guardar", HTTP_POST, [](AsyncWebServerRequest *request){ // Callback asíncrono crítico: Recepción del formulario HTML
        String ssidRecibido; // Creamos buffer local efímero para el payload de la red
        String passRecibido; // Creamos buffer local efímero para el payload de la contraseña

        if (request->hasParam("ssid", true) && request->hasParam("pass", true)) { // Validamos estricta existencia de ambos campos en el Body del POST
            ssidRecibido = request->getParam("ssid", true)->value(); // Capturamos y almacenamos el valor SSID digitado por el usuario
            passRecibido = request->getParam("pass", true)->value(); // Capturamos y almacenamos el valor Password digitado por el usuario
            
            preferencias.putString("ssid", ssidRecibido); // Instruimos a la NVS a quemar en Flash el nombre de la red (persiste al apagar)
            preferencias.putString("pass", passRecibido); // Instruimos a la NVS a quemar en Flash la clave WiFi (persiste al apagar)
            
            request->send(200, "text/html", "<h1>¡Comando Aceptado!</h1><p>Aplicando configuracion y reiniciando el dispositivo Fungi...</p>"); // Disparamos respuesta HTTP final al navegador móvil
            debeReiniciar = true; // Subimos la bandera global. El loop infinito en Core 0 procesará el reinicio de forma segura.
        } else { // Si el POST llegó alterado o corrupto desde el frontend local
            request->send(400, "text/plain", "Error 400: Parámetros del portal de configuración corruptos o faltantes."); // Emitimos rechazo formal HTTP
        } // Cierre del if de validación de payload
    }); // Cierre del callback lambda del formulario POST

    servidor.onNotFound([](AsyncWebServerRequest *request){ // Callback Catch-All: Si el celular del cliente intenta buscar en segundo plano a google.com, facebook.com, etc.
        request->redirect("/"); // Capturamos la petición ciega y le devolvemos una redirección forzosa 302 (Mecanismo absoluto del Portal Cautivo)
    }); // Cierre del callback lambda NotFound
} // Cierre de la función de enrutamiento

/*
 * --------------------------------------------------------------------------------------
 * EXPLICACIÓN EDUCATIVA: Extracción de Tiempo (Estructura tm)
 * --------------------------------------------------------------------------------------
 * getLocalTime() consulta el RTC interno del ESP32. Retorna 'true' si el reloj ha 
 * sido previamente sincronizado por NTP. Alimenta un "struct tm", que es una 
 * estructura estándar de C/C++ que contiene horas, minutos, segundos, días y meses.
 * Luego usamos strftime() para formatear fácilmente esto como un texto "HH:MM:SS".
 * --------------------------------------------------------------------------------------
 */
String NetworkManager::getHoraActual() const {
    struct tm timeinfo;
    if (!getLocalTime(&timeinfo)) {
        return "Desincronizado";
    }
    char timeStringBuff[50];
    strftime(timeStringBuff, sizeof(timeStringBuff), "%H:%M:%S", &timeinfo);
    return String(timeStringBuff);
}

int NetworkManager::getHoraInt() const {
    struct tm timeinfo;
    if (!getLocalTime(&timeinfo)) {
        return -1;
    }
    return timeinfo.tm_hour; // Retorna 0-23
}
