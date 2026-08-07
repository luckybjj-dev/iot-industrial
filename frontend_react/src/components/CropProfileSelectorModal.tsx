import React, { useState, useEffect } from 'react';
import { X, Sprout, Play, Search, BookOpen, Edit3, Save, Plus, Trash2 } from 'lucide-react';
import type { DeviceCropProfile } from '../types/cultivo';
import { CROP_PROFILES, generateDeviceProfile } from '../data/CropProfiles';
import type { CropProfile, PhaseTargets } from '../data/CropProfiles';

interface Props {
  deviceId: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (crop: DeviceCropProfile, profileName: string, phaseName: string) => Promise<void>;
}

type TabType = 'FUNGI' | 'PLANTAE' | 'CUSTOM';

export const CropProfileSelectorModal: React.FC<Props> = ({ deviceId, isOpen, onClose, onSave }) => {
  const [activeTab, setActiveTab] = useState<TabType>('FUNGI');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProfileId, setSelectedProfileId] = useState<string>('fungi_pleurotus_ostreatus');
  const [selectedPhaseId, setSelectedPhaseId] = useState<string>('colonization');
  
  // Tuning state
  const [isEditing, setIsEditing] = useState(false);
  const [editedTargets, setEditedTargets] = useState<PhaseTargets | null>(null);

  // Custom Profiles State
  const [customProfiles, setCustomProfiles] = useState<Record<string, CropProfile>>({});

  const [isSaving, setIsSaving] = useState(false);
  // Fotoperiodo separado en horas numéricas para validar que sumen 24h
  const [editLightHours, setEditLightHours] = useState<number>(12);
  const [editDarkHours, setEditDarkHours] = useState<number>(12);
  const [editProfileName, setEditProfileName] = useState<string>('');
  const [editProfileDesc, setEditProfileDesc] = useState<string>('');
  
  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileDesc, setNewProfileDesc] = useState('');
  const [newProfileKingdom, setNewProfileKingdom] = useState<'FUNGI' | 'PLANTAE'>('FUNGI');

  useEffect(() => {
    const saved = localStorage.getItem('CUSTOM_PROFILES');
    if (saved) {
      try {
        setCustomProfiles(JSON.parse(saved));
      } catch (e) {
        console.error('Error parsing custom profiles', e);
      }
    }
  }, []);

  if (!isOpen) return null;

  const ALL_PROFILES = { ...CROP_PROFILES, ...customProfiles };
  const profile = ALL_PROFILES[selectedProfileId];
  const phase = profile?.phases.find(p => p.id === selectedPhaseId);

  // Filter logic
  const filteredProfiles = Object.values(ALL_PROFILES).filter(p => {
    if (activeTab === 'FUNGI' && p.kingdom !== 'FUNGI') return false;
    if (activeTab === 'PLANTAE' && p.kingdom !== 'PLANTAE') return false;
    if (activeTab === 'CUSTOM' && !customProfiles[p.id]) return false;
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return p.commonName.toLowerCase().includes(q) || p.scientificName.toLowerCase().includes(q);
    }
    return true;
  });

  const handleSelectProfile = (id: string, firstPhaseId: string) => {
    setSelectedProfileId(id);
    setSelectedPhaseId(firstPhaseId);
    setIsEditing(false);
    setEditedTargets(null);
  };

  const handleSelectPhase = (id: string) => {
    setSelectedPhaseId(id);
    setIsEditing(false);
    setEditedTargets(null);
  };

  const startEditing = () => {
    if (phase && profile) {
      setEditedTargets(JSON.parse(JSON.stringify(phase.targets)));
      // Parsear el fotoperiodo "12/12" en dos valores numéricos separados
      const parts = (phase.targets.lighting?.photoperiod || '12/12').split('/');
      const parseH = (v: string) => isNaN(parseInt(v)) ? 12 : parseInt(v);
      setEditLightHours(parseH(parts[0]));
      setEditDarkHours(parseH(parts[1]));
      setEditProfileName(profile.commonName);
      setEditProfileDesc(profile.description);
      setIsEditing(true);
    }
  };

  const handleDeleteCustomProfile = (id: string, name: string) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar el perfil "${name}"?\n\nEsta acción no se puede deshacer.`)) return;
    const updated = { ...customProfiles };
    delete updated[id];
    setCustomProfiles(updated);
    localStorage.setItem('CUSTOM_PROFILES', JSON.stringify(updated));
    // Si el perfil eliminado era el seleccionado, volver al primero disponible
    if (selectedProfileId === id) {
      const remaining = Object.keys(updated);
      if (remaining.length > 0) {
        handleSelectProfile(remaining[0], updated[remaining[0]].phases[0].id);
      } else {
        setSelectedProfileId('');
        setSelectedPhaseId('');
      }
    }
  };

  const handleCreateCustomProfile = () => {
    setNewProfileName('');
    setNewProfileDesc('');
    setNewProfileKingdom('FUNGI');
    setShowCreateModal(true);
  };

  const confirmCreateCustomProfile = () => {
    if (!newProfileName.trim()) {
      alert('Por favor ingresa un nombre para el perfil.');
      return;
    }
    const id = `custom_${Date.now()}`;
    const fungiTargets = {
      incubacion: {
        temperature: { day: { min: 22, max: 26 }, night: { min: 22, max: 26 } },
        humidity: { min: 80, max: 90 },
        vpd: { min: 0.8, max: 1.2 },
        co2: { min: 1000, max: 5000 },
        fae: { ach: { min: 0, max: 1 } },
        lighting: { photoperiod: '0/24' }
      },
      consolidacion: {
        temperature: { day: { min: 22, max: 26 }, night: { min: 22, max: 26 } },
        humidity: { min: 80, max: 90 },
        vpd: { min: 0.8, max: 1.2 },
        co2: { min: 1000, max: 5000 },
        fae: { ach: { min: 0, max: 1 } },
        lighting: { photoperiod: '0/24' }
      },
      induccion: {
        temperature: { day: { min: 16, max: 20 }, night: { min: 16, max: 20 } },
        humidity: { min: 95, max: 100 },
        vpd: { min: 0.1, max: 0.3 },
        co2: { min: 400, max: 800 },
        fae: { ach: { min: 4, max: 8 } },
        lighting: { photoperiod: '12/12' }
      },
      fructificacion: {
        temperature: { day: { min: 18, max: 22 }, night: { min: 18, max: 22 } },
        humidity: { min: 85, max: 95 },
        vpd: { min: 0.4, max: 0.8 },
        co2: { min: 400, max: 800 },
        fae: { ach: { min: 4, max: 8 } },
        lighting: { photoperiod: '12/12' }
      },
      descanso: {
        temperature: { day: { min: 20, max: 24 }, night: { min: 20, max: 24 } },
        humidity: { min: 70, max: 80 },
        vpd: { min: 0.8, max: 1.2 },
        co2: { min: 400, max: 1000 },
        fae: { ach: { min: 1, max: 2 } },
        lighting: { photoperiod: '0/24' }
      }
    };

    const plantaeTargets = {
      germinacion: {
        temperature: { day: { min: 22, max: 28 }, night: { min: 20, max: 25 } },
        humidity: { min: 80, max: 95 },
        vpd: { min: 0.4, max: 0.8 },
        co2: { min: 400, max: 800 },
        fae: { ach: { min: 1, max: 2 } },
        lighting: { photoperiod: '0/24' } // Frecuentemente oscuridad hasta brotar
      },
      plantula: {
        temperature: { day: { min: 20, max: 25 }, night: { min: 18, max: 22 } },
        humidity: { min: 60, max: 70 },
        vpd: { min: 0.8, max: 1.2 },
        co2: { min: 400, max: 800 },
        fae: { ach: { min: 2, max: 4 } },
        lighting: { photoperiod: '18/6' }
      },
      vegetativo: {
        temperature: { day: { min: 22, max: 28 }, night: { min: 18, max: 24 } },
        humidity: { min: 50, max: 70 },
        vpd: { min: 0.8, max: 1.2 },
        co2: { min: 400, max: 1000 },
        fae: { ach: { min: 2, max: 6 } },
        lighting: { photoperiod: '18/6' }
      },
      floracion: {
        temperature: { day: { min: 20, max: 26 }, night: { min: 16, max: 22 } },
        humidity: { min: 40, max: 50 },
        vpd: { min: 1.0, max: 1.5 },
        co2: { min: 400, max: 1200 },
        fae: { ach: { min: 4, max: 8 } },
        lighting: { photoperiod: '12/12' }
      },
      maduracion: {
        temperature: { day: { min: 18, max: 24 }, night: { min: 15, max: 20 } },
        humidity: { min: 40, max: 50 },
        vpd: { min: 1.0, max: 1.5 },
        co2: { min: 400, max: 800 },
        fae: { ach: { min: 2, max: 6 } },
        lighting: { photoperiod: '12/12' }
      }
    };

    const phases = newProfileKingdom === 'FUNGI' 
      ? [
          { id: 'fase1', name: '1. Incubación', stageTips: '', targets: JSON.parse(JSON.stringify(fungiTargets.incubacion)) },
          { id: 'fase2', name: '2. Consolidación', stageTips: '', targets: JSON.parse(JSON.stringify(fungiTargets.consolidacion)) },
          { id: 'fase3', name: '3. Inducción de primordios', stageTips: '', targets: JSON.parse(JSON.stringify(fungiTargets.induccion)) },
          { id: 'fase4', name: '4. Fructificación', stageTips: '', targets: JSON.parse(JSON.stringify(fungiTargets.fructificacion)) },
          { id: 'fase5', name: '5. Descanso', stageTips: '', targets: JSON.parse(JSON.stringify(fungiTargets.descanso)) }
        ]
      : [
          { id: 'fase1', name: '1. Germinación', stageTips: '', targets: JSON.parse(JSON.stringify(plantaeTargets.germinacion)) },
          { id: 'fase2', name: '2. Plántula', stageTips: '', targets: JSON.parse(JSON.stringify(plantaeTargets.plantula)) },
          { id: 'fase3', name: '3. Cre. Vegetativo', stageTips: '', targets: JSON.parse(JSON.stringify(plantaeTargets.vegetativo)) },
          { id: 'fase4', name: '4. Floración', stageTips: '', targets: JSON.parse(JSON.stringify(plantaeTargets.floracion)) },
          { id: 'fase5', name: '5. Maduración', stageTips: '', targets: JSON.parse(JSON.stringify(plantaeTargets.maduracion)) }
        ];

    const newProfile: CropProfile = {
      id,
      kingdom: newProfileKingdom,
      commonName: newProfileName,
      scientificName: 'Custom Species',
      description: newProfileDesc || 'Perfil personalizado',
      imageUrl: '',
      phases: phases
    };
    const newCustoms = { ...customProfiles, [id]: newProfile };
    setCustomProfiles(newCustoms);
    localStorage.setItem('CUSTOM_PROFILES', JSON.stringify(newCustoms));
    setActiveTab('CUSTOM');
    handleSelectProfile(id, 'fase1');
    setShowCreateModal(false);

    // Iniciar edición inmediatamente para los SCADA
    setTimeout(() => {
      setEditedTargets(JSON.parse(JSON.stringify(newProfile.phases[0].targets)));
      const parts = (newProfile.phases[0].targets.lighting?.photoperiod || '12/12').split('/');
      const parseH = (v: string) => isNaN(parseInt(v)) ? 12 : parseInt(v);
      setEditLightHours(parseH(parts[0]));
      setEditDarkHours(parseH(parts[1]));
      setEditProfileName(newProfile.commonName);
      setEditProfileDesc(newProfile.description);
      setIsEditing(true);
    }, 100);
  };

  const handleSaveEditsOnly = () => {
    if (!phase || !profile) return;
    
    const finalPhase = { ...phase, targets: editedTargets || phase.targets };
    const customId = profile.id.startsWith('custom_') ? profile.id : `custom_${profile.id}_${Date.now()}`;
    const finalProfileName = editProfileName || profile.commonName;
    
    const updatedProfile = { 
      ...profile, 
      id: customId, 
      commonName: finalProfileName,
      description: editProfileDesc || profile.description,
      phases: profile.phases.map(p => p.id === phase.id ? finalPhase : p) 
    };
    
    const newCustoms = { ...customProfiles, [customId]: updatedProfile };
    setCustomProfiles(newCustoms);
    localStorage.setItem('CUSTOM_PROFILES', JSON.stringify(newCustoms));
    
    if (!profile.id.startsWith('custom_')) {
       handleSelectProfile(customId, phase.id);
    }
    
    setIsEditing(false);
  };

  const handleSaveInjection = async () => {
    if (!phase) return;
    
    setIsSaving(true);
    try {
      // Usar targets editados si existen, sino los originales
      const finalPhase = { ...phase, targets: editedTargets || phase.targets };
      
      let finalProfileName = profile?.commonName || 'Desconocido';

      if (isEditing) {
        // Generar un clon customizado para guardar los cambios en localStorage
        const customId = profile.id.startsWith('custom_') ? profile.id : `custom_${profile.id}_${Date.now()}`;
        finalProfileName = editProfileName || profile.commonName;
        
        const updatedProfile = { 
          ...profile, 
          id: customId, 
          commonName: finalProfileName,
          description: editProfileDesc || profile.description,
          phases: profile.phases.map(p => p.id === phase.id ? finalPhase : p) 
        };
        
        const newCustoms = { ...customProfiles, [customId]: updatedProfile };
        setCustomProfiles(newCustoms);
        localStorage.setItem('CUSTOM_PROFILES', JSON.stringify(newCustoms));
      }

      const deviceProfile = generateDeviceProfile(finalPhase);
      await onSave(deviceProfile, finalProfileName, phase.name);
      onClose();
    } catch (e) {
      alert('Error inyectando el perfil al ESP32');
    } finally {
      setIsSaving(false);
    }
  };

  // --- RENDERS ---

  const renderEncyclopedia = () => {
    if (!profile) return null;
    return (
      <div className="bg-emerald-900/10 border border-emerald-500/20 p-4 rounded-xl flex gap-4">
        {profile.imageUrl && (
          <img src={profile.imageUrl} alt={profile.commonName} className="w-32 h-32 object-cover rounded-lg border border-emerald-500/30 shadow-lg" />
        )}
        <div className="flex-1">
          <div className="flex items-start gap-3">
            <BookOpen className="text-emerald-400 mt-1 flex-shrink-0" size={20} />
            <div className="w-full">
              <div className="flex justify-between items-center mb-1">
                <h4 className="text-white font-bold">Resumen del Perfil</h4>
                {!isEditing && activeTab === 'CUSTOM' && (
                  <button onClick={startEditing} className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 bg-blue-500/10 px-3 py-1.5 rounded-lg transition-colors">
                    <Edit3 size={16} /> Editar Perfil Completo
                  </button>
                )}
                {isEditing && (
                  <div className="flex items-center gap-2">
                    <button onClick={() => setIsEditing(false)} className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white bg-white/5 px-3 py-1.5 rounded-lg transition-colors">
                      Cancelar
                    </button>
                    <button onClick={() => setEditedTargets(JSON.parse(JSON.stringify(phase?.targets || {})))} className="flex items-center gap-2 text-sm text-orange-400 hover:text-orange-300 bg-orange-500/10 px-3 py-1.5 rounded-lg transition-colors" title="Restablecer a valores iniciales">
                      Restablecer
                    </button>
                    <button 
                      onClick={handleSaveEditsOnly}
                      disabled={editLightHours + editDarkHours !== 24}
                      className="flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      title={editLightHours + editDarkHours !== 24 ? `La suma de horas debe ser 24h` : 'Guardar perfil localmente'}
                    >
                      <Save size={16} /> Guardar Edición
                    </button>
                  </div>
                )}
              </div>
              {isEditing ? (
                <div className="space-y-2 mb-3 w-full">
                  <input type="text" value={editProfileName} onChange={e => setEditProfileName(e.target.value)} className="w-full bg-black/50 border border-white/20 p-2 rounded text-white text-sm" placeholder="Nombre del perfil..." />
                  <textarea value={editProfileDesc} onChange={e => setEditProfileDesc(e.target.value)} className="w-full bg-black/50 border border-white/20 p-2 rounded text-neutral-300 text-sm h-20" placeholder="Descripción..."></textarea>
                </div>
              ) : (
                <p className="text-sm text-neutral-300 leading-relaxed mb-3">{profile.description || 'Sin descripción disponible.'}</p>
              )}
              {phase?.stageTips && (
                <div className="bg-emerald-950/50 border border-emerald-500/20 p-3 rounded-lg shadow-inner">
                  <h5 className="text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">💡 Tips para {phase.name}</h5>
                  <p className="text-xs text-neutral-300">{phase.stageTips}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTargets = () => {
    if (!phase) return null;
    const t = isEditing && editedTargets ? editedTargets : phase.targets;

    const renderField = (label: string, valueStr: string, editElement: React.ReactNode) => (
      <div className="bg-white/5 border border-white/10 p-4 rounded-xl relative group">
        <div className="text-sm text-neutral-400 mb-1">{label}</div>
        {isEditing ? editElement : <div className="text-xl font-bold text-white">{valueStr}</div>}
      </div>
    );

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center border-b border-white/10 pb-2">
          <h3 className="text-lg font-semibold text-purple-400">3. Variables Objetivo (SCADA)</h3>
          <div className="text-sm text-neutral-400 italic">
            {!isEditing ? 'Haz clic en "Editar Perfil Completo" arriba para modificar.' : 'Edita los valores SCADA a continuación.'}
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Temperatura */}
          {renderField('Temperatura Día (°C)', `${t.temperature.day.min}° - ${t.temperature.day.max}°`, 
            <div className="flex gap-2 items-center">
              <input type="number" value={t.temperature.day.min} onChange={e => setEditedTargets({...t, temperature: {...t.temperature, day: {...t.temperature.day, min: Number(e.target.value)}}})} className="w-16 bg-black text-white p-1 rounded border border-white/20 text-center" />
              <span>-</span>
              <input type="number" value={t.temperature.day.max} onChange={e => setEditedTargets({...t, temperature: {...t.temperature, day: {...t.temperature.day, max: Number(e.target.value)}}})} className="w-16 bg-black text-white p-1 rounded border border-white/20 text-center" />
            </div>
          )}

          {/* Humedad */}
          {renderField('Humedad (%)', `${t.humidity.min}% - ${t.humidity.max}%`, 
            <div className="flex gap-2 items-center">
              <input type="number" min={0} max={100} value={t.humidity.min} onChange={e => setEditedTargets({...t, humidity: {...t.humidity, min: Math.max(0, Math.min(100, Number(e.target.value)))}})} className="w-16 bg-black text-white p-1 rounded border border-white/20 text-center" />
              <span>-</span>
              <input type="number" min={0} max={100} value={t.humidity.max} onChange={e => setEditedTargets({...t, humidity: {...t.humidity, max: Math.max(0, Math.min(100, Number(e.target.value)))}})} className="w-16 bg-black text-white p-1 rounded border border-white/20 text-center" />
            </div>
          )}

          {/* CO2 */}
          {renderField('CO2 Max (ppm)', `${t.co2.max}`, 
            <input type="number" value={t.co2.max} onChange={e => setEditedTargets({...t, co2: {...t.co2, max: Number(e.target.value)}})} className="w-20 bg-black text-white p-1 rounded border border-white/20 text-center" />
          )}

          {/* Fotoperiodo — dos inputs numéricos con validación suma=24h */}
          {renderField(
            'Fotoperiodo (Luz/Oscuridad)',
            `${t.lighting.photoperiod}`,
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex flex-col items-center">
                  <span className="text-[9px] text-yellow-400 uppercase tracking-wider mb-0.5">☀️ Luz</span>
                  <input
                    type="number" min={0} max={24}
                    value={editLightHours}
                    onChange={e => {
                      const v = Math.min(24, Math.max(0, Number(e.target.value)));
                      setEditLightHours(v);
                      setEditedTargets(prev => prev ? {...prev, lighting: {...prev.lighting, photoperiod: `${v}/${editDarkHours}`}} : prev);
                    }}
                    className="w-14 bg-black text-white p-1 rounded border border-white/20 text-center"
                  />
                </div>
                <span className="text-white font-bold mt-3">/</span>
                <div className="flex flex-col items-center">
                  <span className="text-[9px] text-blue-400 uppercase tracking-wider mb-0.5">🌙 Oscuridad</span>
                  <input
                    type="number" min={0} max={24}
                    value={editDarkHours}
                    onChange={e => {
                      const v = Math.min(24, Math.max(0, Number(e.target.value)));
                      setEditDarkHours(v);
                      setEditedTargets(prev => prev ? {...prev, lighting: {...prev.lighting, photoperiod: `${editLightHours}/${v}`}} : prev);
                    }}
                    className="w-14 bg-black text-white p-1 rounded border border-white/20 text-center"
                  />
                </div>
              </div>
              <div className={`text-[10px] font-bold text-center px-2 py-0.5 rounded ${
                editLightHours + editDarkHours === 24
                  ? 'text-emerald-400 bg-emerald-500/10'
                  : 'text-red-400 bg-red-500/10'
              }`}>
                {editLightHours}h + {editDarkHours}h = {editLightHours + editDarkHours}h
                {editLightHours + editDarkHours === 24 ? ' ✓' : ` ✗ (faltan ${24 - editLightHours - editDarkHours}h)`}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderCustomBuilder = () => {
    return (
      <div className="text-center p-12 bg-white/5 rounded-2xl border border-white/10 border-dashed">
        <Sprout size={48} className="mx-auto text-emerald-500/50 mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Creador de Perfiles</h3>
        <p className="text-neutral-400 mb-6 max-w-md mx-auto">Crea un perfil de cultivo personalizado desde cero con tus propios parámetros.</p>
        <button onClick={handleCreateCustomProfile} className="bg-emerald-500 text-white px-6 py-2 rounded-xl font-bold hover:bg-emerald-600 transition-colors flex items-center gap-2 mx-auto">
          <Plus size={20} /> Crear Nueva Especie
        </button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#121212] border border-white/10 rounded-2xl w-full max-w-[95vw] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* HEADER */}
        <div className="flex justify-between items-center p-6 border-b border-white/10 bg-black/40 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <Sprout size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Gestor de Perfiles de Cultivo</h2>
              <p className="text-sm text-neutral-400">Controlador Agnóstico • Nodo: {deviceId}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-white p-2 transition-colors rounded-lg hover:bg-white/5">
            <X size={24} />
          </button>
        </div>

        {/* NAVIGATION & SEARCH */}
        <div className="px-6 pt-6 flex-shrink-0 space-y-4">
          <div className="flex gap-2 p-1 bg-black/40 rounded-xl w-fit">
            <button onClick={() => { setActiveTab('FUNGI'); setSearchQuery(''); }} className={`px-4 py-2 rounded-lg font-medium transition-all ${activeTab === 'FUNGI' ? 'bg-white/10 text-emerald-400 shadow-sm' : 'text-neutral-400 hover:text-white'}`}>🍄 Reino Fungi</button>
            <button onClick={() => { setActiveTab('PLANTAE'); setSearchQuery(''); }} className={`px-4 py-2 rounded-lg font-medium transition-all ${activeTab === 'PLANTAE' ? 'bg-white/10 text-emerald-400 shadow-sm' : 'text-neutral-400 hover:text-white'}`}>🌿 Reino Plantae</button>
            <button onClick={() => { setActiveTab('CUSTOM'); setSearchQuery(''); }} className={`px-4 py-2 rounded-lg font-medium transition-all ${activeTab === 'CUSTOM' ? 'bg-white/10 text-purple-400 shadow-sm' : 'text-neutral-400 hover:text-white'}`}>🛠️ Mis Perfiles</button>
          </div>

          {activeTab !== 'CUSTOM' && (
            <div className="relative">
              <Search className="absolute left-4 top-3.5 text-neutral-400" size={20} />
              <input 
                type="text" 
                placeholder="Buscar por nombre común o científico..." 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)} 
                className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-emerald-500/50 focus:bg-white/5 transition-all" 
              />
            </div>
          )}
        </div>

        {/* BODY - SCROLLABLE */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {activeTab === 'CUSTOM' && (
            <div className="mb-6">
              {renderCustomBuilder()}
            </div>
          )}
          
          {filteredProfiles.length > 0 ? (
            <>
              {/* SPECIES GRID */}
              <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredProfiles.map((p) => (
                  <div key={p.id} className="relative group">
                    <button
                      onClick={() => handleSelectProfile(p.id, p.phases[0].id)}
                      className={`w-full p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
                        selectedProfileId === p.id 
                          ? 'bg-emerald-500/10 border-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/50' 
                          : 'bg-black/20 border-white/5 text-neutral-400 hover:border-white/20 hover:bg-white/5'
                      }`}
                    >
                      <div className="font-bold text-lg leading-tight pr-6">{p.commonName}</div>
                      <div className="text-xs italic opacity-70 mt-1">{p.scientificName}</div>
                      {activeTab === 'CUSTOM' && (
                        <div className="text-[10px] mt-2 text-purple-400 font-semibold uppercase tracking-wider">Perfil Personalizado</div>
                      )}
                    </button>
                    {/* Botón eliminar — solo visible en tab CUSTOM */}
                    {activeTab === 'CUSTOM' && customProfiles[p.id] && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteCustomProfile(p.id, p.commonName); }}
                        className="absolute top-2 right-2 p-1.5 text-neutral-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        title={`Eliminar perfil "${p.commonName}"`}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* ENCYCLOPEDIA */}
              {renderEncyclopedia()}

              {/* PHASES */}
              {profile && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-blue-400 border-b border-white/10 pb-2">2. Etapa Fenológica</h3>
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {profile.phases.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => handleSelectPhase(p.id)}
                        className={`px-4 py-2.5 rounded-lg border whitespace-nowrap transition-all text-sm ${
                          selectedPhaseId === p.id 
                            ? 'bg-blue-500/20 border-blue-500 text-white font-medium shadow-[0_0_10px_rgba(59,130,246,0.2)]' 
                            : 'bg-black/40 border-white/10 text-neutral-400 hover:border-white/30'
                        }`}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* TARGETS / SCADA */}
              {renderTargets()}
            </>
          ) : null}

        </div>

        {/* FOOTER */}
        <div className="p-6 border-t border-white/10 bg-black/40 flex-shrink-0 flex justify-end gap-4">
          <button 
            onClick={onClose}
            className="px-6 py-3 rounded-xl text-neutral-400 hover:text-white hover:bg-white/5 transition-colors font-medium"
          >
            Cerrar
          </button>
          <button 
            onClick={handleSaveInjection}
            disabled={isSaving || !phase || isEditing}
            title={isEditing ? 'Debes Guardar Edición antes de Inyectar' : 'Inyectar al ESP32'}
            className="flex items-center gap-2 px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <div className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full"></div>
            ) : (
              <Play fill="currentColor" size={20} />
            )}
            Inyectar Perfil al ESP32
          </button>
        </div>

      </div>
      
      {/* OVERLAY DE CREACIÓN DE NUEVA ESPECIE */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <div className="bg-[#1a1a1a] border border-emerald-500/30 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-2xl font-bold text-emerald-400 mb-6 flex items-center gap-3">
              <Plus size={24} /> Crear Nuevo Perfil
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-neutral-400 mb-1">Reino</label>
                <div className="flex gap-2">
                  <button onClick={() => setNewProfileKingdom('FUNGI')} className={`flex-1 py-2 rounded-lg font-bold transition-all ${newProfileKingdom === 'FUNGI' ? 'bg-emerald-500 text-white' : 'bg-white/5 text-neutral-400 hover:bg-white/10'}`}>🍄 Fungi</button>
                  <button onClick={() => setNewProfileKingdom('PLANTAE')} className={`flex-1 py-2 rounded-lg font-bold transition-all ${newProfileKingdom === 'PLANTAE' ? 'bg-emerald-500 text-white' : 'bg-white/5 text-neutral-400 hover:bg-white/10'}`}>🌿 Plantae</button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm text-neutral-400 mb-1">Nombre del Cultivo</label>
                <input 
                  type="text" 
                  value={newProfileName} 
                  onChange={e => setNewProfileName(e.target.value)} 
                  placeholder="Ej: Champiñón de París" 
                  className="w-full bg-black/50 border border-white/20 p-3 rounded-xl text-white focus:border-emerald-500 outline-none transition-colors"
                />
              </div>
              
              <div>
                <label className="block text-sm text-neutral-400 mb-1">Descripción</label>
                <textarea 
                  value={newProfileDesc} 
                  onChange={e => setNewProfileDesc(e.target.value)} 
                  placeholder="Breve descripción del cultivo..." 
                  className="w-full bg-black/50 border border-white/20 p-3 rounded-xl text-white focus:border-emerald-500 outline-none transition-colors h-24"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-8">
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 transition-colors">Cancelar</button>
              <button onClick={confirmCreateCustomProfile} className="px-6 py-2 bg-emerald-500 text-white rounded-lg font-bold hover:bg-emerald-600 transition-colors shadow-lg">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
