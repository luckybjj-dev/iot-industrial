# Null-Safety UI - Implementación Completada

Se ha cerrado exitosamente la brecha de observabilidad (End-to-End) desde la placa de hardware hasta el Dashboard del usuario, introduciendo manejo nativo de punteros nulos en C++ e interfaces resilientes en React.

## Cambios Ejecutados

### 1. Edge Layer (`main.cpp`)
- Sustituidos los valores hardcodeados estáticos (ej. 24.5 °C). Ahora, si `dhtOk` o `sustratoOk` caen a `false`, la placa envía explícitamente `(char*)0` al documento estático JSON. ArduinoJson traduce esto automáticamente a un tipo de dato `null`.

### 2. Backend Layer (`subscriber.ts`)
- **Blindaje de Tipos**: `TelemetriaFungi` ahora acepta `number | null`.
- **Protección de InfluxDB**: La base de datos de series temporales (TSDB) ya no intentará ingestar o promediar los sensores muertos. Si la lectura es `null`, simplemente se omite la escritura para ese campo específico (gracias a `.floatField()`), preservando la limpieza del modelo de datos histórico sin crashear el proceso Node.

### 3. Frontend Layer (`App.tsx` & `cultivo.ts`)
- **Cortafuegos de Renderizado (Fail-Safe UI)**: Las tarjetas `<MetricCard>` ahora están protegidas por renderizado condicional. Al detectar un fallo (ej. `dht_ok == false`), el árbol DOM oculta las métricas defectuosas y levanta de inmediato una zona de advertencia:
  > ⚠️ DHT22 Desconectado
- **Visibilidad Completa**: Se añadió el indicador visual *Badge* (color ámbar cálido) en la interfaz para monitorear el estado real de la **Manta Calefactora**.

## Siguientes Pasos
Levanta el servidor frontend en tu terminal local con `npm run dev` y el servidor backend con `npm start` (o ejecutando el archivo TS). Desconecta un sensor de la placa y mira cómo el panel web y el backend absorben el golpe limpiamente.
