import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { fetchDeviceHistory } from '../services/firebaseService';
import type { HistorialData } from '../types/cultivo';

interface HistoricalChartsProps {
  deviceId: string;
}

export const HistoricalCharts: React.FC<HistoricalChartsProps> = ({ deviceId }) => {
  const [data, setData] = useState<HistorialData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadHistory = async () => {
      setLoading(true);
      // Solicitar los últimos 1008 registros (1 semana a 10 min por registro)
      const history = await fetchDeviceHistory(deviceId, 1008);
      
      // Formatear la fecha para que sea legible en el eje X
      const formattedData = history.map(item => {
        const date = new Date(item.timestamp);
        return {
          ...item,
          timeLabel: date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
        };
      });
      
      setData(formattedData);
      setLoading(false);
    };

    loadHistory();
    
    // Configurar recarga cada 10 minutos (600000 ms)
    const intervalId = setInterval(loadHistory, 600000);
    return () => clearInterval(intervalId);
  }, [deviceId]);

  if (loading) {
    return <div className="text-center py-8 text-neutral-500">Cargando historial...</div>;
  }

  if (data.length === 0) {
    return <div className="text-center py-8 text-neutral-500">No hay datos históricos suficientes aún.</div>;
  }

  return (
    <div className="space-y-8 mt-8 border-t border-white/10 pt-8">
      <h3 className="text-xl font-bold text-neutral-200 mb-6 flex items-center">
        📈 Historial de Telemetría (Última semana)
      </h3>
      
      <div className="glass-card p-4 rounded-xl bg-white/5 border border-white/10">
        <h4 className="text-sm font-semibold text-neutral-300 mb-4 tracking-wider">Temperatura</h4>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
              <XAxis dataKey="timeLabel" stroke="#888" tick={{fontSize: 10}} minTickGap={50} />
              <YAxis stroke="#888" domain={['auto', 'auto']} />
              <Tooltip contentStyle={{backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff'}} />
              <Legend />
              <Line type="monotone" dataKey="temp_aire" name="Temp. Aire (°C)" stroke="#fbbf24" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="sensor_analogico" name="Temp. Sustrato (°C)" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass-card p-4 rounded-xl bg-white/5 border border-white/10">
        <h4 className="text-sm font-semibold text-neutral-300 mb-4 tracking-wider">Humedad & VPD</h4>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
              <XAxis dataKey="timeLabel" stroke="#888" tick={{fontSize: 10}} minTickGap={50} />
              <YAxis yAxisId="left" stroke="#22d3ee" domain={['auto', 'auto']} />
              <YAxis yAxisId="right" orientation="right" stroke="#c084fc" domain={['auto', 'auto']} />
              <Tooltip contentStyle={{backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff'}} />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="humedad_aire" name="Humedad (%)" stroke="#22d3ee" strokeWidth={2} dot={false} />
              <Line yAxisId="right" type="monotone" dataKey="vpd" name="VPD (kPa)" stroke="#c084fc" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
