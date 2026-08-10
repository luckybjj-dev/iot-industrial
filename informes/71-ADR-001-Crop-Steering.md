# ADR 001: Arquitectura Agnóstica de Crop Steering y Motor de Estados

## Estado
**Aceptado** - 9 de Agosto de 2026

## Contexto
El MVP requería la capacidad de cambiar parámetros ambientales a lo largo del tiempo (Crop Steering). Inicialmente concebido para Fungi, se ha identificado que el modelo biológico (crecimiento y desarrollo) es universal tanto para Hongos como para Plantas (Plantae). Depender de una curva de tiempo continuo (calendario estricto) o programar lógica específica por especie (`if tomato... if mushroom...`) limita la escalabilidad y no refleja la realidad del cultivo, donde el paso del tiempo no siempre garantiza la madurez fisiológica.

## Decisión
Se ha decidido arquitectar el sistema de Crop Steering bajo un modelo de **Máquina de Estados Agnóstica**, fundamentado en la separación estricta de tres conceptos universales:

1. **Etapa (Stage)**: Dónde debería estar el cultivo según el modelo productivo (ej. Incubación, Vegetativo, Floración). Define los *Setpoints Ambientales* a aplicar.
2. **Estado (State)**: Dónde parece estar *realmente* el cultivo según las evidencias disponibles (ej. % de colonización, altura, número de nudos, DLI acumulado, PDI/CEI).
3. **Transición (Transition Rule)**: La condición lógica que evalúa el *Estado* para determinar cuándo avanzar a la siguiente *Etapa*.

### Implicaciones Críticas para el Proyecto

1. **Motor Agnóstico Universal**: El "Motor de Estado del Cultivo" (Backend) no conocerá de especies. Únicamente evaluará un archivo de configuración (`Profile`) que contiene Etapas, Indicadores Observables, Condiciones de Transición y Setpoints. Sirve idénticamente para Tomate, Lechuga o Pleurotus.
2. **Evolución por Generaciones (Lean Startup)**:
   - *MVP*: La Transición evalúa el tiempo (días transcurridos) y permite anulación (override) mediante observación manual del operador.
   - *V1*: Transiciones condicionadas por métricas simples y telemetría (Sensores).
   - *V2/V3*: El Estado se estima automáticamente mediante modelos multimodales y Visión Artificial (Computer Vision).
3. **Múltiples Fuentes de Verdad**: El sistema debe estar preparado para ingerir datos de múltiples fuentes (Morfología manual, Ambiente/Sensores, Raíz/Solución, Consumo, y Fotografías) para calcular el Índice de Estado (PDI/CEI).
4. **Transiciones Suaves**: Al cambiar de Etapa, el motor permite estrategias de transición (ej. `LINEAR`) para interpolar gradualmente los setpoints, imitando ciclos naturales estacionales.

## Consecuencias
- **Positivas**: Arquitectura masivamente escalable. Permite lanzar un MVP útil (basado en tiempo/manual) sin requerir Inteligencia Artificial, pero sentando las bases exactas de datos estructurados necesarios para entrenar modelos predictivos en el futuro.
- **Negativas/Riesgos**: La interfaz del perfil JSON (Profile) será más compleja, ya que debe abstraer indicadores morfológicos y lógicos genéricos (ej. `evaluar si: { sensor: 'camera_nodes', operator: '>=', value: 8 }`). Requiere un diseño de Base de Datos / JSON Schema muy cuidadoso en las próximas fases.
