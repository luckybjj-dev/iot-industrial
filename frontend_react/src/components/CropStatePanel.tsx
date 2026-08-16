import React, { useState, useEffect } from 'react';
import type { ConfiguracionCultivo } from '../types/cultivo';
import { getAllProfiles, generateDeviceProfile } from '../data/CropProfiles';
import { sendConfigRules, subscribeToPlanState } from '../services/firebaseService';
import { SkipBack, SkipForward, Square, Clock, Pause, Play, AlertTriangle } from 'lucide-react';
import { StatsAccordion } from './StatsAccordion';

interface CropStatePanelProps {
    deviceId: string;
    config?: ConfiguracionCultivo;
    isOffline?: boolean;
}

/**
 * Panel dinámico de Crop Steering (Manejo del ciclo de cultivo).
 * Arquitectura UI:
 * Este componente no solo muestra el progreso del plan actual, sino que actúa como 
 * un inyector instantáneo de configuraciones. Cuando el usuario navega de fase, 
 * el panel genera el nuevo perfil (a través de `generateDeviceProfile`) y hace
 * push directamente a la RTDB (`sendConfigRules`), sobrescribiendo instantáneamente
 * `currentPhaseConfig` y `nextPhaseConfig`.
 * De esta forma, evita el round-trip de un backend procesador: los componentes como
 * `App.tsx` y el ESP32 reciben la nueva configuración en milisegundos gracias al stream.
 */
const CropStatePanel: React.FC<CropStatePanelProps> = ({ deviceId, config, isOffline }) => {
    const [loading, setLoading] = useState(false);
    const [planState, setPlanState] = useState<any>(null);
    const [timeRemaining, setTimeRemaining] = useState<string>('');
    const [isTransitioning, setIsTransitioning] = useState<boolean>(false);

    useEffect(() => {
        const unsubscribe = subscribeToPlanState(deviceId, (state) => {
            setPlanState(state);
        });
        return () => unsubscribe();
    }, [deviceId]);

    useEffect(() => {
        if (!planState || !planState.phaseStartTime || !planState.duration_days) {
            setTimeRemaining('');
            setIsTransitioning(false);
            return;
        }

        const interval = setInterval(() => {
            const now = Date.now();
            const start = planState.phaseStartTime;
            const durationMs = planState.duration_days * 24 * 60 * 60 * 1000;
            const end = start + durationMs;
            
            const transitionMs = (planState.transition_hours || 0) * 60 * 60 * 1000;
            const transitionStart = end - transitionMs;

            if (now >= transitionStart && now < end) {
                setIsTransitioning(true);
            } else {
                setIsTransitioning(false);
            }

            const diff = end - now;
            if (diff <= 0) {
                setTimeRemaining('0d : 00h : 00m');
            } else {
                const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
                const minutes = Math.floor((diff / 1000 / 60) % 60);
                setTimeRemaining(`${days}d : ${hours.toString().padStart(2, '0')}h : ${minutes.toString().padStart(2, '0')}m`);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [planState]);

    const activeProfileName = planState?.activeProfileName || config?.activeProfileName;
    const activePhaseName = planState?.activePhaseName || config?.activePhaseName;
    const isActive = !!(activeProfileName && activePhaseName);

    const handleStopPlan = async () => {
        if (!window.confirm("¿Seguro que deseas detener el ciclo por completo? Se perderá el progreso actual.")) return;
        setLoading(true);
        try {
            await sendConfigRules(deviceId, null);
        } catch (e) {
            console.error('Error al detener plan:', e);
            alert('Error al detener el plan en la base de datos.');
        }
        setLoading(false);
    };

    const handlePausePlan = async () => {
        if (!window.confirm(planState?.isPaused ? "¿Deseas reanudar el ciclo de cultivo?" : "¿Seguro que deseas pausar el ciclo? La automatización de clima se congelará.")) return;
        setLoading(true);
        try {
            await sendConfigRules(deviceId, { ...planState, isPaused: !planState?.isPaused });
        } catch (e) {
            console.error('Error al pausar plan:', e);
            alert('Error al pausar el plan.');
        }
        setLoading(false);
    };

    const handleNavigatePhase = async (direction: 'NEXT' | 'PREV') => {
        if (!isActive) return;

        const allProfiles = getAllProfiles();
        const profile = Object.values(allProfiles).find(p => p.commonName === activeProfileName);
        
        if (!profile) {
            alert('No se pudo encontrar el perfil activo en la enciclopedia.');
            return;
        }

        const phases = profile.phases;
        const currentIndex = phases.findIndex(p => p.name === activePhaseName);

        if (currentIndex === -1) return;

        let targetIndex = direction === 'NEXT' ? currentIndex + 1 : currentIndex - 1;

        if (planState?.transitioningTo && direction === 'NEXT') {
            targetIndex = phases.findIndex(p => p.name === planState.transitioningTo);
            if (!window.confirm(`La transición ya estaba en curso. ¿Deseas forzar el salto final hacia: ${phases[targetIndex].name}?`)) return;
        } else if (direction === 'NEXT') {
            const isFungiEnd = targetIndex >= phases.length && profile.kingdom === 'FUNGI';
            
            if (isFungiEnd) {
                if (!window.confirm('El ciclo de descanso ha terminado. ¿Iniciar un nuevo ciclo de fructificación (Re-flush)?')) return;
                targetIndex = 1; // Fase 2
            } else if (targetIndex >= phases.length) {
                alert('El cultivo ya está en su última fase biológica.');
                return;
            } else if (!isFungiEnd) {
                if (!window.confirm(`¿Estás seguro de avanzar hacia: ${phases[targetIndex].name}?`)) return;
            }

            const currentPhase = phases[currentIndex];
            const currentTHours = currentPhase.transition_hours ?? 48;
            if (currentTHours > 0) {
                const wantSmooth = window.confirm(`¿Deseas iniciar la transición suave de ${currentTHours}h hacia la siguiente fase de inmediato?\n\n(OK = Transición Suave / Cancelar = Salto Brusco)`);
                
                if (wantSmooth) {
                    setLoading(true);
                    try {
                        const durationMs = (currentPhase.duration_days || 14) * 24 * 60 * 60 * 1000;
                        const transitionMs = currentTHours * 60 * 60 * 1000;
                        const fakeStartTime = Date.now() - durationMs + transitionMs;

                        const currentPhaseConfig = generateDeviceProfile(currentPhase);
                        const nextPhaseConfig = generateDeviceProfile(phases[targetIndex]);

                        await sendConfigRules(deviceId, {
                            activeProfileName: profile.commonName,
                            activePhaseName: currentPhase.name,
                            phaseStartTime: fakeStartTime,
                            duration_days: currentPhase.duration_days || 14,
                            transition_hours: currentTHours,
                            currentPhaseConfig,
                            nextPhaseConfig,
                            transitioningTo: phases[targetIndex].name
                        });
                        alert('Transición continua iniciada. El reloj se ha adelantado a las últimas horas de esta fase.');
                    } catch (e) {
                        alert('Error al iniciar la transición suave');
                    } finally {
                        setLoading(false);
                    }
                    return;
                }
            }
        } else if (direction === 'PREV') {
            if (targetIndex < 0) {
                alert('Ya estás en la primera fase.');
                return;
            }
            if (!window.confirm(`¿Estás seguro de retroceder bruscamente a la fase: ${phases[targetIndex].name}?`)) return;
        }

        const targetPhase = phases[targetIndex];
        const nextNextPhase = phases[targetIndex + 1];
        setLoading(true);

        try {
            const currentPhaseConfig = generateDeviceProfile(targetPhase);
            const nextPhaseConfig = nextNextPhase ? generateDeviceProfile(nextNextPhase) : null;

            await sendConfigRules(deviceId, {
                activeProfileName: profile.commonName,
                activePhaseName: targetPhase.name,
                phaseStartTime: Date.now(),
                duration_days: targetPhase.duration_days || 14,
                transition_hours: targetPhase.transition_hours || 48,
                currentPhaseConfig,
                nextPhaseConfig
            });
        } catch (e) {
            alert('Error al navegar de fase');
        } finally {
            setLoading(false);
        }
    };

    const renderCompactTimeline = () => {
        if (!isActive || !planState?.phaseStartTime) return null;
        
        const allProfiles = getAllProfiles();
        const profile = Object.values(allProfiles).find(p => p.commonName === activeProfileName);
        if (!profile) return null;

        const phases = profile.phases;
        const currentIndex = phases.findIndex(p => p.name === activePhaseName);
        if (currentIndex === -1) return null;

        return (
            <div className="mt-6">
                <div className="flex items-center justify-between relative">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-neutral-800 rounded-full z-0"></div>
                    {phases.map((phase, idx) => {
                        const isPast = idx < currentIndex;
                        const isCurrent = idx === currentIndex;
                        
                        let bgColor = 'bg-neutral-800';
                        let borderColor = 'border-neutral-700';
                        if (isPast) {
                            bgColor = 'bg-emerald-500';
                            borderColor = 'border-emerald-400';
                        }
                        if (isCurrent) {
                            bgColor = 'bg-amber-500';
                            borderColor = 'border-amber-400';
                        }

                        return (
                            <div key={phase.id} className="relative z-10 flex flex-col items-center group cursor-default">
                                <div className={`w-3 h-3 md:w-4 md:h-4 rounded-full border-2 transition-all ${bgColor} ${borderColor} ${isCurrent ? 'shadow-[0_0_10px_rgba(245,158,11,0.6)] scale-125' : ''}`}></div>
                                <div className="absolute top-6 whitespace-nowrap text-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/90 px-2 py-1 rounded text-[10px] text-neutral-300 pointer-events-none z-20">
                                    <span className="font-bold text-white block">{phase.name}</span>
                                    {phase.duration_days} días {phase.transition_hours ? `(Trans: ${phase.transition_hours}h)` : ''}
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="flex justify-between mt-2 px-1">
                    <span className="text-[10px] text-emerald-500/70 uppercase tracking-widest font-bold">Inicio</span>
                    <span className="text-[10px] text-neutral-500/70 uppercase tracking-widest font-bold">Fin de Ciclo</span>
                </div>
            </div>
        );
    };

    const titleContent = (
        <div className="flex justify-between items-center w-full pr-4">
            <div className="flex items-center gap-3">
                <h3 className="text-sm font-black text-neutral-200 uppercase tracking-widest flex items-center gap-2">
                    Estado del Cultivo
                </h3>
                <span className={`px-2 py-0.5 rounded text-[9px] font-black tracking-widest uppercase border ${isActive ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-neutral-500/20 text-neutral-400 border-neutral-500/30'}`}>
                    {isActive ? 'ACTIVO' : 'INACTIVO'}
                </span>
                {isOffline && (
                    <span className="px-2 py-0.5 rounded text-[9px] font-black tracking-widest uppercase border bg-red-500/20 text-red-500 border-red-500/30 animate-pulse flex items-center gap-1">
                        <AlertTriangle size={10} />
                        Desconectado
                    </span>
                )}
            </div>
            {isActive && (
                <span className="text-emerald-400/80 font-bold text-[10px] uppercase tracking-widest bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 mr-2">
                    {activeProfileName}
                </span>
            )}
        </div>
    );

    return (
        <StatsAccordion title={titleContent} defaultOpen={true}>
            <div className="relative overflow-hidden -mt-4">
                {/* Soft background glow */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>

                <div>
                {!isActive ? (
                    <div className="text-center py-6 bg-white/5 rounded-xl border border-white/5">
                        <p className="text-neutral-400 text-xs mb-1">Sin plan dinámico activo.</p>
                        <p className="text-neutral-500 text-[10px] italic">Inicia uno desde el Gestor de Perfiles.</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-5">
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Fase Actual */}
                            <div className="bg-white/5 border border-white/5 rounded-xl p-4 flex flex-col justify-center">
                                <span className="text-neutral-500 text-[10px] font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
                                    Fase Biológica
                                    {planState?.isPaused && (
                                        <span className="text-yellow-400 bg-yellow-400/20 px-1 py-0.5 rounded text-[8px] animate-pulse">PAUSADO</span>
                                    )}
                                </span>
                                <span className="text-amber-400 font-black text-lg uppercase tracking-wider truncate" title={planState?.transitioningTo ? `Transición hacia ${planState.transitioningTo}` : activePhaseName}>
                                    {planState?.transitioningTo ? `Transición...` : activePhaseName?.replace(/^\d+\.\s*/, '')}
                                </span>
                            </div>
                            
                            {/* Tiempo Restante */}
                            {timeRemaining && (
                                <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4 flex flex-col justify-center relative overflow-hidden">
                                    <div className="flex items-center justify-between mb-1 z-10">
                                        <span className="text-neutral-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5">
                                            <Clock size={12} className={isTransitioning ? 'text-cyan-500 animate-spin-slow' : 'text-neutral-500'} />
                                            Restante
                                        </span>
                                        {isTransitioning && (
                                            <span className="text-[9px] text-cyan-400 font-bold bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/30 animate-pulse">
                                                TRANSICIÓN
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-white font-mono text-xl tracking-wider z-10">{timeRemaining}</span>
                                </div>
                            )}
                        </div>

                        {renderCompactTimeline()}

                        <div className="flex items-center justify-between mt-2 pt-4 border-t border-white/5">
                            <p className="text-neutral-600 text-[10px] italic max-w-[60%] leading-tight">
                                Ajuste automático de Setpoints activo.
                            </p>
                            
                            <div className="flex items-center gap-2">
                                <button 
                                    className="p-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 rounded-lg transition-colors disabled:opacity-50" 
                                    onClick={() => handleNavigatePhase('PREV')}
                                    disabled={loading}
                                    title="Retroceder Fase"
                                >
                                    <SkipBack size={16} />
                                </button>
                                <button 
                                    className="p-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/20 rounded-lg transition-colors disabled:opacity-50" 
                                    onClick={handlePausePlan}
                                    disabled={loading}
                                    title={planState?.isPaused ? "Reanudar Plan" : "Pausar Plan"}
                                >
                                    {planState?.isPaused ? <Play size={16} /> : <Pause size={16} />}
                                </button>
                                <button 
                                    className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg transition-colors disabled:opacity-50" 
                                    onClick={handleStopPlan}
                                    disabled={loading}
                                    title="Detener Plan"
                                >
                                    <Square size={16} />
                                </button>
                                <button 
                                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-widest rounded-lg transition-colors shadow-[0_0_10px_rgba(245,158,11,0.2)] disabled:opacity-50 text-[10px] flex items-center gap-1.5" 
                                    onClick={() => handleNavigatePhase('NEXT')}
                                    disabled={loading}
                                >
                                    {loading ? '...' : 'Avanzar'}
                                    <SkipForward size={14} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            </div>
        </StatsAccordion>
    );
};

export default CropStatePanel;
