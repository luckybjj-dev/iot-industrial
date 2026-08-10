import React, { useState } from 'react';
import type { ConfiguracionCultivo } from '../types/cultivo';
import { getAllProfiles, generateDeviceProfile } from '../data/CropProfiles';
import { sendConfigRules } from '../services/firebaseService';

interface CropStatePanelProps {
    deviceId: string;
    config?: ConfiguracionCultivo;
}

const CropStatePanel: React.FC<CropStatePanelProps> = ({ deviceId, config }) => {
    const [loading, setLoading] = useState(false);

    const activeProfileName = config?.activeProfileName;
    const activePhaseName = config?.activePhaseName;
    const isActive = !!(activeProfileName && activePhaseName);

    const handleStopPlan = async () => {
        setLoading(true);
        try {
            await sendConfigRules(deviceId, { 
                crop: null as any, 
                activeProfileName: '', 
                activePhaseName: '' 
            });
        } catch (e) {
            console.error('Error al detener plan:', e);
            alert('Error al detener el plan en la base de datos.');
        }
        setLoading(false);
    };

    const handleAdvancePhase = async () => {
        if (!isActive) return;

        const allProfiles = getAllProfiles();
        const profile = Object.values(allProfiles).find(p => p.commonName === activeProfileName);
        
        if (!profile) {
            alert('No se pudo encontrar el perfil activo en la enciclopedia.');
            return;
        }

        const phases = profile.phases;
        const currentIndex = phases.findIndex(p => p.name === activePhaseName);

        if (currentIndex === -1 || currentIndex === phases.length - 1) {
            alert('El cultivo ya está en su última fase biológica.');
            return;
        }

        const nextPhase = phases[currentIndex + 1];
        setLoading(true);

        try {
            const nextTargets = generateDeviceProfile(nextPhase);
            await sendConfigRules(deviceId, {
                crop: nextTargets,
                activePhaseName: nextPhase.name
            });
            alert(`Avanzado a: ${nextPhase.name}`);
        } catch (e) {
            alert('Error al avanzar de fase');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-[#121212] border border-white/5 rounded-2xl p-6 mb-6 shadow-2xl relative">
            <div className="flex justify-between items-center border-b border-white/10 pb-4 mb-6">
                <h3 className="text-sm font-black text-neutral-300 uppercase tracking-widest">
                    Estado del Cultivo (Crop Steering)
                </h3>
                <span className={`px-3 py-1 rounded text-[10px] font-black tracking-widest uppercase border ${isActive ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-neutral-500/20 text-neutral-400 border-neutral-500/30'}`}>
                    {isActive ? 'PLAN ACTIVO' : 'SIN PLAN'}
                </span>
            </div>

            <div>
                {!isActive ? (
                    <div className="text-center py-8">
                        <p className="text-neutral-400 text-sm mb-6">No hay un plan de cultivo dinámico activo para esta cámara.</p>
                        <p className="text-neutral-500 text-xs italic">Para iniciar un plan, utiliza el <strong>Gestor de Perfiles</strong>.</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                <span className="text-neutral-400 text-xs font-bold uppercase tracking-widest">Fase Biológica Actual:</span>
                                <span className="text-amber-400 font-black text-2xl uppercase tracking-wider">{activePhaseName}</span>
                            </div>
                            <span className="text-emerald-400/50 font-bold text-xs bg-emerald-500/10 px-3 py-1 rounded border border-emerald-500/20">{activeProfileName}</span>
                        </div>
                        
                        <div>
                            <p className="text-neutral-500 text-xs italic">El sistema ajustará automáticamente los setpoints (Temperatura, Humedad, CO2) según la receta de la fase.</p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 mt-4">
                            <button 
                                className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-widest py-4 px-6 rounded-xl transition-colors shadow-[0_0_15px_rgba(245,158,11,0.3)] disabled:opacity-50 disabled:cursor-not-allowed" 
                                onClick={handleAdvancePhase}
                                disabled={loading}
                            >
                                {loading ? 'AVANZANDO...' : 'AVANZAR FASE MANUALMENTE'}
                            </button>
                            <button 
                                className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 font-bold uppercase tracking-widest py-4 px-8 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
                                onClick={handleStopPlan}
                                disabled={loading}
                            >
                                {loading ? 'DETENIENDO...' : 'Detener Plan'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CropStatePanel;
