require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { InfluxDB } = require('@influxdata/influxdb-client');

const app = express();
app.use(cors()); // Esencial para conectar con React más adelante

// Conexión de Leitura con InfluxDB
const influxDB = new InfluxDB({ url: process.env.INFLUX_URL, token: process.env.INFLUX_TOKEN });
const queryApi = influxDB.getQueryApi(process.env.INFLUX_ORG);

// Creamos nuestra ruta principal (Endpoint)
app.get('/api/telemetria', (req, res) => {
  console.log('Recibiendo petición para leer datos...');
  
  // El lenguaje de consulta de InfluxDB se llama Flux.
  // Aquí pedimos los datos de la última hora (-1h) de nuestra correa
  const fluxQuery = `
    from(bucket: "${process.env.INFLUX_BUCKET}")
      |> range(start: -1h)
      |> filter(fn: (r) => r._measurement == "telemetria_correa")
  `;

  const resultados = [];

  // Ejecutamos la consulta
  queryApi.queryRows(fluxQuery, {
    next(row, tableMeta) {
      const o = tableMeta.toObject(row);
      // Formateamos el objeto que será enviado a React
      resultados.push({
        tiempo: o._time,
        campo: o._field, // Será 'temperatura', 'humedad' o 'choque'
        valor: o._value
      });
    },
    error(error) {
      console.error('Error al consultar InfluxDB:', error);
      res.status(500).json({ error: 'Fallo en la conexión con la base de datos' });
    },
    complete() {
      // Cuando termina de leer, envía todo en formato JSON
      res.json(resultados);
    },
  });
});

// Iniciamos el servidor en el puerto 3001
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`API REST del Backend corriendo en: http://localhost:${PORT}`);
});