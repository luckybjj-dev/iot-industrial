# Metodología de Investigación de Parámetros Agronómicos (Crop Steering)

Esta regla define el estándar que Antigravity (y cualquier subagente) debe utilizar en el futuro cuando un usuario solicite añadir o modificar perfiles de cultivo en la Enciclopedia.

## 1. Fuentes de Verdad Aceptadas
Para definir setpoints (Temperatura, Humedad, VPD, CO2, FAE, Fotoperiodo) **NUNCA inventes o deduzcas datos**. Utiliza siempre conocimiento derivado de:
- Manuales comerciales de agronomía (Ej. *Cornell University Controlled Environment Agriculture*).
- Literatura micológica estándar (Ej. *The Mushroom Cultivator* de Paul Stamets, o especificaciones técnicas de Lambert Spawn).
- Papers científicos o catálogos técnicos de semillas/esporas comerciales orientados a agricultura indoor (Invernadero/Cultivo de interior).

## 2. Modelado de las 4 Fases Universales
Todo perfil debe encajar a la fuerza en la matriz de 4 fases del sistema SCADA, incluso si la especie tiene un ciclo de vida diferente. Usa el siguiente mapeo lógico:

### Para el Reino PLANTAE:
1. **Germinación / Esquejes:** Humedad muy alta (VPD bajo, 0.4-0.8 kPa) para prevenir deshidratación sin sistema radicular. Fotoperiodo largo (18/6) o continuo.
2. **Crecimiento Vegetativo:** Maximizar desarrollo foliar. Temperaturas más altas, humedad moderada. VPD entre 0.8 y 1.1 kPa. CO2 suplementado (800-1200 ppm).
3. **Floración / Fructificación:** Estrés hídrico controlado. VPD más alto (1.0 - 1.5 kPa) para evitar Botrytis (moho). CO2 al máximo (1000-1500 ppm). Fotoperiodo suele bajar a 12/12 en plantas fotoperiódicas.
4. **Maduración / Lavado:** Bajada de temperaturas nocturnas para potenciar resinas/terpenos o madurar el fruto (simulación de otoño).

### Para el Reino FUNGI:
1. **Incubación / Colonización:** Micelio corriendo por el sustrato. Altísimo CO2 (>5000 ppm), cero luz (0/24), temperaturas cálidas según especie.
2. **Inducción (Pinning):** Shock provocado. Bajada brusca de temperatura, introducción de luz (ej. 12/12), inyección masiva de aire fresco (FAE) para barrer el CO2 (<800 ppm), humedad al 95%+.
3. **Fructificación:** Desarrollo de los cuerpos fructíferos. Humedad alta (85-90%) pero inferior al pinning para evitar ahogo, CO2 bajo (<1000 ppm).
4. **Descanso / Re-flush:** Fase de recuperación post-cosecha. Temperaturas estables, humedad moderada alta.

## 3. Cálculos de Tolerancia
- **Límites de Alerta:** Si un paper dice "Temperatura ideal 22°C - 24°C", establece el `min` en 22 y el `max` en 24.
- Para los límites críticos (`temp_crit_min`, `temp_crit_max`), si la literatura no lo especifica explícitamente, calcula automáticamente: `ideal_min - 5°C` e `ideal_max + 5°C`. Para humedad: `ideal_min - 15%`. Para CO2 crítico: `ideal_max + 50%`.
