# 🚀 Resumen del Sprint 12: Estabilización de WiFi y Firebase

¡Hemos cruzado otra barrera crítica! El hardware estaba sufriendo bloqueos constantes y bucles de desconexión debido a conflictos arquitectónicos profundos. Ahora la placa es robusta, resiliente a caídas de red y capaz de reconectarse por sí misma sin congelarse.

## 🛠️ Cambios Implementados

### 1. Resolución del Bucle de Reconexión WiFi (Leaky Bucket)
- **Problema:** El router cortaba intermitentemente la conexión al inicio, reiniciando los contadores a cero cada vez que se conectaba por un segundo. Esto impedía que el Portal Cautivo de emergencia (*Fungi_Rescate*) saltara.
- **Solución:** Implementamos un algoritmo de *Leaky Bucket* en `NetworkManager`. Ahora, los intentos de reconexión disminuyen progresivamente, lo que garantiza que si la red es inestable durante 1 minuto, la placa active la red de emergencia en lugar de ocultarlo.

### 2. Armonía Dual-Core (Hardware Race Conditions)
- **Problema:** Habíamos delegado el motor de WiFi al Core 0 para separar el trabajo de los sensores, pero esto provocó una desincronización (race conditions) con las tripas de la librería base de Espressif (que corre en el Core 1 por defecto).
- **Solución:** Devolvimos la tarea `tareaRed` al **Core 1**, restaurando el comportamiento estable y eliminando el bloqueo aleatorio que el router interpretaba como un nodo "muerto".

### 3. Resolución del "Catch-22" en Firebase
- **Problema:** En `main.cpp`, el sistema estaba atrapado: *Firebase no podía procesar su conexión hasta estar conectado*. Esto causaba que la placa se congelara infinitamente justo después del mensaje de arranque.
- **Solución:** Eliminamos el bloqueo circular, permitiendo a `Firebase.loop()` correr libremente, y restauramos `Firebase.reconnectWiFi(true)` para que el SDK de Firebase administre y proteja activamente la conexión de WiFi durante operaciones criptográficas pesadas.

### 4. Seguros Termodinámicos en el Hardware
- **Mejora:** Reforzamos `HardwareController` para que los modos MANUALES no permitan desastres. Si un sensor falla o si el límite de temperatura/humedad es superado, la placa **bloquea físicamente** la ejecución del comando proveniente del dashboard web para salvar el cultivo.

## ✅ Estado Actual
Todo funciona maravillosamente. El sistema levanta el entorno, se conecta al router, hace el apretón de manos con los servidores de Firebase sin congelar la pantalla, y queda en verde con el estatus `ONLINE (SINC)`. 

Estamos listos para continuar con la evolución del proyecto. ¿Cuál será el próximo objetivo?
