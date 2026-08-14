# Finalización Frente 2: Dashboard SCADA Industrial

El rediseño del Frontend en React se completó con éxito. Transformamos una aplicación genérica en un **Panel de Control (SCADA) de Grado Industrial**, enfocado en la usabilidad, la prevención de errores, y el monitoreo en tiempo real del nuevo motor de reglas del ESP32.

## 🚀 Nuevas Características Incorporadas

### 🚦 Semáforo de Clima Inteligente (`SemaforoEstabilidad.tsx`)
- **Evaluación Dinámica:** Este componente ya no adivina si el clima está bien; ahora lee el JSON del motor de reglas directo desde Firebase.
- Si las métricas actuales disparan *alguna* regla (Ej: Hace demasiado frío y se activa el calefactor), el semáforo cambia a **Naranja ("CORRIGIENDO CLIMA")**.
- Si ninguna regla está disparada, significa que el clima está en sus umbrales óptimos y se muestra **Verde ("CLIMA ESTABLE")**.
- Si se pierde la lectura de sensores (failsafe), muestra una alerta crítica **Roja ("FALLO CRÍTICO")**.

### ⚙️ Editor de Reglas Visual (`RuleEditorModal.tsx`)
- Construimos una interfaz gráfica que te permite agregar, editar o eliminar hasta 20 reglas termodinámicas sin tocar código.
- Simplemente dices: *`SI TEMP > 25 ENTONCES EXTRACTOR ON`*, le das a guardar, y el frontend se encarga de serializar esto en JSON y mandarlo a Firebase. El ESP32 lo descargará de inmediato y actualizará su cerebro local.

### 📈 Gráfico Unificado Avanzado (`UnifiedHistoryChart.tsx`)
- Usando Recharts, consolidamos todas las variables en un solo lienzo cruzado (Estilo Grafana).
- Tienes la humedad y la temperatura mapeadas simultáneamente con sombreados de área, mientras que la temperatura del sustrato y el **VPD** aparecen como líneas sobrepuestas.
- Esto permite detectar correlaciones climáticas instantáneas.

### ⚠️ UX Anti-Errores: Alertas de Override Manual
- Rediseñamos los botones de actuadores (`MetricCard.tsx` y `App.tsx`).
- Cuando forzas el sistema a Modo `MANUAL` (Overrides), el panel entero reacciona: los botones de control pasan de un sutil azul a un **Naranja Neón Parpadeante**, indicándote visualmente que *"El piloto automático está apagado"*. 
- También se lee y muestra en pantalla el `max_manual_time_ms` para que sepas en cuántos minutos caducará el modo manual (por defecto 15 min).

## 🛠️ Validación Técnica
- Todo se acopló sobre `firebaseService.ts` usando TypeScript estricto.
- Se mantuvieron las dependencias Lean (TailwindCSS v4, Recharts, Lucide).
- Interfaz completamente responsiva (Mobile-first a 4K).

> [!TIP]
> ¡El sistema está listo! Para correrlo, abre una terminal en `frontend_react` y corre `npm run dev`.
