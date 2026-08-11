import React, { useEffect, useState } from 'react';
import { 
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { fetchDeviceHistory } from '../services/firebaseService';
import type { HistorialData } from '../types/cultivo';
import { Activity } from 'lucide-react';

interface HistoryChartProps {
  targetSubstrateTemp?: number;
  deviceId: string;
}

import { ReferenceLine } from 'recharts';
export const HistoryChart: React.FC<HistoryChartProps> = ({ deviceId, targetSubstrateTemp }) => {
  const [data, setData] = useState<HistorialData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        setLoading(true);
        const history = await fetchDeviceHistory(deviceId, 200); // Traer más datos para un mejor gráfico
        setData(history);
        setError(null);
      } catch (err: any) {
        setError(err.message || "Error al cargar los datos históricos.");
        console.error("Firebase fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [deviceId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 text-neutral-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mb-4"></div>
        <p className="tracking-widest uppercase text-sm">Cargando Telemetría SCADA...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-80 bg-red-500/10 border border-red-500/50 text-red-400 rounded-xl px-4">
        <Activity size={24} className="mr-3" />
        <span>{error}</span>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-80 text-neutral-500 bg-black/40 border border-white/5 rounded-xl">
        <p className="tracking-widest uppercase text-sm">No hay datos históricos disponibles.</p>
      </div>
    );
  }

  const formattedData = data.map(d => ({
    ...d,
    timeLabel: new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    // Si VPD es null, pongamos 0 para graficar
    vpd_plot: d.vpd ?? 0,
    co2_plot: d.co2_ppm ?? 0
  }));

  return (
    <div className="w-full h-96 mt-6 bg-[#0a0a0a] p-6 rounded-2xl border border-white/10 shadow-2xl">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-neutral-200 tracking-widest uppercase">Análisis Multivariable</h3>
        <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-bold border border-emerald-500/30">
          ÚLTIMOS DATOS
        </span>
      </div>
      
      <ResponsiveContainer width="100%" height="85%">
        <ComposedChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          {targetSubstrateTemp !== undefined && (
            <ReferenceLine y={targetSubstrateTemp} yAxisId="left" stroke="#10b981" strokeDasharray="3 3" label={{ position: 'top', value: 'Objetivo Sustrato', fill: '#10b981', fontSize: 10 }} />
          )}
          <defs>
            <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#fbbf24" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorHum" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          
          <XAxis 
            dataKey="timeLabel" 
            stroke="#6b7280" 
            fontSize={11}
            tickMargin={10}
            axisLine={false}
            tickLine={false}
          />
          
          {/* Eje Izquierdo: Temp (y analogico) */}
          <YAxis 
            yAxisId="left" 
            stroke="#fbbf24" 
            fontSize={11}
            domain={['dataMin - 2', 'dataMax + 2']}
            axisLine={false}
            tickLine={false}
          />
          
          {/* Eje Derecho 1: Humedad */}
          <YAxis 
            yAxisId="right" 
            orientation="right" 
            stroke="#22d3ee" 
            fontSize={11}
            domain={[0, 100]}
            axisLine={false}
            tickLine={false}
          />

          {/* Eje Derecho 2: VPD (escala pequeña) */}
          <YAxis 
            yAxisId="vpdAxis" 
            orientation="right" 
            stroke="#a78bfa" 
            fontSize={11}
            domain={[0, 3]}
            hide={true} // Ocultamos el eje para no ensuciar visualmente, pero lo usamos para la línea
          />

          <Tooltip 
            contentStyle={{ backgroundColor: 'rgba(10, 10, 10, 0.95)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }}
            itemStyle={{ fontSize: '13px', fontWeight: 'bold' }}
            labelStyle={{ color: '#9ca3af', marginBottom: '8px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}
          />
          
          <Legend 
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="circle"
          />
          
          {/* Temperatura Ambiente */}
          <Area 
            yAxisId="left"
            type="monotone" 
            dataKey="temp_aire" 
            name="Temp. Aire (°C)" 
            stroke="#fbbf24" 
            fillOpacity={1} 
            fill="url(#colorTemp)" 
            strokeWidth={3}
            isAnimationActive={true}
          />
          
          {/* Humedad */}
          <Area 
            yAxisId="right"
            type="monotone" 
            dataKey="humedad_aire" 
            name="Humedad (%)" 
            stroke="#22d3ee" 
            fillOpacity={1} 
            fill="url(#colorHum)" 
            strokeWidth={3}
            isAnimationActive={true}
          />

          {/* Temperatura Sustrato (Analógico) - Solo línea */}
          <Line 
            yAxisId="left"
            type="monotone" 
            dataKey="sensor_analogico" 
            name="Temp. Sustrato (°C)" 
            stroke="#10b981" 
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
          />

          {/* VPD - Línea púrpura brillante */}
          <Line 
            yAxisId="vpdAxis"
            type="monotone" 
            dataKey="vpd_plot" 
            name="VPD (kPa)" 
            stroke="#a78bfa" 
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 6, fill: '#a78bfa', stroke: '#000', strokeWidth: 2 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

