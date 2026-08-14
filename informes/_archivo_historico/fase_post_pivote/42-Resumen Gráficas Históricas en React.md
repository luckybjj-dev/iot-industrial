# Resumen: Gráficas Históricas en React

¡El frontend ha sido actualizado con éxito para consumir y graficar la bitácora del ESP32!

## Cambios Realizados

1. **Instalación de Librerías**:
   - Añadimos `recharts`, una excelente librería de componentes gráficos diseñada nativamente para React.

2. **Capa de Servicios (`firebaseService.ts`)**:
   - Implementamos la función `fetchDeviceHistory(deviceId, limit)`.
   - Utiliza consultas de Firebase (`query`, `orderByChild`, `limitToLast`) para traer eficientemente solo los últimos `N` puntos de datos guardados (por defecto 100), previniendo saturar la memoria del navegador.

3. **Componente Visual (`HistoryChart.tsx`)**:
   - Se creó un componente dedicado que recibe el `deviceId`.
   - Muestra un estado de "Cargando..." mientras hace el *fetch* asíncrono a Firebase.
   - Formatea el timestamp Unix (inyectado por Firebase desde el ESP32) a horas legibles en la interfaz (ej. "14:30").
   - Dibuja un gráfico de líneas elegante (`LineChart`) con:
     - **Eje Y primario (Izquierda)**: Temperatura del aire (en amarillo).
     - **Eje Y secundario (Derecha)**: Humedad relativa (en cian).
     - **Tooltip Interactivo**: Al pasar el ratón se ven los valores exactos.

4. **Integración en el Dashboard (`App.tsx`)**:
   - Se añadió un botón de **"Ver Historial" / "Ocultar Historial"** junto al estado del dispositivo.
   - El gráfico se renderiza **condicionalmente**. Es decir, la app arranca rápido mostrando solo la telemetría en vivo, y el usuario puede expandir el gráfico solo cuando lo necesita.

## Resultados de Validación

- El proyecto fue compilado (`npm run build`) exitosamente sin errores de TypeScript.
- Puedes probarlo abriendo tu terminal en la carpeta `frontend_react` y corriendo:
  ```bash
  npm run dev
  ```

---

> [!TIP]
> Si acabas de programar el ESP32, es posible que tarde 10 minutos (el `INTERVALO_HISTORIAL`) en publicar su primer punto. El gráfico se adaptará automáticamente una vez empiecen a llegar los datos.
