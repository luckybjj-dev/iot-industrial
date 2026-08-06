import { useEffect, useRef, useState } from 'react';
import { subscribeToAllDevices, subscribeToDeviceConfig, sendCommand, sendModeCommand, sendConfigRules, updateConfigField } from './services/firebaseService';
import type { EstadoCamara, ConfiguracionCultivo, DeviceCropProfile } from './types/cultivo';
import { MetricCard } from './components/MetricCard';
import { TelemetryDashboard } from './components/TelemetryDashboard';
import { SemaforoEstabilidad } from './components/SemaforoEstabilidad';
import { CropProfileSelectorModal } from './components/CropProfileSelectorModal';
import { Thermometer, Droplets, Leaf, Activity, Wind, Power, Settings2, ShieldAlert, Sprout } from 'lucide-react';

function App() {
  const [camaras, setCamaras] = useState<EstadoCamara[]>([]);
  const [configs, setConfigs] = useState<{ [deviceId: string]: ConfiguracionCultivo }>({});
  const [error, setError] = useState<string | null>(null);
  
  // Estado optimista para hacer que la UI se sienta instantánea aunque el hardware demore
  const [optimisticModes, setOptimisticModes] = useState<Record<string, 'AUTO' | 'MANUAL'>>({});
  
  // Timer manual
  const [manualStartTimes, setManualStartTimes] = useState<Record<string, number>>({});
  const [now, setNow] = useState<number>(Date.now());
  
  // Modales
  const [editingRulesFor, setEditingRulesFor] = useState<string | null>(null);

  useEffect(() => {
    const ticker = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(ticker);
  }, []);

  // Ref para evitar múltiples llamadas de revert en el mismo segundo
  const revertingRef = useRef<Set<string>>(new Set());

  // ── AUTO-REVERT A MODO AUTO ──────────────────────────────────────────────
  // Se ejecuta cada segundo (gracias al ticker de 'now').
  // Cuando el cronómetro manual de un dispositivo llega a cero,
  // React envía el comando AUTO a Firebase sin depender del ESP32.
  useEffect(() => {
    camaras.forEach(camara => {
      const modo = optimisticModes[camara.deviceId] ?? camara.modo_operacion ?? 'AUTO';
      if (modo !== 'MANUAL') {
        revertingRef.current.delete(camara.deviceId);
        return;
      }
      if (revertingRef.current.has(camara.deviceId)) return;

      const start = manualStartTimes[camara.deviceId];
      if (!start) return;

      const config = configs[camara.deviceId];
      const timeoutMs = (config?.max_manual_time_ms && config.max_manual_time_ms >= 60000)
        ? config.max_manual_time_ms
        : 300000;

      if ((now - start) >= timeoutMs) {
        revertingRef.current.add(camara.deviceId);
        // Actualización optimista inmediata para bloquear re-trigger
        setOptimisticModes(prev => ({ ...prev, [camara.deviceId]: 'AUTO' }));
        setManualStartTimes(prev => {
          const next = { ...prev };
          delete next[camara.deviceId];
          return next;
        });
        // Enviar comando AUTO a Firebase
        sendModeCommand(camara.deviceId, 'AUTO')
          .catch(err => console.error('[AutoRevert] Error:', err))
          .finally(() => revertingRef.current.delete(camara.deviceId));
      }
    });
  }, [now]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Suscribirse a Firebase RTDB para Telemetría
    const unsubscribeTelemetria = subscribeToAllDevices((devices) => {
      setCamaras(devices);
      setError(null);
      // Limpiar estados optimistas SOLO cuando recibimos update real del servidor que coincida
      setOptimisticModes(prev => {
        const next = { ...prev };
        let changed = false;
        devices.forEach(dev => {
          if (next[dev.deviceId] === dev.modo_operacion) {
            delete next[dev.deviceId];
            changed = true;
          }
        });
        return changed ? next : prev;
      });
      
      // Update manual start times
      setManualStartTimes(prev => {
        const next = { ...prev };
        devices.forEach(dev => {
          if (dev.modo_operacion === 'MANUAL' && !next[dev.deviceId]) {
            next[dev.deviceId] = Date.now();
          } else if (dev.modo_operacion === 'AUTO') {
            delete next[dev.deviceId];
          }
        });
        return next;
      });
    });

    return () => unsubscribeTelemetria();
  }, []);

  // ── SUSCRIPCIÓN A CONFIGURACIONES ──────────────────────────────────────
  // Usa un ref para rastrear suscripciones activas y evitar que se
  // destruyan cada vez que 'camaras' se actualiza por telemetría.
  const configSubsRef = useRef<Record<string, () => void>>({});

  useEffect(() => {
    camaras.forEach(camara => {
      // Solo suscribirse si no hay listener activo para este deviceId
      if (!configSubsRef.current[camara.deviceId]) {
        const unsub = subscribeToDeviceConfig(camara.deviceId, (config) => {
          if (config) {
            setConfigs(prev => ({ ...prev, [camara.deviceId]: config }));
          }
        });
        configSubsRef.current[camara.deviceId] = unsub;
      }
    });
    // No cleanup aquí — las suscripciones persisten mientras el componente viva
  }, [camaras]);

  // Cleanup global al desmontar
  useEffect(() => {
    return () => {
      Object.values(configSubsRef.current).forEach(unsub => unsub());
      configSubsRef.current = {};
    };
  }, []);

  const handleToggleMode = async (deviceId: string, currentMode: 'AUTO' | 'MANUAL') => {
    try {
      const newMode = currentMode === 'AUTO' ? 'MANUAL' : 'AUTO';
      setOptimisticModes(prev => ({ ...prev, [deviceId]: newMode }));
      await sendModeCommand(deviceId, newMode);
    } catch (err) {
      console.error("Error al enviar comando de modo", err);
      setOptimisticModes(prev => {
        const next = { ...prev };
        delete next[deviceId];
        return next;
      });
    }
  };

  const handleToggleActuator = async (deviceId: string, actuator: string, currentState: boolean, currentMode: 'AUTO' | 'MANUAL') => {
    if (currentMode === 'AUTO') return;
    try {
      await sendCommand(deviceId, actuator, !currentState);
    } catch (err) {
      console.error("Error al enviar comando", err);
    }
  };

  // updateConfigField ahora viene del import de firebaseService.ts
  // Usa update() en la raíz /commands/ (correcto para campos de config)

  const handleSaveRules = async (deviceId: string, crop: DeviceCropProfile, profileName?: string, phaseName?: string) => {
    try {
      await sendConfigRules(deviceId, { 
        crop: crop,
        activeProfileName: profileName || 'Desconocido',
        activePhaseName: phaseName || 'Desconocida'
      });
    } catch (error) {
      console.error("Error saving crop profile:", error);
      throw error;
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-neutral-200 font-sans selection:bg-emerald-500/30">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center border-b border-white/10 pb-6">
          <div>
            <h1 className="text-4xl font-black mb-2 tracking-tighter uppercase text-white flex items-center gap-3">
              SCADA <span className="text-emerald-500">Node</span>
            </h1>
            <p className="text-neutral-500 text-sm font-mono tracking-widest uppercase">
              Supervisory Control & Data Acquisition
            </p>
          </div>
          <div className="mt-4 md:mt-0 flex items-center gap-3">
             <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.7)]"></div>
             <span className="text-sm font-bold text-neutral-400 tracking-widest uppercase">System Online</span>
          </div>
        </header>

        {error && (
          <div className="bg-red-950/50 border border-red-500/50 text-red-400 px-6 py-4 rounded-xl mb-8 flex items-center space-x-3 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
            <Activity size={24} />
            <span className="font-bold tracking-wide uppercase">{error}</span>
          </div>
        )}

        {camaras.length === 0 && !error ? (
          <div className="flex flex-col items-center justify-center h-64 border border-white/5 bg-[#0a0a0a] rounded-3xl">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mb-6"></div>
            <p className="text-neutral-500 font-mono text-sm tracking-widest uppercase">Conectando con Firebase RTDB...</p>
          </div>
        ) : (
          <div className="space-y-12">
            {camaras.map((camara) => {
              const modo = optimisticModes[camara.deviceId] || camara.modo_operacion || 'AUTO';
              const config = configs[camara.deviceId];
              const crop = config?.crop;

              const getTarget = (variable: 'TEMP' | 'HUMEDAD' | 'VPD' | 'CO2') => {
                if (!crop) return undefined;
                if (variable === 'TEMP') return `${crop.temp_ideal_min} - ${crop.temp_ideal_max} °C`;
                if (variable === 'HUMEDAD') return `${crop.hum_ideal_min} - ${crop.hum_ideal_max} %`;
                if (variable === 'CO2') return `< ${crop.co2_ideal_max} ppm`;
                return undefined;
              };

              return (
                <div key={camara.deviceId} className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
                  {/* Decorative background grid */}
                  <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5 pointer-events-none"></div>

                  {/* Header de Nodo */}
                  <div className="flex flex-col xl:flex-row justify-between items-start gap-6 mb-8 relative z-10">
                    <div className="w-full xl:w-1/3">
                      <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-2xl font-black text-white tracking-tighter uppercase">{camara.deviceId}</h2>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black tracking-widest uppercase border ${camara.estado.includes('ONLINE') ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
                          {camara.estado}
                        </span>
                      </div>
                      <p className="text-neutral-500 text-xs font-mono tracking-widest mb-3">TS: {camara.ultima_actualizacion || 'N/A'}</p>
                      
                      {/* Active Profile Info */}
                      {(config as any)?.activeProfileName && (
                        <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 px-3 py-1.5 rounded-lg">
                          <Sprout size={14} className="text-purple-400" />
                          <div>
                            <div className="text-[10px] font-bold text-purple-400 uppercase tracking-widest leading-none">{(config as any).activeProfileName}</div>
                            <div className="text-[10px] text-neutral-400 mt-0.5">Etapa: {(config as any).activePhaseName}</div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="w-full xl:w-2/3 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-end">
                      
                      <button
                        onClick={() => setEditingRulesFor(camara.deviceId)}
                        className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors text-sm font-bold tracking-widest uppercase text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                      >
                        <Settings2 size={18} />
                        Gestor de Perfiles
                      </button>

                      <button
                        onClick={() => handleToggleMode(camara.deviceId, modo)}
                        className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-black tracking-widest uppercase transition-all duration-300 shadow-xl ${
                          modo === 'AUTO'
                            ? 'bg-blue-600/20 border border-blue-500/50 text-blue-400 hover:bg-blue-600/30 shadow-blue-500/10'
                            : 'bg-orange-500 border border-orange-500 text-black hover:bg-orange-400 shadow-orange-500/30 animate-pulse'
                        }`}
                      >
                        {modo === 'AUTO' ? (
                          <>MODO: AUTOMÁTICO</>
                        ) : (
                          <>
                            <ShieldAlert size={18} />
                            OVERRIDE MANUAL
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {camara.telemetria ? (
                    <div className="space-y-8 relative z-10">
                      
                      {/* Semáforo Inteligente */}
                      <SemaforoEstabilidad 
                        telemetria={camara.telemetria} 
                        crop={crop ?? null} 
                        modo_operacion={modo} 
                      />

                      {/* HERO CARDS - Métricas */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                        <MetricCard
                          title="Temp. Ambiente"
                          value={camara.telemetria.temp_aire?.toFixed(1) || '--'}
                          unit="°C"
                          icon={Thermometer}
                          colorClass="text-amber-400"
                          status={!camara.telemetria.dht_ok ? 'DANGER' : 'STABLE'}
                          target={getTarget('TEMP')}
                        />
                        <MetricCard
                          title="Humedad Relativa"
                          value={camara.telemetria.humedad_aire?.toFixed(1) || '--'}
                          unit="%"
                          icon={Droplets}
                          colorClass="text-cyan-400"
                          status={!camara.telemetria.dht_ok ? 'DANGER' : 'STABLE'}
                          target={getTarget('HUMEDAD')}
                        />
                        <MetricCard
                          title="Temp. Sustrato"
                          value={camara.telemetria.sensor_analogico?.toFixed(1) || '--'}
                          unit="°C"
                          icon={Leaf}
                          colorClass="text-emerald-400"
                          status={!camara.telemetria.analogico_ok ? 'DANGER' : 'STABLE'}
                        />
                        <MetricCard
                          title="VPD (Déficit Presión)"
                          value={camara.telemetria.vpd?.toFixed(2) || '--'}
                          unit="kPa"
                          icon={Activity}
                          colorClass="text-purple-400"
                          status={camara.telemetria.vpd && (camara.telemetria.vpd < 0.4 || camara.telemetria.vpd > 1.6) ? 'WARNING' : 'STABLE'}
                          target={getTarget('VPD')}
                        />
                        <MetricCard
                          title="Nivel CO2"
                          value={camara.telemetria.co2_ppm?.toString() || '--'}
                          unit="ppm"
                          icon={Wind}
                          colorClass="text-sky-400"
                          target={getTarget('CO2')}
                        />
                      </div>
                      
                      {/* ACTUADORES & GRAFICO */}
                      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                        {/* PANEL DE CONTROL DE ACTUADORES */}
                        <div className="xl:col-span-1 bg-[#121212] border border-white/5 rounded-2xl p-6 flex flex-col space-y-6">
                          <div className="border-b border-white/10 pb-4">
                            <h3 className="text-sm font-black text-neutral-300 uppercase tracking-widest flex items-center gap-2">
                              Actuadores
                              {modo === 'MANUAL' && <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>}
                            </h3>
                            {modo === 'AUTO' && (
                              <p className="text-[10px] text-blue-400 font-mono uppercase tracking-widest mt-2">
                                Bloqueado por Rule Engine
                              </p>
                            )}
                            {modo === 'MANUAL' && (
                              <div className="mt-2 flex items-center justify-between">
                                <p className="text-[10px] text-orange-400 font-mono uppercase tracking-widest flex items-center gap-2">
                                  T/O:{' '}
                                  <span className="font-bold text-xs bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
                                  {(() => {
                                    const start = manualStartTimes[camara.deviceId];
                                    const timeoutMs = (config?.max_manual_time_ms && config.max_manual_time_ms >= 60000) ? config.max_manual_time_ms : 300000;
                                    if (!start) return `${Math.floor(timeoutMs / 60000)}:00`;
                                    const elapsed = now - start;
                                    const remaining = Math.max(0, timeoutMs - elapsed);
                                    const minutes = Math.floor(remaining / 60000);
                                    const seconds = Math.floor((remaining % 60000) / 1000);
                                    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                                  })()}
                                  </span>
                                </p>
                                <select 
                                  className="bg-black/50 border border-orange-500/30 text-orange-400 text-[10px] uppercase font-mono tracking-widest px-2 py-1 rounded outline-none cursor-pointer"
                                  value={(config?.max_manual_time_ms || 300000).toString()}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    updateConfigField(camara.deviceId, 'max_manual_time_ms', val);
                                    // Reset del cronómetro al nuevo valor seleccionado
                                    setManualStartTimes(prev => ({ ...prev, [camara.deviceId]: Date.now() }));
                                  }}
                                >
                                  <option value="300000">5 MIN</option>
                                  <option value="600000">10 MIN</option>
                                  <option value="900000">15 MIN</option>
                                  <option value="1800000">30 MIN</option>
                                  <option value="3600000">60 MIN</option>
                                </select>
                              </div>
                            )}
                          </div>
                          
                          {/* Actuadores List */}
                          {[
                            { id: 'fogger_on', label: 'Niebla', icon: Droplets, val: camara.telemetria.fogger_on, activeBg: 'bg-cyan-500/20 text-cyan-500 border-cyan-500/30', manualBg: 'bg-orange-500 text-black shadow-[0_0_15px_rgba(249,115,22,0.4)] border-orange-400' },
                            { id: 'extractor_on', label: 'Extractor', icon: Wind, val: camara.telemetria.extractor_on, activeBg: 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30', manualBg: 'bg-orange-500 text-black shadow-[0_0_15px_rgba(249,115,22,0.4)] border-orange-400' },
                            { id: 'heater_on', label: 'Calefactor', icon: Activity, val: camara.telemetria.heater_on, activeBg: 'bg-amber-500/20 text-amber-500 border-amber-500/30', manualBg: 'bg-orange-500 text-black shadow-[0_0_15px_rgba(249,115,22,0.4)] border-orange-400' },
                            { id: 'light_on', label: 'Luz', icon: Power, val: camara.telemetria.light_on, activeBg: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30', manualBg: 'bg-orange-500 text-black shadow-[0_0_15px_rgba(249,115,22,0.4)] border-orange-400' },
                          ].map((act) => (
                            <div key={act.id} className="flex items-center justify-between bg-black/40 p-3 rounded-xl border border-white/5">
                              <span className="text-neutral-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                                <act.icon size={14}/> {act.label}
                              </span>
                              <button 
                                disabled={modo === 'AUTO'}
                                onClick={() => handleToggleActuator(camara.deviceId, act.id, act.val, modo)}
                                className={`px-4 py-1.5 rounded-lg text-xs font-black tracking-widest uppercase transition-all duration-300 border ${
                                  modo === 'AUTO'
                                    ? act.val 
                                      ? act.activeBg 
                                      : 'bg-neutral-900 text-neutral-600 border-neutral-800'
                                    : act.val 
                                      ? act.manualBg 
                                      : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 border-neutral-700'
                                }`}
                              >
                                {act.val ? 'ON' : 'OFF'}
                              </button>
                            </div>
                          ))}
                        </div>

                        {/* GRÁFICO HISTÓRICO UNIFICADO (TELEMETRÍA) */}
                        <div className="xl:col-span-3">
                          <TelemetryDashboard topology={null} />
                        </div>
                      </div>

                    </div>
                  ) : (
                    <div className="text-center py-12 text-neutral-500 font-mono text-sm uppercase tracking-widest">
                      Esperando stream de telemetría RTDB...
                    </div>
                  )}

                  {/* Modal de Reglas para este device */}
                  {editingRulesFor === camara.deviceId && (
                    <CropProfileSelectorModal
                      deviceId={camara.deviceId}
                      isOpen={true}
                      onClose={() => setEditingRulesFor(null)}
                      onSave={async (newRules, profileName, phaseName) => {
                        await handleSaveRules(camara.deviceId, newRules, profileName, phaseName);
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
