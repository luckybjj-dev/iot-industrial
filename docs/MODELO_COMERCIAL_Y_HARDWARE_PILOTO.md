# MODELO COMERCIAL, ARQUITECTURA PCBA Y ESTRATEGIA DE HARDWARE INDUSTRIAL
## AgriEdge OS — Ecosistema de Automatización Climática y Radicular de Precisión (CEA & Soil 7-in-1)

> **Versión:** 1.2.0 (Sensores SHT35 I2C + Sonda Suelo 7-en-1 + PCBA Propietaria)  
> **Fecha de Emisión:** 20 de Agosto de 2026  
> **Estado:** Estrategia Comercial y Técnica Aprobada  
> **Documentos Relacionados:** Informe Maestro | Auditoría Integral V3 | ROADMAP

---

## 1. Resumen Ejecutivo y Propuesta de Valor

AgriEdge OS es una **Estación Integral de Grado Industrial para el Control Climático y Nutricional de Precisión (Aire SHT35 + Sustrato 7-en-1)**:

1. **Monitoreo Ambiental de Alta Precisión (2x Sensirion SHT35):** Reemplazo definitivo de sensores lentos (DHT22) por sondas industriales SHT35 sobre bus I2C aislado, con precisión médica (±0.1°C y ±1.5% RH), membrana de protección hidrofóbica PTFE y redundancia dual por hardware (direcciones I2C `0x44` y `0x45`).
2. **Monitoreo Total del Sustrato (Sonda 7-en-1 RS-485 Modbus RTU):** Medición continua de Nitrógeno (N), Fósforo (P), Potasio (K), pH, Conductividad Eléctrica (EC), Humedad Volumétrica (VWC%) y Temperatura de Sustrato.
3. **Doble Estrategia de Hardware:**
   * **Fase Piloto (Primeros 3-5 Clientes):** Ensamblaje modular en Riel DIN (ESP32-S3 + Shield de Bornes + Módulo RS-485 + 2x SHT35 I2C + Banco de Relés).
   * **Fase Producción (Escala Comercial):** Fabricación de la **Placa Base Propietaria PCBA AgriEdge OS** (todo integrado en una sola tarjeta SMD de 4 capas).

---

## 2. Diagrama de Bloques — Placa Base Propietaria (PCBA)

DISTRIBUCIÓN ELECTRÓNICA DE LA PLACA PROPIETARIA:

[ Entrada 12V-24V DC ] (Bornera Phoenix)
  ├──► [ Fuente DC-DC Step-Down ] (Fusible + Diodo TVS + Protección Polaridad Inversa)
  │      ├──► 5V DC (Alimentación Relés y Pantalla Frontal)
  │      └──► 3.3V DC (Alimentación ESP32-S3, Sensores y Buses Aislados)
  │
  └──► [ MÓDULO ESP32-S3-WROOM-1 ] (16MB Flash + 8MB PSRAM) — Soldado directo SMD
         │
         ├──► [ Transceiver RS-485 ] (Auto-Direction + Diodos TVS SM712 + Bornera A/B/GND)
         │      └──► Sonda 7-en-1 Suelo/Sustrato (Modbus RTU: N, P, K, pH, EC, Humedad, Temp)
         │
         ├──► [ Bus I2C Aislado ] (Pull-ups + Filtro ESD)
         │      ├──► SHT35 #1 Primario (Dirección I2C 0x44 con Membrana PTFE)
         │      ├──► SHT35 #2 Redundante (Dirección I2C 0x45 con Membrana PTFE)
         │      └──► Sensor CO2 NDIR SCD30 (Dirección I2C 0x61)
         │
         ├──► [ Cabecera SPI ] (Conector FPC/Header en Tapa de Gabinete)
         │      └──► Pantalla Local TFT / IPS 2.4"
         │
         ├──► [ Control Óptico de Potencia ] (Optoacopladores + Diodos Snubber)
         │      └──► Banco de 6 Relés de Potencia (Heater SSR, Fogger, Extractor, Bomba Riego, Luz, Cooler)
         │
         └──► [ Entradas Auxiliares ] (ADC Protegido con Diodos Zener 3.3V)
                └──► Boyas de Nivel de Estanque, Sonda NTC de respaldo o Pulsadores

---

## 3. Lista de Materiales (BOM) y Costos Unitarios de Fabricación

| Componente | Especificación Técnica | Función en el Sistema | Costo Piloto Modular (USD) | Costo PCBA Propietaria (Lote 50u) |
| :--- | :--- | :--- | :---: | :---: |
| **Cerebro (SoC)** | **ESP32-S3-WROOM-1 (N16R8)** | Dual-core, FreeRTOS, Modbus Master, Firebase | $5.50 | $4.20 |
| **Sonda 7-en-1 Suelo** | **Sonda Industrial RS-485 Modbus RTU** | Medición de NPK, pH, EC, Humedad y Temp | $32.00 | $26.00 |
| **Sensores de Aire (2x SHT35)** | **2x Sondas Sensirion SHT35 I2C con filtro PTFE** | Temperatura y Humedad industrial redundante (±0.1°C) | $11.00 ($5.50 c/u) | $8.00 (chips SMD/sonda) |
| **Interfaz RS-485** | Transceptor con protección TVS SM712 | Comunicación diferencial inmune a ruido | $1.80 | $0.90 (chip SMD) |
| **Placa Base / PCBA** | Shield Bornes (Piloto) / PCB 4 capas (Serie) | Ruteo de potencia, buses y borneras | $4.20 | $5.50 (Placa + Pick&Place) |
| **Etapa de Relés (6 CH)** | Relés 10A Optoacoplados + SSR Calefactor | Control de 6 actuadores (incluye bomba riego) | $8.50 | $6.80 (Relés en placa) |
| **Alimentación DC-DC** | Fuente DIN 12V / Regulador Step-Down | Conversión 12V-24V a 5V y 3.3V con protecciones | $8.50 | $4.20 (Componentes en PCB) |
| **Pantalla HMI Local** | TFT 2.4" SPI montada tras visor IP65 | Diagnóstico en tiempo real | $5.80 | $5.20 |
| **Gabinete IP65** | Caja termoplástica con tapa transparente | Protección contra humedad extrema y salpicaduras | $11.00 | $10.00 |
| **Accesorios** | Prensaestopas, válvula transpirable M12, antena | Sellado, cableado y despresurización | $4.50 | $3.80 |
| **TOTAL COSTO DE FABRICACIÓN (BOM)** | — | — | **~$92.80 USD** | **~$74.60 USD** |

---

## 4. Modelo de Negocio y Estructura de Precios

La combinación de **2x Sensores SHT35 de precisión suiza + Sonda de Suelo 7-en-1** posiciona a AgriEdge OS en el segmento de **SCADA Agronómico Profesional**:

1. MODELO HaaS (Hardware + Suscripción SCADA — Recomendado para Escala):
   - Tablero de Control Completo (2x SHT35 + Sonda 7-en-1): **$490.00 USD**
   - Suscripción Cloud SCADA (Histórico completo + VPD dinámico + Alertas + Crop Steering): **$20.00 USD / mes / nodo** ($240 USD/año)
   - Ganancia Bruta Inicial de Hardware: **+$397.20 USD (Margen: 81.0%)**

2. MODELO VENTA DIRECTA LLAVE EN MANO:
   - Tablero Completo + 2x SHT35 + Sonda 7-en-1 + 1 Año Cloud Incluido: **$790.00 USD**
   - Renovación Cloud (Año 2+): **$150.00 USD / año**
   - Ganancia Bruta Inicial de Hardware: **+$697.20 USD (Margen: 88.2%)**

Costo Operativo Cloud (Firebase RTDB optimizado): $0.00 en Free Tier.

---

## 5. Estrategia Post-Venta y Continuidad Operativa

1. Kit de Respaldo In-Situ (Clientes con 3+ naves):
   - Se suministra una caja de emergencia en la granja con 1x ESP32-S3 pre-programado ($5.50 USD), 1x SHT35 de repuesto ($5.50 USD) y 1x Sonda 7-en-1 de repuesto.
2. Desacoplamiento y Reemplazo Modular:
   - Si una sonda SHT35 o la sonda 7-en-1 sufre daños mecánicos, se desconecta de su bornera y se sustituye sin necesidad de abrir ni reprogramar el microcontrolador.
   - Si el microcontrolador falla, se cambia en 30 segundos del zócalo y descarga la configuración de Firebase de forma automática.
3. Margen de Servicio Técnico:
   - Sustitución de sensor SHT35 fuera de garantía: Facturación de $35 USD (Costo $5.50 USD -> Margen 530%).
   - Sustitución de sonda 7-en-1 fuera de garantía: Facturación de $85 USD (Costo $26–$32 USD -> Margen 165%).

---

## 6. Hoja de Ruta de Implementación Comercial

Fase 1 (Validación Piloto - 30 a 60 días):
- Fabricar 3 tableros modulares con el kit ESP32-S3 + Módulo RS-485 + 2x SHT35 I2C + Sonda 7-en-1.
- Desplegar en 2 clientes productores de hongos/cultivo indoor a precio preferencial ($390 USD).
- Validar lectura dual SHT35 (`0x44`/`0x45`), cálculo de VPD por Tetens y lectura Modbus RTU en el Dashboard SCADA.

Fase 2 (Industrialización PCBA Propietaria):
- Con el flujo de caja de los primeros clientes, encargar el diseño de la PCBA en KiCad y fabricar el primer lote de 20 a 50 unidades en JLCPCB/PCBWay.
- Reducción del costo BOM unitario de $92.80 USD a $74.60 USD, asegurando márgenes brutos superiores al 85%.