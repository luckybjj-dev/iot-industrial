import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Area, ReferenceArea
} from 'recharts';
import { Activity, Thermometer, Droplets, Wind, Database, AlertTriangle } from 'lucide-react';
import { fetchDeviceHistory } from '../services/firebaseService';
import type { HistorialData, DeviceCropProfile, TelemetriaFungi } from '../types/cultivo';
import { StatsAccordion } from './StatsAccordion';

interface Props {
  deviceId: string;
  config?: DeviceCropProfile;
  realtimeTelemetry?: TelemetriaFungi;
  onOfflineStatusChange?: (isOffline: boolean, lastSeen: number | null) => void;
}

/**
 * Componente encargado de renderizar el gráfico histórico y en vivo.
 * Recibe `config` (setpoints del cultivo) vía props desde App.tsx para sobreponer los rangos ideales.
 */
export const TelemetryDashboard: React.FC<Props> = ({ deviceId, config, realtimeTelemetry, onOfflineStatusChange }) => {
  const [data, setData] = useState<HistorialData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [timeWindow, setTimeWindow] = useState<number>(1); // days
  const [hiddenLines, setHiddenLines] = useState<Record<string, boolean>>({
    temp_ambiente: false,
    temp_sustrato: false,
    hum_ambiente: false,
    vpd_calculado: false
  });

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const loadData = async () => {
      try {
        // Descargamos ~30 días asumiendo 1 dato cada 5 min (aprox 8640). 
        // El peso es ~1.7 MB, muy seguro para la cuota de 10 GB de Firebase.
        const history = await fetchDeviceHistory(deviceId, 8640); 
        if (isMounted) {
          setData(history);
        }
      } catch (err) {
        console.error("Error loading history:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();
    return () => { isMounted = false; };
  }, [deviceId]);

  // Filtrar data por ventana de tiempo y preprocesarla
  const { chartData, gaps, isCurrentlyOffline, lastSeen } = useMemo(() => {
    const cutoff = Date.now() - (timeWindow * 24 * 3600000);
    const filtered = data
      .filter(d => d.timestamp >= cutoff)
      .map(d => {
        // Fallbacks para adaptarse a cómo se guarde en Firebase realmente
        const t_amb = d.temp_promedio ?? d.temp_ambiente ?? d.temp_aire;
        const h_amb = (d as any).humedad_promedio ?? d.humedad_aire;
        
        return {
          ...d,
          temp_ambiente: typeof t_amb === 'number' ? Number(t_amb.toFixed(2)) : undefined,
          temp_sustrato: typeof d.sensor_analogico === 'number' ? Number(d.sensor_analogico.toFixed(2)) : undefined,
          hum_ambiente: typeof h_amb === 'number' ? Number(h_amb.toFixed(2)) : undefined,
          vpd_calculado: typeof d.vpd === 'number' ? Number(d.vpd.toFixed(2)) : undefined,
        };
      });

    // Añadir el punto actual (en vivo) al gráfico si existe y es reciente
    const rtAny = realtimeTelemetry as any;
    if (rtAny && rtAny.timestamp) {
      if (filtered.length === 0 || rtAny.timestamp > filtered[filtered.length - 1].timestamp) {
        filtered.push({
          timestamp: rtAny.timestamp,
          temp_ambiente: (rtAny.temp_promedio ?? rtAny.temp_ambiente) || 0,
          temp_sustrato: rtAny.sensor_analogico || 0,
          hum_ambiente: (rtAny.humedad_promedio ?? rtAny.humedad_aire) || 0,
          vpd_calculado: rtAny.vpd || 0
        });
      }
    }

    // Detectar "Gaps" (Desconexiones mayores a 15 minutos)
    const detectedGaps: { start: number, end: number }[] = [];
    for (let i = 1; i < filtered.length; i++) {
      if (filtered[i].timestamp - filtered[i - 1].timestamp > 900000) { // 15 minutos
        detectedGaps.push({
          start: filtered[i - 1].timestamp,
          end: filtered[i].timestamp
        });
      }
    }

    // Comprobar si AHORA MISMO está offline en el borde derecho
    let isCurrentlyOffline = false;
    if (filtered.length > 0) {
      const lastPoint = filtered[filtered.length - 1];
      if (Date.now() - lastPoint.timestamp >= 900000) {
        detectedGaps.push({ start: lastPoint.timestamp, end: Date.now() });
        isCurrentlyOffline = true;
      }
    }

    // Frontend Downsampling: Agrupar y promediar si hay más de 500 puntos para no colapsar la UI
    let finalData = filtered;
    const MAX_POINTS = 500;
    if (filtered.length > MAX_POINTS) {
      const chunkSize = Math.ceil(filtered.length / MAX_POINTS);
      const downsampled = [];
      
      for (let i = 0; i < filtered.length; i += chunkSize) {
        const chunk = filtered.slice(i, i + chunkSize);
        
        let sumTempAmb = 0, countTempAmb = 0;
        let sumTempSus = 0, countTempSus = 0;
        let sumHum = 0, countHum = 0;
        let sumVpd = 0, countVpd = 0;
        
        chunk.forEach(p => {
          if (p.temp_ambiente !== undefined) { sumTempAmb += p.temp_ambiente; countTempAmb++; }
          if (p.temp_sustrato !== undefined) { sumTempSus += p.temp_sustrato; countTempSus++; }
          if (p.hum_ambiente !== undefined) { sumHum += p.hum_ambiente; countHum++; }
          if (p.vpd_calculado !== undefined) { sumVpd += p.vpd_calculado; countVpd++; }
        });

        // Para asegurar que llega al final, el último chunk toma su timestamp final, los demás el medio.
        const isLastChunk = i + chunkSize >= filtered.length;
        const timeIndex = isLastChunk ? chunk.length - 1 : Math.floor(chunk.length / 2);
        
        downsampled.push({
          ...chunk[timeIndex],
          temp_ambiente: countTempAmb > 0 ? Number((sumTempAmb / countTempAmb).toFixed(2)) : undefined,
          temp_sustrato: countTempSus > 0 ? Number((sumTempSus / countTempSus).toFixed(2)) : undefined,
          hum_ambiente: countHum > 0 ? Number((sumHum / countHum).toFixed(2)) : undefined,
          vpd_calculado: countVpd > 0 ? Number((sumVpd / countVpd).toFixed(2)) : undefined,
        });
      }
      finalData = downsampled;
    }

    // Proyección al borde derecho para continuidad perfecta
    if (finalData.length > 0 && !isCurrentlyOffline) {
      const lastPoint = finalData[finalData.length - 1];
      if (Date.now() - lastPoint.timestamp > 5000) {
        finalData.push({ ...lastPoint, timestamp: Date.now() });
      }
    }

    return { 
      chartData: finalData, 
      gaps: detectedGaps,
      isCurrentlyOffline,
      lastSeen: filtered.length > 0 ? filtered[filtered.length - 1].timestamp : null
    };
  }, [data, timeWindow, realtimeTelemetry]);

  const onOfflineStatusChangeRef = useRef(onOfflineStatusChange);
  useEffect(() => {
    onOfflineStatusChangeRef.current = onOfflineStatusChange;
  }, [onOfflineStatusChange]);

  // Emitir estado offline hacia el padre
  useEffect(() => {
    if (onOfflineStatusChangeRef.current) {
      onOfflineStatusChangeRef.current(isCurrentlyOffline, lastSeen);
    }
  }, [isCurrentlyOffline, lastSeen]);

  // Calcular promedios para la ventana actual
  const averages = useMemo(() => {
    if (chartData.length === 0) return { tempAmb: 0, tempSus: 0, hum: 0, vpd: 0 };
    
    let sumTempAmb = 0, sumTempSus = 0, sumHum = 0, sumVpd = 0;
    let countTempAmb = 0, countTempSus = 0, countHum = 0, countVpd = 0;
    
    chartData.forEach(d => {
      if (d.temp_ambiente !== undefined) { sumTempAmb += d.temp_ambiente; countTempAmb++; }
      if (d.temp_sustrato !== undefined) { sumTempSus += d.temp_sustrato; countTempSus++; }
      if (d.hum_ambiente !== undefined) { sumHum += d.hum_ambiente; countHum++; }
      if (d.vpd_calculado !== undefined) { sumVpd += d.vpd_calculado; countVpd++; }
    });
    
    return {
      tempAmb: countTempAmb > 0 ? (sumTempAmb / countTempAmb).toFixed(1) : '--',
      tempSus: countTempSus > 0 ? (sumTempSus / countTempSus).toFixed(1) : '--',
      hum: countHum > 0 ? (sumHum / countHum).toFixed(1) : '--',
      vpd: countVpd > 0 ? (sumVpd / countVpd).toFixed(2) : '--'
    };
  }, [chartData]);

  const handleLegendClick = (e: any) => {
    const { dataKey } = e;
    setHiddenLines(prev => ({
      ...prev,
      [dataKey]: !prev[dataKey]
    }));
  };

  const renderLegendText = (value: string, entry: any) => {
    const { dataKey } = entry;
    const isHidden = hiddenLines[dataKey];
    return (
      <span style={{ 
        color: isHidden ? '#ffffff50' : '#fff', 
        textDecoration: isHidden ? 'line-through' : 'none', 
        transition: 'all 0.3s ease' 
      }}>
        {value}
      </span>
    );
  };

  const formatXAxis = (tickItem: number) => {
    const date = new Date(tickItem);
    if (timeWindow <= 1) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-black/90 border border-white/10 p-3 rounded-lg shadow-xl">
          <p className="text-white/70 text-xs mb-2">{new Date(label).toLocaleString()}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm font-bold" style={{ color: entry.color }}>
              <span>{entry.name}:</span>
              <span>{entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-[#121212] border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col h-[700px]">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-500/20 text-blue-400 rounded-xl">
            <Activity size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">SCADA Telemetry</h2>
            <p className="text-sm text-neutral-400 flex items-center gap-2">
              <Database size={14} className="text-emerald-400" />
              Almacenamiento Histórico ({timeWindow === 1/24 ? '1 Hora' : timeWindow === 1 ? '24 Horas' : `${timeWindow} Días`})
            </p>
          </div>
        </div>

        {/* CASCADING SELECTORS (ISA-95) - Static for MVP */}
        <div className="flex flex-wrap gap-2">
          <select className="bg-black/40 border border-white/10 text-white text-sm rounded-lg p-2 focus:ring-1 focus:ring-blue-500 outline-none">
            <option>AgroFungi Sur S.A.</option>
          </select>
          <select className="bg-black/40 border border-white/10 text-white text-sm rounded-lg p-2 focus:ring-1 focus:ring-blue-500 outline-none">
            <option>Nave de Cultivo N° 1</option>
          </select>
          <select className="bg-black/40 border border-white/10 text-white text-sm rounded-lg p-2 focus:ring-1 focus:ring-blue-500 outline-none">
            <option>Carpa Fructificación A</option>
          </select>
          <select className="bg-blue-500/20 border border-blue-500/50 text-blue-300 font-bold text-sm rounded-lg p-2 focus:ring-1 focus:ring-blue-500 outline-none">
            <option>{deviceId}</option>
          </select>
        </div>
      </div>



      {/* QUICK STATS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-4">
            <Thermometer className="text-orange-400" size={32} />
            <div>
              <div className="text-neutral-400 text-sm">Temp. Amb. Prom.</div>
              <div className="text-2xl font-bold text-white">{averages.tempAmb}°C</div>
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-4">
            <Thermometer className="text-emerald-400" size={32} />
            <div>
              <div className="text-neutral-400 text-sm">Temp. Sus. Prom.</div>
              <div className="text-2xl font-bold text-white">{averages.tempSus}°C</div>
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-4">
            <Droplets className="text-blue-400" size={32} />
            <div>
              <div className="text-neutral-400 text-sm">Hum. Promedio</div>
              <div className="text-2xl font-bold text-white">{averages.hum}%</div>
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-4">
            <Wind className="text-purple-400" size={32} />
            <div>
              <div className="text-neutral-400 text-sm">VPD Promedio</div>
              <div className="text-2xl font-bold text-white">{averages.vpd} kPa</div>
            </div>
          </div>
        </div>

      {/* CHART & CONTROLS CONTAINER */}
      <div className="bg-black/30 border border-white/5 rounded-xl p-4 flex-1 flex flex-col min-h-0">
        {/* CONTROLS */}
        <div className="flex justify-between items-center gap-2 mb-4">
          <div className="text-sm font-bold text-neutral-400 uppercase tracking-widest">
            Gráfico Histórico
          </div>
          <div className="flex justify-end gap-2">
          {[1/24, 1, 7, 15, 30].map(days => (
            <button 
              key={days}
              onClick={() => setTimeWindow(days)}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
                timeWindow === days 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              {days === 1/24 ? '1 Hora' : days === 1 ? '24 Horas' : `${days} Días`}
            </button>
          ))}
        </div>
        </div>

      {/* CHART */}
      <div className="flex-1 min-h-0 w-full relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#121212]/50 z-10 rounded-lg">
            <span className="text-blue-400 animate-pulse font-bold">Cargando histórico...</span>
          </div>
        )}
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 15, right: 20, left: -20, bottom: 5 }}>
            <defs>
              <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#fb923c" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#fb923c" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorHum" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#60a5fa" stopOpacity={0}/>
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
            <XAxis 
              dataKey="timestamp" 
              type="number" 
              domain={[Date.now() - (timeWindow * 24 * 3600000), Date.now()]} 
              tickFormatter={formatXAxis}
              stroke="#ffffff50"
              tick={{ fill: '#ffffff50', fontSize: 12 }}
              dy={10}
            />
            
            {/* Y Axis Left: Temperaturas (Naranja) */}
            {/**
              * Auto-escalado dinámico del Eje Y mediante la función `domain`:
              * En lugar de fijar valores rígidos, Recharts calcula el min/max basándose en la 
              * telemetría actual (`dataMin`, `dataMax`). Luego, interceptamos ese cálculo 
              * y lo expandimos usando los límites ideales (`temp_ideal_min`, `temp_ideal_max`, `temp_sustrato_ideal`)
              * provenientes de `config`. Esto garantiza que la "zona verde" (ReferenceArea) siempre
              * se vea en pantalla, independientemente de si la temperatura actual está muy lejos de ella.
              * Añadimos un padding (ej. -2 y +2) para mayor margen visual.
              */}
            <YAxis 
              yAxisId="left" 
              stroke="#fb923c" 
              tick={{ fill: '#fb923c', fontSize: 11 }}
              dx={-5}
              domain={([dataMin, dataMax]) => {
                let min = dataMin;
                let max = dataMax;
                if (config?.temp_ideal_min !== undefined) min = Math.min(min, Number(config.temp_ideal_min));
                if (config?.temp_ideal_max !== undefined) max = Math.max(max, Number(config.temp_ideal_max));
                if (config?.temp_sustrato_ideal !== undefined) {
                  min = Math.min(min, Number(config.temp_sustrato_ideal));
                  max = Math.max(max, Number(config.temp_sustrato_ideal));
                }
                return [Math.floor(min - 2), Math.ceil(max + 2)];
              }}
            />
            {/* Y Axis Right: Humedad (Azul) */}
            <YAxis 
              yAxisId="right" 
              orientation="right" 
              stroke="#60a5fa" 
              tick={{ fill: '#60a5fa', fontSize: 11 }}
              dx={5}
              domain={([dataMin, dataMax]) => {
                let min = dataMin;
                let max = dataMax;
                if (config?.hum_ideal_min !== undefined) min = Math.min(min, Number(config.hum_ideal_min));
                if (config?.hum_ideal_max !== undefined) max = Math.max(max, Number(config.hum_ideal_max));
                return [Math.max(0, Math.floor(min - 5)), Math.min(100, Math.ceil(max + 5))];
              }}
            />
            {/* Y Axis Right: VPD (Morado) */}
            <YAxis 
              yAxisId="vpd" 
              orientation="right" 
              stroke="#c084fc" 
              tick={{ fill: '#c084fc', fontSize: 11 }}
              dx={5}
              domain={[0, 'auto']}
            />

            <Tooltip content={<CustomTooltip />} />
            <Legend 
              verticalAlign="top" 
              height={36} 
              iconType="circle" 
              onClick={handleLegendClick}
              formatter={renderLegendText}
              wrapperStyle={{ cursor: 'pointer', userSelect: 'none' }}
            />
            
            {/* Banda Ideal Temperatura Ambiente */}
            {config?.temp_ideal_min !== undefined && config?.temp_ideal_max !== undefined && !hiddenLines['temp_ambiente'] && (
              <ReferenceArea 
                yAxisId="left" 
                y1={Number(config.temp_ideal_min)} 
                y2={Number(config.temp_ideal_max)} 
                fill="#fb923c" 
                fillOpacity={0.15}
                stroke="#fb923c"
                strokeOpacity={0.4}
                strokeDasharray="4 4"
              />
            )}
            
            {/* Banda Ideal Humedad */}
            {config?.hum_ideal_min !== undefined && config?.hum_ideal_max !== undefined && !hiddenLines['hum_ambiente'] && (
              <ReferenceArea 
                yAxisId="right" 
                y1={Number(config.hum_ideal_min)} 
                y2={Number(config.hum_ideal_max)} 
                fill="#60a5fa" 
                fillOpacity={0.15}
                stroke="#60a5fa"
                strokeOpacity={0.4}
                strokeDasharray="4 4"
              />
            )}

            {config?.temp_sustrato_ideal !== undefined && !hiddenLines['temp_sustrato'] && (
              <ReferenceLine 
                y={Number(config.temp_sustrato_ideal)} 
                yAxisId="left" 
                stroke="#10b981" 
                strokeDasharray="3 3" 
                label={{ position: 'top', value: 'Obj. Sustrato', fill: '#10b981', fontSize: 10 }} 
              />
            )}

            {/* Offline Gaps Indication */}
            {gaps.map((gap, i) => (
              <ReferenceArea 
                key={`gap-${i}`} 
                x1={gap.start} 
                x2={gap.end} 
                fill="#ef4444" 
                fillOpacity={0.15}
                label={{ position: 'insideTop', value: 'OFFLINE', fill: '#ef4444', fontSize: 10, fontWeight: 'bold' }}
              />
            ))}

            <Area 
              yAxisId="left"
              type="monotone" 
              dataKey="temp_ambiente" 
              name="Temp. Ambiente (°C)"
              stroke="#fb923c" 
              fillOpacity={1}
              fill="url(#colorTemp)"
              strokeWidth={2}
              connectNulls={true}
              hide={hiddenLines['temp_ambiente']}
            />
            <Line 
              yAxisId="left"
              type="monotone" 
              dataKey="temp_sustrato" 
              name="Temp. Sustrato (°C)"
              stroke="#10b981" 
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 6, fill: "#10b981", stroke: "#000", strokeWidth: 2 }}
              connectNulls={true}
              hide={hiddenLines['temp_sustrato']}
            />
            <Area 
              yAxisId="right"
              type="monotone" 
              dataKey="hum_ambiente" 
              name="Humedad (%)"
              stroke="#60a5fa" 
              fillOpacity={1}
              fill="url(#colorHum)"
              strokeWidth={2}
              connectNulls={true}
              hide={hiddenLines['hum_ambiente']}
            />
            <Line 
              yAxisId="vpd"
              type="monotone" 
              dataKey="vpd_calculado" 
              name="VPD (kPa)"
              stroke="#c084fc" 
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6, fill: "#c084fc", stroke: "#000", strokeWidth: 2 }}
              connectNulls={true}
              hide={hiddenLines['vpd_calculado']}
            />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
