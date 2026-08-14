# Parámetros Ambientales Óptimos para Cultivo Indoor

Este documento recopila la evidencia agronómica y micológica extraída por el Subagente de Investigación, justificando los parámetros exactos (temperatura, sustrato, humedad, CO2, fotoperiodo) requeridos en un sistema automatizado (SCADA).

---

## 🍄 Cultivo Fúngico (*Psilocybe cubensis* / *Pleurotus ostreatus*)

### La Termogénesis del Micelio
El micelio, durante su pico de digestión celular (fase de colonización), exuda calor constante. La temperatura interna del bloque de sustrato suele elevarse entre **2°C y 5°C** por encima de la temperatura del aire ambiente.
Si calientas el aire a la temperatura óptima biológica del hongo (ej. 26°C), el núcleo del sustrato subirá a 30°C, sufriendo estrés térmico y abriendo paso a bacterias (*Bacillus spp.*). Por ende, el aire debe mantenerse más frío que el sustrato esperado.

### Parámetros por Fase Fenológica (*Psilocybe cubensis*)

| Fase | Duración | Temp. Aire (°C) | Temp. Sustrato (°C) | Humedad Relativa | CO2 (ppm) | Fotoperiodo |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Incubación / Colonización** | 14 - 21 días | 21 - 24 °C | **24 - 28 °C** | 95 - 100% | 5,000 - 10,000 | 0/24 (Oscuridad) |
| **2. Inducción (Pinning)** | 3 - 7 días | 20 - 22 °C | **21 - 23 °C** | 95 - 99% | < 800 | 12/12 |
| **3. Fructificación** | 5 - 8 días | 22 - 25 °C | **23 - 26 °C** | 85 - 92% | < 800 | 12/12 |
| **4. Descanso / Re-flush** | 7 - 10 días | 20 - 22 °C | **21 - 23 °C** | 85 - 90% | 800 - 1,500 | 12/12 |

---

## 🌿 Cultivo Plantae (*Cannabis* / Tomate Indoor)

A diferencia de los hongos, las plantas no generan calor endotérmico en su sustrato/raíces. Debido a la evaporación, el sustrato radicular suele estar **1°C a 2°C más frío** que el aire. El parámetro guía es el VPD (Déficit de Presión de Vapor).

### Parámetros por Fase Fenológica

| Fase | Duración | Temp. Aire (°C) (Día) | Temp. Raíz (°C) | Humedad (VPD) | CO2 (ppm) | Fotoperiodo |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Germinación / Esquejes** | 5 - 14 días | 24 - 26 °C | **24 - 26 °C** | 70 - 80% (VPD < 0.8) | ~400 | 18/6 |
| **2. Crecimiento Vegetativo** | 21 - 42 días | 24 - 28 °C | **20 - 22 °C** | 55 - 65% (VPD 0.8-1.1)| 800 - 1,200 | 18/6 |
| **3. Floración** | 45 - 65 días | 22 - 28 °C | **19 - 21 °C** | 45 - 55% (VPD 1.2-1.5)| 1,000 - 1,500 | 12/12 |
| **4. Maduración / Lavado** | 10 - 14 días | 18 - 22 °C | **18 - 20 °C** | 35 - 45% (VPD > 1.5) | ~400 | 12/12 |

---

### Referencias Bibliográficas (Fuentes)
- **Hongos (Stamets, P. & Chilton, J.S.):** *The Mushroom Cultivator*. Bases agronómicas para termogénesis y ppm de CO2.
- **Penn State Extension:** Guías de cultivo comercial de *Pleurotus* (Choques térmicos para pinning).
- **VPD Charting (Pulse Grow):** Relación dosel/humedad para *Cannabis* y control de estomas.
- **Ed Rosenthal:** *Marijuana Grower's Handbook* (Curvas asimilativas de CO2 a altas temperaturas).
