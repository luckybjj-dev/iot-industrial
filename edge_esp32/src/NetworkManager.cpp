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
#include <ESPmDNS.h> // Agregamos mDNS para resolución de nombres locales (fungi.local)

Preferences NetworkManager::preferencias; // Reservamos formalmente la memoria para el objeto estático Preferences
AsyncWebServer NetworkManager::servidor(80); // Instanciamos el servidor TCP Asíncrono en el puerto 80 (HTTP estándar)
DNSServer NetworkManager::dnsServer; // Reservamos memoria en el sistema para nuestro interceptor DNS
bool NetworkManager::modoAP = false; // Inicializamos asumiendo que NO somos AP hasta que el escaneo WiFi dictamine lo contrario
bool NetworkManager::debeReiniciar = false; // Inicializamos en falso para evitar reboots accidentales durante la operación normal
HardwareController* NetworkManager::_hw = nullptr; // Inicializamos el puntero en nulo
volatile bool NetworkManager::_conexionEstable = false;

const char* servidorNTP = "pool.ntp.org"; // Definimos el servidor NTP global y gratuito a utilizar por el ESP32
const long gmtOffset_sec = -14400; // Chile Standard Time (UTC-4)
const int daylightOffset_sec = 3600; // Horario de verano (UTC-3)

const char index_html[] PROGMEM = R"rawliteral(
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard SCADA</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, sans-serif; background-color: #121212; color: #e0e0e0; display: flex; flex-direction: column; align-items: center; margin: 0; padding: 20px; }
        .container { background-color: #1e1e1e; padding: 25px; border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.5); width: 100%; max-width: 400px; margin-bottom: 20px; }
        h2 { text-align: center; color: #4caf50; margin-top: 0; }
        .tabs { display: flex; border-bottom: 1px solid #333; margin-bottom: 20px; }
        .tab { flex: 1; text-align: center; padding: 10px; cursor: pointer; color: #b3b3b3; transition: 0.3s; }
        .tab.active { border-bottom: 2px solid #4caf50; color: #fff; font-weight: bold; }
        .tab-content { display: none; }
        .tab-content.active { display: block; }
        label { display: block; margin-bottom: 8px; font-size: 0.9em; color: #b3b3b3; }
        input[type="text"], input[type="password"] { width: 100%; padding: 10px; margin-bottom: 20px; border: 1px solid #333; background-color: #2c2c2c; color: #fff; border-radius: 5px; box-sizing: border-box; }
        button { width: 100%; padding: 12px; background-color: #4caf50; color: white; border: none; border-radius: 5px; font-size: 1em; cursor: pointer; transition: 0.3s; margin-bottom: 10px; }
        button:hover { background-color: #45a049; }
        .btn-act { background-color: #333; display: flex; justify-content: space-between; align-items: center; }
        .btn-act.on { background-color: #4caf50; }
        .sensor-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #333; }
        .val { font-weight: bold; color: #fff; }
    </style>
</head>
<body>
    <div class="container">
        <h2>Controlador SCADA 2.0</h2>
        <div class="tabs">
            <div class="tab active" onclick="switchTab(0)">Control Local</div>
            <div class="tab" onclick="switchTab(1)">Red Wi-Fi</div>
        </div>

        <div id="tab0" class="tab-content active">
            <div class="sensor-row"><span>Temp. Ambiente:</span><span id="v_temp" class="val">-- °C</span></div>
            <div class="sensor-row"><span>Humedad:</span><span id="v_hum" class="val">-- %</span></div>
            <div class="sensor-row"><span>Sonda NTC:</span><span id="v_ntc" class="val">-- U</span></div>
            <br>
            <button class="btn-act on" id="b_modo" onclick="toggle('modo_operacion')" style="background-color: #2196F3;">Modo: <span>AUTO</span></button>
            <hr style="border-color:#333; margin:15px 0;">
            <button class="btn-act" id="b_cal" onclick="toggle('heater')">Calefactor <span>OFF</span></button>
            <button class="btn-act" id="b_nbl" onclick="toggle('fogger')">Nebulizador <span>OFF</span></button>
            <button class="btn-act" id="b_ext" onclick="toggle('extractor')">Extractor <span>OFF</span></button>
            <button class="btn-act" id="b_luz" onclick="toggle('light')">Luces <span>OFF</span></button>
        </div>

        <div id="tab1" class="tab-content">
            <form action="/guardar" method="POST">
                <label>Red WiFi (SSID):</label>
                <input type="text" name="ssid" required>
                <label>Contraseña:</label>
                <input type="password" name="pass" required>
                <button type="submit">Guardar y Reiniciar</button>
            </form>
        </div>
    </div>

    <script>
        function switchTab(idx) {
            document.querySelectorAll('.tab').forEach((t, i) => t.classList.toggle('active', i === idx));
            document.querySelectorAll('.tab-content').forEach((t, i) => t.classList.toggle('active', i === idx));
        }

        async function updateStatus() {
            try {
                let res = await fetch('/api/status');
                let data = await res.json();
                document.getElementById('v_temp').innerText = data.t + ' °C';
                document.getElementById('v_hum').innerText = data.h + ' %';
                document.getElementById('v_ntc').innerText = data.n + ' U';
                
                let btnModo = document.getElementById('b_modo');
                if (data.modo === "AUTO") {
                    btnModo.classList.add('on');
                    btnModo.style.backgroundColor = '#2196F3'; // Azul para AUTO
                    btnModo.querySelector('span').innerText = 'AUTO';
                } else {
                    btnModo.classList.remove('on');
                    btnModo.style.backgroundColor = '#f44336'; // Rojo para MANUAL
                    btnModo.querySelector('span').innerText = 'MANUAL';
                }

                updateBtn('b_cal', data.heater);
                updateBtn('b_nbl', data.fogger);
                updateBtn('b_ext', data.extractor);
                updateBtn('b_luz', data.light);
            } catch (e) {}
        }

        function updateBtn(id, state) {
            let btn = document.getElementById(id);
            if (state) { btn.classList.add('on'); btn.querySelector('span').innerText = 'ON'; }
            else { btn.classList.remove('on'); btn.querySelector('span').innerText = 'OFF'; }
        }

        async function toggle(rele) {
            await fetch('/api/control', {
                method: 'POST', 
                headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                body: 'rele=' + rele
            });
            updateStatus();
        }

        setInterval(updateStatus, 2000);
        updateStatus();
    </script>
</body>
</html>
)rawliteral";

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
        1                    // RESTAURADO: Volvemos al Core 1 (default de Arduino) para evitar race conditions con el driver WiFi
    ); // Fin de la invocación de hardware dual-core
} // Cierre del método de inicialización

bool NetworkManager::estaConectado() const { // Wrapper limpio para consultar estado del hardware de red
    return _conexionEstable; // Devuelve true exclusivamente si el stack WiFi reporta enlace estable con el router
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

    if (ssidGuardado != "") { 
        Serial.println("[RED] Credenciales halladas. Intentando asociar a: " + ssidGuardado); 
        WiFi.mode(WIFI_STA); 
        WiFi.setSleep(false); // EVITAR DESCONEXIONES: Desactiva el modem sleep
        WiFi.setAutoReconnect(true); // El driver de ESP32 manejará las reconexiones automáticamente
        
        // Eliminado WiFi.disconnect(false, true) porque en algunos routers borra credenciales vitales y causa drops
        vTaskDelay(100 / portTICK_PERIOD_MS); 
        
        WiFi.begin(ssidGuardado.c_str(), passGuardado.c_str());
        
        unsigned long inicioIntento = millis(); // Capturamos un timestamp preciso del procesador
        // Aumentamos el timeout a 20 segundos (algunos routers demoran en asignar IP por DHCP)
        while (WiFi.status() != WL_CONNECTED && millis() - inicioIntento < 20000) { 
            vTaskDelay(500 / portTICK_PERIOD_MS); // YIELD CRÍTICO: Bloqueamos tarea por 500ms
            Serial.print("."); // Feedback visual mínimo en consola serial para el ingeniero
        } // Fin del bucle de espera de timeout
        Serial.println(); // Salto de línea estético post-bucle
    } // Fin del proceso condicional de modo STA

    _conexionEstable = (WiFi.status() == WL_CONNECTED);

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
        String apName = "SCADA_Node_" + mac.substring(mac.length() - 5, mac.length() - 3) + mac.substring(mac.length() - 2); // Creamos un SSID único combinando el final de la MAC sin los dos puntos (:)
        
        WiFi.softAP(apName.c_str()); // Levantamos la antena emitiendo el SSID sin seguridad (Red Abierta) para atrapar el celular del usuario
        Serial.println("[RED] SSID Emitido: " + apName); // Documentamos en puerto serie la red que el usuario debe buscar
        Serial.println("[RED] IP Base Servidor: " + WiFi.softAPIP().toString()); // Documentamos la IP de la puerta de enlace (normalmente 192.168.4.1)

        dnsServer.start(53, "*", WiFi.softAPIP()); // Encendemos el sumidero DNS. El puerto 53 redirigirá todo (*) a nuestra propia IP local
        configurarPortal(); // Invocamos nuestra función modular que mapea los Endpoints GET/POST de la API local
        servidor.begin(); // ¡START! Encendemos la maquinaria del AsyncWebServer para empezar a escuchar sockets TCP
    } else { // Caso de éxito: El dispositivo logró colgarse del router del cliente
        Serial.println("[RED] Enlace STA Verde. IP Adquirida: " + WiFi.localIP().toString()); // Notificamos victoria y la IP asignada por el router local
        
        // Iniciamos mDNS para que el dispositivo responda a http://fungi.local
        if (MDNS.begin("fungi")) {
            Serial.println("[RED] mDNS iniciado. Servidor accesible en http://fungi.local");
        }
        
        Serial.println("[NTP] Disparando Sincronización Inicial de Certificados..."); // Notificamos paso previo obligatorio de Firebase
        configTime(gmtOffset_sec, daylightOffset_sec, servidorNTP); // Lanzamos el trigger asíncrono para buscar hora real en internet
    } // Fin del bloque condicional de Arranque Dual (STA vs AP)

    int intentosReconexion = 0; // Contador dinámico para el Fallback AP
    
    for(;;) { // El bucle infinito e inmortal que exige FreeRTOS para toda tarea anclada
        if (modoAP) { // Evalúa de forma ultra rápida (microsegundos) si estamos en modo portal
            dnsServer.processNextRequest(); // Atendemos y resolvemos cualquier rastro de tráfico DNS entrante de iOS/Android
        } // Fin del chequeo DNS
        
        if (debeReiniciar) { // Bandera de seguridad (Evita crasheo del hilo TCP en AsyncWebServer)
            vTaskDelay(1000 / portTICK_PERIOD_MS); // Bloqueamos el hilo 1 segundo entero para que el socket HTTP envíe con éxito el mensaje "Reiniciando..." al celular
            ESP.restart(); // Fusible final: Matamos por software el microcontrolador. Todo el hardware volverá a arrancar desde cero.
        } // Fin de evaluación de reinicio diferido
        
        if (!modoAP && WiFi.status() != WL_CONNECTED) { // Modo Resiliencia Activa
            intentosReconexion++;
            Serial.print(F("[RED] ⚠️ Router inaccesible. Esperando reconexión automática... Intento: ")); 
            Serial.println(intentosReconexion);
            
            vTaskDelay(5000 / portTICK_PERIOD_MS); // Backoff pasivo de 5 segundos
            
            // Fallback AP: Si falla durante 1 minuto (12 intentos)
            if (intentosReconexion >= 12 && WiFi.status() != WL_CONNECTED) {
                Serial.println(F("🚨 [RED] Router inestable o perdido. ¡Levantando Red de Rescate (Fallback AP)!"));
                
                modoAP = true;
                WiFi.mode(WIFI_AP);
                
                String mac = WiFi.macAddress();
                String apName = "Fungi_Rescate_" + mac.substring(mac.length() - 5, mac.length() - 3) + mac.substring(mac.length() - 2);
                
                WiFi.softAP(apName.c_str());
                Serial.println("[RED] SSID Emitido: " + apName);
                
                dnsServer.start(53, "*", WiFi.softAPIP());
                configurarPortal();
                servidor.begin();
            }
        } else if (!modoAP && WiFi.status() == WL_CONNECTED) {
            // Leaky bucket: si está conectado, bajamos los intentos de error lentamente.
            // Esto evita que una conexión "parpadeante" reinicie el contador a 0 de golpe y oculte la red de rescate.
            if (intentosReconexion > 0) {
                intentosReconexion--;
                vTaskDelay(500 / portTICK_PERIOD_MS); 
            }
        } // Fin del bloque de reconexión autónoma
        
        _conexionEstable = (WiFi.status() == WL_CONNECTED);

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

        if (request->hasParam("ssid", true) && request->hasParam("pass", true)) { 
            ssidRecibido = request->getParam("ssid", true)->value(); 
            passRecibido = request->getParam("pass", true)->value(); 
            
            preferencias.putString("ssid", ssidRecibido); 
            preferencias.putString("pass", passRecibido); 
            
            String htmlRespuesta = "<h1>¡Credenciales Guardadas!</h1>";
            htmlRespuesta += "<p>El dispositivo se reiniciara ahora e intentara conectarse a: <b>" + ssidRecibido + "</b>.</p>";
            htmlRespuesta += "<p><b>NOTA:</b> Si las credenciales son correctas, esta red Fungi_Setup desaparecera y podras acceder al panel en <b>http://fungi.local</b> conectado a tu red principal.</p>";
            htmlRespuesta += "<p>Si son incorrectas, la red Fungi_Setup volvera a aparecer en 20 segundos.</p>";
            
            request->send(200, "text/html", htmlRespuesta); 
            debeReiniciar = true; 
        } else { // Si el POST llegó alterado o corrupto desde el frontend local
            request->send(400, "text/plain", "Error 400: Parámetros del portal de configuración corruptos o faltantes."); // Emitimos rechazo formal HTTP
        } // Cierre del if de validación de payload
    }); // Cierre del callback lambda del formulario POST

    servidor.onNotFound([](AsyncWebServerRequest *request){ // Callback Catch-All: Si el celular del cliente intenta buscar en segundo plano a google.com, facebook.com, etc.
        request->redirect("/"); // Capturamos la petición ciega y le devolvemos una redirección forzosa 302 (Mecanismo absoluto del Portal Cautivo)
    }); // Cierre del callback lambda NotFound

    // --- NUEVOS ENDPOINTS PARA EL DIAGNÓSTICO LOCAL ---
    
    servidor.on("/api/status", HTTP_GET, [](AsyncWebServerRequest *request){
        if (_hw == nullptr) {
            request->send(500, "application/json", "{\"error\":\"No HW\"}");
            return;
        }
        const SensorData& s = _hw->getSensores();
        const ActuadorData& a = _hw->getActuadores();
        
        // Creamos un JSON ligero a mano para no usar memoria extra
        String json = "{";
        json += "\"t\":" + String(s.dhtOk ? s.tempAmb : 0, 1) + ",";
        json += "\"h\":" + String(s.dhtOk ? s.humAmb : 0, 1) + ",";
        json += "\"n\":" + String(s.analogicoOk ? s.valorAnalogico : 0, 1) + ",";
        json += "\"modo\":\"" + String(_hw->getModoOperacion() == ModoOperacion::AUTO ? "AUTO" : "MANUAL") + "\",";
        json += "\"heater\":" + String(a.heater_ON ? "true" : "false") + ",";
        json += "\"fogger\":" + String(a.fogger_ON ? "true" : "false") + ",";
        json += "\"extractor\":" + String(a.extractor_ON ? "true" : "false") + ",";
        json += "\"light\":" + String(a.light_ON ? "true" : "false");
        json += "}";
        
        request->send(200, "application/json", json);
    });

    servidor.on("/api/control", HTTP_POST, [](AsyncWebServerRequest *request){
        if (_hw == nullptr) {
            request->send(500, "text/plain", "Error: No HW");
            return;
        }
        if (request->hasParam("rele", true)) {
            String rele = request->getParam("rele", true)->value();
            ActuadorData a = _hw->getActuadores();
            
            if (rele == "modo_operacion") {
                if (_hw->getModoOperacion() == ModoOperacion::AUTO) {
                    _hw->setModoOperacion(ModoOperacion::MANUAL);
                } else {
                    _hw->setModoOperacion(ModoOperacion::AUTO);
                }
            } else {
                // Si intenta mover un relé, forzamos modo MANUAL primero
                _hw->setModoOperacion(ModoOperacion::MANUAL);
                
                // Alternar estado lógicamente usando los métodos correctos
                if (rele == "heater") _hw->setHeater(!a.heater_ON);
                else if (rele == "fogger") _hw->setFogger(!a.fogger_ON);
                else if (rele == "extractor") _hw->setExtractor(!a.extractor_ON);
                else if (rele == "light") _hw->setLight(!a.light_ON);
            }
            
            request->send(200, "text/plain", "OK");
        } else {
            request->send(400, "text/plain", "Falta parámetro rele");
        }
    });

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
