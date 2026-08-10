# Contexto del Orquestador (Antigravity)

Este archivo actúa como el "Cerebro Compartido" del Agente Orquestador. Al estar dentro de la carpeta del proyecto, puede ser leído y gestionado tanto desde el Antigravity IDE como desde la aplicación de escritorio Antigravity 2.0.

## 📌 Estado Actual del Proyecto
- **Fase:** Post-MVP (v1.0.0).
- **Arquitectura:** React (SCADA) dictando reglas agronómicas, ESP32 ejecutando termodinámica de forma agnóstica.
- **Hito Reciente:** Redundancia Ambiental Dual (2x DHT22) ha sido completada y marcada en el Roadmap.

## 🎯 Siguiente Tarea Activa
- **Objetivo Inmediato:** Implementar Control PID para Modulación (PWM) en la Máquina de Estados del ESP32.
- **Razón:** Reemplazar la lógica de histéresis simple (ON/OFF) para evitar picos térmicos y reducir consumo eléctrico en actuadores (extractores, Peltier, calefactores).

## 📝 Instrucciones para el Agente
Si un nuevo agente lee este archivo desde otra plataforma:
1. Asume el rol de Orquestador Principal.
2. Revisa el archivo `ROADMAP.md` para el contexto extendido.
3. Continúa directamente con el desarrollo del Control PID en C++ a menos que el usuario indique lo contrario.
