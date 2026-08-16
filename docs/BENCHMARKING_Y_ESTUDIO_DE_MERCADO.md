# 📊 Estudio de Mercado y Benchmarking Competitivo: AgriTech, Controladores CEA y SCADA IoT

**Proyecto de Referencia:** *AgriEdge OS (Motor Agnóstico + SCADA Industrial)*  
**Fecha de Actualización:** Agosto 2026  
**Ubicación Documental:** Documento Maestro de Inteligencia de Mercado (`docs/`)  
**Enfoque:** Automatización climática indoor, cultivo protegido (CEA), salas de fructificación fúngica e invernaderos de precisión.

---

## 1. 🧭 Matriz Comparativa Integral de Competidores

| Producto / Marca | Segmento | Arquitectura (Edge / Cloud) | Resiliencia Offline | Motor de Control (PID / VPD) | Rango de Precio (USD) | Ventajas Clave | Desventajas y Puntos Débiles |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **AC Infinity** *(Controller 69 PRO / UIS)* | Prosumer / Indoor Tent | **Híbrido Ligero** (Bluetooth + WiFi / Cloud) | ⚠️ Media (Mantiene triggers básicos en memoria flash, pero pierde analítica y timers complejos) | Histéresis básica y disparadores por umbral de VPD. **Sin PID térmico**. | **$80 – $350** (Kit básico a avanzado) | UX móvil impecable, hardware accesible, ecosistema plug-and-play visualmente atractivo. | Conectores propietarios (UIS), no apto para entornos comerciales, sin arquitectura multi-nodo real ni soporte para micología industrial. |
| **TrolMaster** *(Hydro-X / Tent-X)* | Comercial Medio / Prosumer CEA | **Edge Dedicado** + Cloud App (TM+) | ✅ Alta (La unidad local procesa todo; el cloud es solo espejo) | Histéresis digital por módulo, 0-10V para dimming de luces. **Sin PID en relés de potencia**. | **$400 – $2,500+** (Escala rápido por módulos individuales) | Estándar de facto en cannabis comercial, muy modular por cable RJ12, robustez de hardware probada. | Ecosistema cerrado y costoso (cada relé/sensor cuesta $80–$250), software/dashboard anticuado, saturación de sensores en >90% RH. |
| **Pulse Grow** *(Pulse One / Pulse Pro)* | Monitoreo Prosumer / Comercial | **Cloud-Centric** (WiFi directo a AWS) | ❌ Nula (Es un monitor pasivo; sin internet no reporta ni registra) | **Solo monitoreo**. No acciona actuadores directamente (solo vía integraciones IFTTT/SmartPlugs). | **$200 – $500** (+ Suscripción opcional) | Precisión de sensores líder en la industria, cálculo de VPD/PAR/Espectro de primer nivel, gráficos web limpios. | **No es un controlador** (no actúa como PLC). Modelo SaaS agresivo para retener histórico de datos. |
| **Mycodo** *(Kyle Gabriel)* | Open Source / DIY Avanzado / Labs | **Full Edge Local** (Raspberry Pi + Flask) | ✅ Total (Base de datos SQLite local y motor daemon en Linux) | **Avanzado**: PID multivariable, lógica condicional compleja, timers, funciones matemáticas personalizadas. | **$100 – $300** (Costo de componentes DIY) | Totalmente agnóstico, soporte ilimitado de sensores (I2C/SPI/1-Wire), muy adoptado en cultivo de hongos. | Requiere conocimientos técnicos altos (Linux/Python), hardware en protoboard o PCBs caseras (sin grado industrial/CE), riesgo de corrupción de tarjeta SD por cortes de luz. |
| **Autogrow / Bluelab** *(IntelliClimate)* | Comercial CEA / Invernaderos | **Industrial Edge** (Controlador dedicado) | ✅ Total (Microcontrolador industrial dedicado) | Lógica climática integrada (Día/Noche, VPD, CO2, dehumidificación). Histéresis industrial. | **$1,800 – $4,500** | Grado industrial real, soporte técnico corporativo, salidas de relé de 24V aisladas. | Software de PC anticuado (estilo Windows 98/XP), nula flexibilidad agronómica para cultivos no tradicionales, costos desmedidos de expansión. |
| **Argus Controls / Priva** | Enterprise / Mega-Greenhouse | **Industrial Distribuido** (PLCs + Servidor Central) | ✅ Total (Arquitectura redundante con buses industriales) | Algoritmos predictivos climáticos avanzados, modelado matemático de masa térmica y radiación solar. | **$15,000 – $100,000+** | Fiabilidad de grado militar, control de naves de múltiples hectáreas, integración con estaciones meteorológicas. | Costos prohibitivos para pequeños/medianos productores, requiere instaladores certificados, contratos de soporte obligatorios. |

---

## 2. 🔍 Radiografía de Competidores por Categoría

### A. Ecosistemas Prosumer / Craft (AC Infinity & TrolMaster)
* **AC Infinity:** Han ganado el mercado gracias a la integración estética (ventiladores, humidificadores, luces que se conectan con cables tipo USB-C/UIS). Sin embargo, su limitación es crítica: **no tienen pensamiento industrial**. Sus sensores de humedad fallan sistemáticamente si se exponen a más del 90% de humedad relativa constante (condensación en cámaras fungi), y su motor de control es puramente reactivo (encender extractor si temperatura > 25°C).
* **TrolMaster:** Es el rival más directo en cuanto a modularidad física. Usan una línea daisy-chain telefónica (RJ12) para conectar estaciones de sensores y estaciones de relés individuales. 
  * *Su gran debilidad:* El costo se dispara exponencialmente. Una estación de control de temperatura cuesta ~$150 USD, otra para humedad ~$150 USD, otra para CO2 ~$250 USD. Para controlar una sola sala, el productor termina gastando más de $1,500 USD en pequeñas cajas plásticas conectadas por cables que se enredan.

### B. Soluciones Open Source (Mycodo & ESP32 DIY)
* **Mycodo:** Es el referente de software libre para cultivo fúngico y ambiental. Su creador diseñó un sistema extraordinariamente flexible donde el usuario puede vincular cualquier entrada (Input) a cualquier lazo PID y sacarlo por cualquier relé.
  * *Por qué no escala comercialmente:* Está basado en Raspberry Pi. En entornos industriales con motores, balastros y bombas, las tarjetas SD de las Raspberry Pi se corrompen frecuentemente ante micro-cortes de energía. Además, no existe un producto integrado comercializable con certificaciones eléctricas y soporte plug-and-play.

### C. Nivel Comercial Tradicional (Bluelab / Autogrow)
* Diseñados hace 15 años para hidroponía e invernaderos de tomate tradicionales.
* Tienen hardware confiable pero interfaces de usuario obsoletas. La visualización de datos en tiempo real y el control desde la nube se sienten como parches añadidos sobre sistemas antiguos mediante módems seriales o tarjetas de red propietarias.

---

## 3. ⚠️ Análisis de Fracasos y "Pain Points" Reales (La Voz del Cultivador)

Al analizar foros especializados (*Reddit r/MushroomGrowers, r/Macrogrowery, Rollitup, ICGMag* y reseñas de productos), se detectan cuatro quejas crónicas sobre las soluciones actuales:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       PAIN POINTS CRÍTICOS DEL MERCADO                      │
├────────────────────────────────┬────────────────────────────────────────────┤
│ 1. Muerte por Condensación      │ Los sensores de humedad comerciales se     │
│    (Falla en >90% RH)          │ saturan y mueren en 2 a 4 semanas en salas │
│                                │ de hongos o propagación de esquejes.       │
├────────────────────────────────┼────────────────────────────────────────────┤
│ 2. Caídas de Servidor / Offline│ Equipos dependientes de la nube que dejan  │
│    (Pérdida de Cosechas)       │ de ejecutar lógicas cuando el WiFi cae o   │
│                                │ cuando la nube del fabricante tiene outage.│
├────────────────────────────────┼────────────────────────────────────────────┤
│ 3. Falta de "Crop Steering"    │ Los sistemas fuerzan a cambiar setpoints a │
│    Real (Automatización Rígida)│ mano cada semana. No existen transiciones  │
│                                │ climáticas graduales automáticas.          │
├────────────────────────────────┼────────────────────────────────────────────┤
│ 4. "Vendor Lock-in" Agresivo   │ Obligación de usar cables, relés y sensores│
│    (Precios Abusivos)          │ de la misma marca a precios 5x-10x sobre el│
│                                │ valor del hardware genérico industrial.    │
└────────────────────────────────┴────────────────────────────────────────────┘
```

### Detalle de las quejas:
1. **La ceguera ante el micelio/sustrato:** Ningún sistema de gama media monitorea la temperatura interna del sustrato. En micología, el micelio es termogénico (produce calor biológico); una sala puede estar a 22°C (óptimo), pero el núcleo del bloque estar a 29°C (muerte térmica del micelio).
2. **El dilema de la purga de CO₂ vs. Humedad en Fungi:** En invernaderos convencionales, el extractor solo baja calor. En hongos, el extractor debe renovar aire (FAE) para sacar CO₂, pero al hacerlo **destruye la humedad relativa**. Los controladores convencionales no tienen la lógica entrelazada para encender humidificadores ultra-rápidos *durante* la extracción para evitar que el VPD se dispare.
3. **El impuesto del SaaS:** Plataformas como Pulse Grow cobran suscripciones para ver más de 30 días de gráficos o para habilitar alertas multi-usuario, generando rechazo en los productores agrícolas.

---

## 4. 🚀 Estrategia de Diferenciación y "Moat" (Ventaja Defensiva) para AgriEdge OS

Para competir y superar la oferta actual, AgriEdge OS debe posicionarse en el **"Sweet Spot"**: *Robustez y precio de hardware ESP32 + Potencia y flexibilidad de un SCADA Web moderno.*

```
       Costo / Complejidad
             ▲
             │                                   [Argus / Priva]
             │                                 (Enterprise $15k+)
             │
             │                 [Autogrow / Bluelab]
             │                  (Comercial $3k+)
             │
             │     ★ ESPACIO EN BLANCO ★
             │     ┌────────────────────────┐
             │     │      AgriEdge OS       │
             │     │  (Hardware accesible + │
             │     │   SCADA Cloud Agnóstico│
             │     │    + Enfoque Fungi)    │
             │     └────────────────────────┘
             │
             │  [TrolMaster]
             │  (Modular $1.5k)
             │
             │  [AC Infinity]            [Mycodo]
             │  (Prosumer $200)       (DIY OpenSource)
             └────────────────────────────────────────► Flexibilidad / Modernidad UX
```

### Las 4 Ventajas Competitivas Clave (Moats):

### 1. El "Cerebro Agnóstico" con Soporte Nativo Fungi (Nicho Desatendido)
* **Diferenciador:** Mientras TrolMaster y AC Infinity están 100% optimizados para plantas de flor (Cannabis/Tomate), AgriEdge OS incluye de fábrica la lógica biológica del hongo:
  * Control del ciclo FAE (Fresh Air Exchange) con compensación hídrica instantánea.
  * Monitoreo térmico de núcleo de sustrato (NTC) con regla de supervivencia prioritaria sobre el aire.
  * Algoritmo de VPD adaptado a rangos estrechos (0.2 – 0.6 kPa).

### 2. Resiliencia de PLC Industrial (Zero Cloud Dependency)
* **Diferenciador:** El ESP32 corre un motor de 3 capas determinista en C++ con almacenamiento en flash local (LittleFS). 
* Si se corta internet durante 2 semanas, el ESP32:
  * Mantiene el lazo PID del calefactor (SSR).
  * Continúa el ciclo de luces mediante reloj interno.
  * Protege los relés mediante el filtro Anti-Short-Cycle (3 min).
  * Si el router falla, levanta un **Portal Cautivo de Rescate** y una API REST local (`/api/status`) accesible desde cualquier teléfono en la sala sin internet.

### 3. Crop Steering Algorítmico Real (Transiciones Suaves)
* **Diferenciador:** La mayoría de los competidores solo permiten setpoints estáticos. AgriEdge OS permite **curvas fenológicas automatizadas**.
  * *Ejemplo:* Inducción de primordios en Shiitake mediante bajada térmica gradual de 1.5°C por día durante 4 días, sin requerir que el agricultor entre a modificar parámetros manualmente.

### 4. Estándar Abierto y Conectividad Industrial
* **Diferenciador:** En lugar de conectores propietarios caros, AgriEdge OS utiliza borneras industriales estándar (bornes a tornillo / conectores GX12 / RJ45 abiertos), permitiendo al usuario conectar sondas estándar de mercado (DHT22, SHT35, NTC 10K, DS18B20, sensores 4-20mA / Modbus RS485).

---

## 5. 💡 Recomendaciones Tácticas de Producto, Hardware y Monetización

### A. Recomendaciones de Hardware (Paso de Prototipo a Producto)
1. **Sustitución de Sensor de Humedad para Fungi:** El DHT22 es excelente para MVP, pero para producción comercial con humedad >95%, la sonda debe evolucionar a un sensor **SHT35 / SHT40 con filtro de membrana PTFE (sinterizado)** o con elemento calefactor interno (*heater pin*) para evaporar condensación.
2. **Carcasa Industrial (Enclosure):** Gabinete estanco con certificación **IP65** y montaje en **Riel DIN**. Las borneras de conexión deben estar claramente serigrafiadas con voltajes separados:
   * Zona de Baja Tensión (3.3V / 5V / 12V): Sensores DHT, NTC, CO2.
   * Zona de Alta Tensión (110V / 220V): Salidas a relés y relés de estado sólido (SSR).
3. **Aislamiento Eléctrico:** Uso obligatorio de optoacopladores y varistores (MOV) para proteger el microcontrolador contra los picos inductivos de extractores y bombas de agua.

### B. Modelo de Negocio Híbrido Recomendado

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         MODELO DE MONETIZACIÓN HÍBRIDO                      │
├───────────────────────────────────┬─────────────────────────────────────────┤
│ 1. Venta de Hardware (One-Time)   │ Margen de hardware en el controlador    │
│    - Kit Core (ESP32 + Sensores)  │ central y kits de expansión.            │
│    - Kit Nodos Satélites (ESP-NOW)│ Hardware desbloqueado sin ataduras.     │
├───────────────────────────────────┼─────────────────────────────────────────┤
│ 2. Software SCADA (Freemium/SaaS) │ - Nivel Básico (Gratis): 1 nodo,        │
│    - Gestión de Granjas           │   telemetría en vivo, 7 días historial. │
│    - Crop Steering Avanzado       │ - Nivel Pro / Farm ($15 - $49 USD/mes): │
│    - Data Lake & Multi-Usuario    │   Multi-zona ISA-95, historial ilimitado│
│                                   │   exportable a CSV/Excel, alertas SMS/  │
│                                   │   WhatsApp, biblioteca de recetas agron.│
├───────────────────────────────────┼─────────────────────────────────────────┤
│ 3. Marketplace de Perfiles        │ Venta/intercambio de "Recetas de Cultivo│
│    (Agronomic Recipe Store)       │ verificadas" creadas por agrónomos e    │
│                                   │ instituciones (ej. Perfil Melena de León│
│                                   │ optimizado para rendimiento biológico). │
└───────────────────────────────────┴─────────────────────────────────────────┘
```

---

## 6. 🏁 Conclusión Ejecutiva

El mercado actual está dividido entre **juguetes de consumo masivo con apps bonitas pero hardware cerrado (AC Infinity)** y **sistemas comerciales caros y anticuados (TrolMaster, Bluelab, Argus)**. 

El cultivo intensivo de hongos y la agricultura vertical de media escala están desatendidos: los productores se ven forzados a armar sistemas caseros en Arduino/Raspberry Pi o pagar fortunas por equipos que no entienden la biología fúngica.

**AgriEdge OS** tiene una oportunidad de oro si consolida su propuesta de valor: **un PLC robusto, local y determinista (Edge), orquestado por un SCADA web moderno, agnóstico y accesible, con soporte nativo para micología y hortalizas de alta precisión.**
