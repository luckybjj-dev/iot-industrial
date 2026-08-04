import React, { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Activity, Thermometer, Droplets, Wind, Database } from 'lucide-react';
import type { IndustrialTopology, PlantNode } from '../types/DataModel';

// Fake Data Generator para propósitos de demostración del Dashboard 
// (En producción, esto vendría de Firebase RTDB /history)
const generateMockTelemetry = (days: number) => {
  const data = [];
  const now = Date.now();
  for (let i = 0; i < days * 24; i++) { // 1 punto por hora
    const timestamp = now - (days * 24 - i) * 3600000;
    const hour = new Date(timestamp).getHours();
    const isDay = hour >= 6 && hour <= 18;
    
    // Simulate day/night cycles
    const temp = isDay ? 24 + Math.random() * 2 : 18 + Math.random() * 2;
    const hum = isDay ? 70 + Math.random() * 5 : 85 + Math.random() * 5;
    const vpd = isDay ? 0.8 + Math.random() * 0.2 : 0.4 + Math.random() * 0.1;
    
    data.push({
      timestamp,
      temperature: Number(temp.toFixed(2)),
      humidity: Number(hum.toFixed(2)),
      vpd: Number(vpd.toFixed(2))
    });
  }
  return data;
};

const MOCK_DATA = generateMockTelemetry(30);

interface Props {
  topology: IndustrialTopology | null;
  onSelectNode?: (node: PlantNode) => void;
}

export const TelemetryDashboard: React.FC<Props> = () => {
  // En un entorno de producción, 'topology' se usaría para rellenar los selectores
  // y 'onSelectNode' para emitir eventos hacia App.tsx. Por ahora (MVP), usamos
  // los selectores internos con el mock data.
  const [selectedFarm, setSelectedFarm] = useState<string>('farm_01');
  const [selectedRoom, setSelectedRoom] = useState<string>('room_01');
  const [selectedZone, setSelectedZone] = useState<string>('zone_01');
  const [selectedNode, setSelectedNode] = useState<string>('node_01');

  const [timeWindow, setTimeWindow] = useState<number>(30); // days

  // Filtrar data por ventana de tiempo
  const chartData = useMemo(() => {
    const cutoff = Date.now() - (timeWindow * 24 * 3600000);
    return MOCK_DATA.filter(d => d.timestamp >= cutoff);
  }, [timeWindow]);

  const formatXAxis = (tickItem: number) => {
    const date = new Date(tickItem);
    if (timeWindow <= 1) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
      
      {/* HEADER & TOPOLOGY SELECTOR */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-500/20 text-blue-400 rounded-xl">
            <Activity size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">SCADA Telemetry</h2>
            <p className="text-sm text-neutral-400 flex items-center gap-2">
              <Database size={14} className="text-emerald-400" />
              Almacenamiento Histórico (30 Días)
            </p>
          </div>
        </div>

        {/* CASCADING SELECTORS (ISA-95) */}
        <div className="flex flex-wrap gap-2">
          <select value={selectedFarm} onChange={e => setSelectedFarm(e.target.value)} className="bg-black/40 border border-white/10 text-white text-sm rounded-lg p-2 focus:ring-1 focus:ring-blue-500 outline-none">
            <option value="farm_01">AgroFungi Sur S.A.</option>
          </select>
          <select value={selectedRoom} onChange={e => setSelectedRoom(e.target.value)} className="bg-black/40 border border-white/10 text-white text-sm rounded-lg p-2 focus:ring-1 focus:ring-blue-500 outline-none">
            <option value="room_01">Nave de Cultivo N° 1</option>
          </select>
          <select value={selectedZone} onChange={e => setSelectedZone(e.target.value)} className="bg-black/40 border border-white/10 text-white text-sm rounded-lg p-2 focus:ring-1 focus:ring-blue-500 outline-none">
            <option value="zone_01">Carpa Fructificación A</option>
          </select>
          <select value={selectedNode} onChange={e => setSelectedNode(e.target.value)} className="bg-blue-500/20 border border-blue-500/50 text-blue-300 font-bold text-sm rounded-lg p-2 focus:ring-1 focus:ring-blue-500 outline-none">
            <option value="node_01">ESP32_Agnostic_01</option>
          </select>
        </div>
      </div>

      {/* QUICK STATS */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-4">
          <Thermometer className="text-orange-400" size={32} />
          <div>
            <div className="text-neutral-400 text-sm">Temp Promedio</div>
            <div className="text-2xl font-bold text-white">21.4°C</div>
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-4">
          <Droplets className="text-blue-400" size={32} />
          <div>
            <div className="text-neutral-400 text-sm">Hum Promedio</div>
            <div className="text-2xl font-bold text-white">82.1%</div>
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-4">
          <Wind className="text-purple-400" size={32} />
          <div>
            <div className="text-neutral-400 text-sm">VPD Promedio</div>
            <div className="text-2xl font-bold text-white">0.65 kPa</div>
          </div>
        </div>
      </div>

      {/* CONTROLS */}
      <div className="flex justify-end gap-2 mb-4">
        {[1, 7, 15, 30].map(days => (
          <button 
            key={days}
            onClick={() => setTimeWindow(days)}
            className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
              timeWindow === days 
                ? 'bg-blue-500 text-white' 
                : 'bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            {days === 1 ? '24 Horas' : `${days} Días`}
          </button>
        ))}
      </div>

      {/* CHART */}
      <div className="flex-1 min-h-0 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
            <XAxis 
              dataKey="timestamp" 
              type="number" 
              domain={['dataMin', 'dataMax']} 
              tickFormatter={formatXAxis}
              stroke="#ffffff50"
              tick={{ fill: '#ffffff50', fontSize: 12 }}
              dy={10}
            />
            
            {/* Y Axis Left: Temp & Hum */}
            <YAxis 
              yAxisId="left" 
              stroke="#ffffff50" 
              tick={{ fill: '#ffffff50', fontSize: 12 }}
              dx={-10}
            />
            {/* Y Axis Right: VPD */}
            <YAxis 
              yAxisId="right" 
              orientation="right" 
              stroke="#ffffff50" 
              tick={{ fill: '#ffffff50', fontSize: 12 }}
              dx={10}
            />

            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="top" height={36} iconType="circle" />
            
            <Line 
              yAxisId="left"
              type="monotone" 
              dataKey="temperature" 
              name="Temperatura (°C)"
              stroke="#fb923c" 
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6, fill: "#fb923c", stroke: "#000", strokeWidth: 2 }}
            />
            <Line 
              yAxisId="left"
              type="monotone" 
              dataKey="humidity" 
              name="Humedad (%)"
              stroke="#60a5fa" 
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6, fill: "#60a5fa", stroke: "#000", strokeWidth: 2 }}
            />
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="vpd" 
              name="VPD (kPa)"
              stroke="#c084fc" 
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6, fill: "#c084fc", stroke: "#000", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
};
