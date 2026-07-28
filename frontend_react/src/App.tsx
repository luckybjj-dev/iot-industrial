import { useEffect, useState } from 'react';
import { fetchEstadoCultivo } from './services/apiService';
import type { EstadoCamara } from './types/cultivo';
import { MetricCard } from './components/MetricCard';
import { Thermometer, Droplets, Leaf, Activity } from 'lucide-react';

function App() {
  const [camaras, setCamaras] = useState<EstadoCamara[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await fetchEstadoCultivo();
        setCamaras(data);
        setError(null);
      } catch (err) {
        setError('Error de conexión con el Cerebro Central');
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000); // Polling cada 5 segundos
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="container mx-auto px-4 py-12 max-w-7xl">
      <header className="mb-12 text-center md:text-left">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
          Cámara Fungi <span className="text-gradient">Inteligente</span>
        </h1>
        <p className="text-neutral-400 text-lg max-w-2xl">
          Ecosistema IoT de grado industrial para la optimización de fructificación del micelio. 
          Monitoreo termodinámico en tiempo real.
        </p>
      </header>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-6 py-4 rounded-xl mb-8 flex items-center space-x-3">
          <Activity size={24} />
          <span>{error}</span>
        </div>
      )}

      {camaras.length === 0 && !error ? (
        <div className="glass-panel p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-neutral-400 text-lg">Esperando conexión con los nodos Edge...</p>
        </div>
      ) : (
        <div className="space-y-12">
          {camaras.map((camara) => (
            <div key={camara.deviceId} className="glass-panel p-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-white/10 pb-6">
                <div>
                  <h2 className="text-2xl font-bold flex items-center space-x-3">
                    <span>Nodo: {camara.deviceId}</span>
                  </h2>
                  <p className="text-neutral-400 mt-1">Última actualización: {camara.ultima_actualizacion || 'N/A'}</p>
                </div>
                <div className="mt-4 md:mt-0 px-4 py-2 rounded-full bg-white/5 border border-white/10 font-medium tracking-wide">
                  {camara.estado}
                </div>
              </div>

              {camara.telemetria ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <MetricCard
                    title="Temp. Ambiente"
                    value={camara.telemetria.temp_ambiente.toFixed(1)}
                    unit="°C"
                    icon={Thermometer}
                    colorClass="text-amber-400"
                  />
                  <MetricCard
                    title="Temp. Sustrato"
                    value={camara.telemetria.temp_sustrato.toFixed(1)}
                    unit="°C"
                    icon={Leaf}
                    colorClass="text-emerald-400"
                  />
                  <MetricCard
                    title="Humedad Relativa"
                    value={camara.telemetria.humedad.toFixed(1)}
                    unit="%"
                    icon={Droplets}
                    colorClass="text-cyan-400"
                  />
                  
                  <div className="glass-card flex flex-col justify-center space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-400 text-sm font-medium uppercase">Humidificador</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${camara.telemetria.humidificador_on ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 text-neutral-500'}`}>
                        {camara.telemetria.humidificador_on ? 'ON' : 'OFF'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-400 text-sm font-medium uppercase">Ventilador</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${camara.telemetria.ventilador_on ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-neutral-500'}`}>
                        {camara.telemetria.ventilador_on ? 'ON' : 'OFF'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-neutral-500">
                  Esperando telemetría de los sensores...
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
