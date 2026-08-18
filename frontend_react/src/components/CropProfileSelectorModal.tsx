import React, { useState, useEffect, useRef } from 'react';
import { X, Sprout, Play, Search, BookOpen, Edit3, Save, Plus, Trash2, AlertTriangle, CheckCircle2, Zap } from 'lucide-react';
import type { DeviceCropProfile } from '../types/cultivo';
import { CROP_PROFILES, generateDeviceProfile, getCustomProfiles, validateThermodynamics } from '../data/CropProfiles';
import type { CropProfile, PhaseTargets } from '../data/CropProfiles';


interface CropProfileSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (deviceProfile: DeviceCropProfile, profileName?: string, phaseName?: string, planState?: any) => Promise<void>;
  deviceId?: string; // Para mostrar el nombre de la cámara
  activeProfileName?: string;
  activePhaseName?: string;
}

type TabType = 'FUNGI' | 'PLANTAE' | 'CUSTOM';

export const CropProfileSelectorModal: React.FC<CropProfileSelectorModalProps> = ({ 
  deviceId, 
  isOpen, 
  onClose, 
  onSave,
  activeProfileName,
  activePhaseName
}) => {
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
  const [editDuration, setEditDuration] = useState<number>(14);
  const [editTransition, setEditTransition] = useState<number>(48);
  const [editProfileName, setEditProfileName] = useState<string>('');
  const [editProfileDesc, setEditProfileDesc] = useState<string>('');
  
  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileDesc, setNewProfileDesc] = useState('');
  const [newProfileKingdom, setNewProfileKingdom] = useState<'FUNGI' | 'PLANTAE'>('FUNGI');

  const dialogRef = useRef<HTMLDialogElement>(null);
  const createModalRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  useEffect(() => {
    const dialog = createModalRef.current;
    if (!dialog) return;

    if (showCreateModal && !dialog.open) {
      dialog.showModal();
    } else if (!showCreateModal && dialog.open) {
      dialog.close();
    }
  }, [showCreateModal]);

  useEffect(() => {
    setCustomProfiles(getCustomProfiles());
  }, []);

  const ALL_PROFILES = { ...CROP_PROFILES, ...customProfiles };
  const profile = ALL_PROFILES[selectedProfileId];
  const phase = profile?.phases.find(p => p.id === selectedPhaseId);

  // Perfil actualmente activo en ejecución en el hardware
  const activeProfileObj = React.useMemo(() => {
    if (!activeProfileName) return null;
    const all = { ...CROP_PROFILES, ...customProfiles };
    return Object.values(all).find(p => 
      p.commonName.toLowerCase() === activeProfileName.toLowerCase() ||
      p.scientificName.toLowerCase() === activeProfileName.toLowerCase() ||
      p.id === activeProfileName
    ) || null;
  }, [activeProfileName, customProfiles]);

  // Auto-seleccionar el perfil y fase activos al abrir el modal
  useEffect(() => {
    if (isOpen && activeProfileObj) {
      setSelectedProfileId(activeProfileObj.id);
      const tab = customProfiles[activeProfileObj.id] ? 'CUSTOM' : activeProfileObj.kingdom;
      setActiveTab(tab);

      if (activePhaseName) {
        const matchedPhase = activeProfileObj.phases.find(ph => 
          ph.name.toLowerCase() === activePhaseName.toLowerCase() ||
          ph.id === activePhaseName
        );
        if (matchedPhase) {
          setSelectedPhaseId(matchedPhase.id);
        } else if (activeProfileObj.phases[0]) {
          setSelectedPhaseId(activeProfileObj.phases[0].id);
        }
      } else if (activeProfileObj.phases[0]) {
        setSelectedPhaseId(activeProfileObj.phases[0].id);
      }
      setIsEditing(false);
      setEditedTargets(null);
    }
  }, [isOpen, activeProfileObj, activePhaseName]);

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

  const handleSelectPhase = (nextPhaseId: string) => {
    if (isEditing) {
      if (!phase || !profile) return;
      
      // Auto-guardar la fase actual antes de cambiar de pestaa
      const finalPhase = { 
          ...phase, 
          targets: editedTargets || phase.targets, 
          duration_days: editDuration, 
          transition_hours: editTransition 
      };
      
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

      const nextPhaseRaw = updatedProfile.phases.find(p => p.id === nextPhaseId) || updatedProfile.phases[0];

      if (!profile.id.startsWith('custom_')) {
         setSelectedProfileId(customId);
      }
      setSelectedPhaseId(nextPhaseId);
      
      // Cargar inputs con la nueva fase
      setEditedTargets(JSON.parse(JSON.stringify(nextPhaseRaw.targets)));
      const parts = (nextPhaseRaw.targets.lighting?.photoperiod || '12/12').split('/');
      const parseH = (v: string) => isNaN(parseInt(v)) ? 12 : parseInt(v);
      setEditLightHours(parseH(parts[0]));
      setEditDarkHours(parseH(parts[1]));
      setEditDuration(nextPhaseRaw.duration_days || 14);
      setEditTransition(nextPhaseRaw.transition_hours || 48);

      return;
    }

    setSelectedPhaseId(nextPhaseId);
    setIsEditing(false);
    setEditedTargets(null);
  };

  const handleResetCurrentPhase = () => {
    if (!phase) return;
    setEditedTargets(JSON.parse(JSON.stringify(phase.targets)));
    setEditDuration(phase.duration_days || 14);
    setEditTransition(phase.transition_hours || 48);
    const parts = (phase.targets.lighting?.photoperiod || '12/12').split('/');
    const parseH = (v: string) => isNaN(parseInt(v)) ? 12 : parseInt(v);
    setEditLightHours(parseH(parts[0]));
    setEditDarkHours(parseH(parts[1]));
  };

  const startEditing = () => {
    if (phase && profile) {
      setEditedTargets(JSON.parse(JSON.stringify(phase.targets)));
      // Parsear el fotoperiodo "12/12" en dos valores numéricos separados
      const parts = (phase.targets.lighting?.photoperiod || '12/12').split('/');
      const parseH = (v: string) => isNaN(parseInt(v)) ? 12 : parseInt(v);
      setEditLightHours(parseH(parts[0]));
      setEditDarkHours(parseH(parts[1]));
      setEditDuration(phase.duration_days || 14);
      setEditTransition(phase.transition_hours || 48);
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
        temperature: { day: { min: 20, max: 25 }, night: { min: 20, max: 25 } },
        humidity: { min: 70, max: 80 },
        vpd: { min: 0.5, max: 0.8 },
        co2: { min: 4000, max: 10000 },
        fae: { ach: { min: 0, max: 1 } },
        lighting: { photoperiod: '0/24' }
      },
      induccion: {
        temperature: { day: { min: 10, max: 15 }, night: { min: 10, max: 15 } },
        humidity: { min: 90, max: 95 },
        vpd: { min: 0.1, max: 0.3 },
        co2: { min: 400, max: 1000 },
        fae: { ach: { min: 4, max: 8 } },
        lighting: { photoperiod: '12/12' }
      },
      fructificacion: {
        temperature: { day: { min: 15, max: 20 }, night: { min: 15, max: 20 } },
        humidity: { min: 80, max: 90 },
        vpd: { min: 0.3, max: 0.6 },
        co2: { min: 400, max: 1000 },
        fae: { ach: { min: 4, max: 8 } },
        lighting: { photoperiod: '12/12' }
      },
      descanso: {
        temperature: { day: { min: 15, max: 20 }, night: { min: 15, max: 20 } },
        humidity: { min: 85, max: 90 },
        vpd: { min: 0.2, max: 0.5 },
        co2: { min: 1000, max: 3000 },
        fae: { ach: { min: 1, max: 2 } },
        lighting: { photoperiod: '0/24' }
      }
    };

    const plantaeTargets = {
      germinacion: {
        temperature: { day: { min: 20, max: 25 }, night: { min: 20, max: 25 } },
        humidity: { min: 65, max: 80 },
        vpd: { min: 0.4, max: 0.8 },
        co2: { min: 400, max: 400 },
        fae: { ach: { min: 1, max: 2 } },
        lighting: { photoperiod: '18/6' }
      },
      vegetativo: {
        temperature: { day: { min: 22, max: 29 }, night: { min: 18, max: 24 } },
        humidity: { min: 50, max: 65 },
        vpd: { min: 0.8, max: 1.1 },
        co2: { min: 800, max: 1200 },
        fae: { ach: { min: 2, max: 6 } },
        lighting: { photoperiod: '18/6' }
      },
      floracion: {
        temperature: { day: { min: 18, max: 26 }, night: { min: 16, max: 22 } },
        humidity: { min: 40, max: 50 },
        vpd: { min: 1.0, max: 1.5 },
        co2: { min: 1000, max: 1500 },
        fae: { ach: { min: 4, max: 8 } },
        lighting: { photoperiod: '12/12' }
      },
      maduracion: {
        temperature: { day: { min: 16, max: 22 }, night: { min: 15, max: 20 } },
        humidity: { min: 30, max: 45 },
        vpd: { min: 1.2, max: 1.6 },
        co2: { min: 400, max: 800 },
        fae: { ach: { min: 2, max: 6 } },
        lighting: { photoperiod: '12/12' }
      }
    };

    const phases = newProfileKingdom === 'FUNGI' 
      ? [
          { id: 'fase1', name: '1. Incubación / Colonización', stageTips: 'Oscuridad total. Alto CO2 favorece el crecimiento vegetativo.', targets: JSON.parse(JSON.stringify(fungiTargets.incubacion)) },
          { id: 'fase2', name: '2. Inducción (Pinning)', stageTips: 'Shock térmico y lumínico. Ventilación agresiva para bajar el CO2.', targets: JSON.parse(JSON.stringify(fungiTargets.induccion)) },
          { id: 'fase3', name: '3. Fructificación', stageTips: 'Mantener humedad alta pero sin condensación en los cuerpos.', targets: JSON.parse(JSON.stringify(fungiTargets.fructificacion)) },
          { id: 'fase4', name: '4. Descanso / Re-flush', stageTips: 'Preparación para el siguiente ciclo reproductivo.', targets: JSON.parse(JSON.stringify(fungiTargets.descanso)) }
        ]
      : [
          { id: 'fase1', name: '1. Germinación / Esquejes', stageTips: 'VPD bajo (alta humedad) para favorecer raíces tiernas.', targets: JSON.parse(JSON.stringify(plantaeTargets.germinacion)) },
          { id: 'fase2', name: '2. Crecimiento Vegetativo', stageTips: 'VPD medio, alta luz para promover hojas y estructura.', targets: JSON.parse(JSON.stringify(plantaeTargets.vegetativo)) },
          { id: 'fase3', name: '3. Floración', stageTips: 'VPD alto (humedad baja) estricto para evitar moho en flores. CO2 al máximo.', targets: JSON.parse(JSON.stringify(plantaeTargets.floracion)) },
          { id: 'fase4', name: '4. Maduración / Lavado', stageTips: 'Temperaturas nocturnas bajas para simular otoño. Suspender fertilizantes.', targets: JSON.parse(JSON.stringify(plantaeTargets.maduracion)) }
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
      setEditDuration(newProfile.phases[0].duration_days || 14);
      setEditTransition(newProfile.phases[0].transition_hours || 48);
      setEditProfileName(newProfile.commonName);
      setEditProfileDesc(newProfile.description);
      setIsEditing(true);
    }, 100);
  };

  const handleSaveEditsOnly = () => {
    if (!phase || !profile) return;

    const targetsToCheck = editedTargets || phase.targets;
    const thermoCheck = validateThermodynamics(targetsToCheck, profile.kingdom);
    if (!thermoCheck.isValid) {
      alert(`Error de Validación SCADA:\n\n${thermoCheck.message}`);
      return;
    }
    
    const finalPhase = { 
        ...phase, 
        targets: editedTargets || phase.targets, 
        duration_days: editDuration, 
        transition_hours: editTransition 
    };
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
    if (!phase || !profile) return;
    
    const targetsToCheck = editedTargets || phase.targets;
    const thermoCheck = validateThermodynamics(targetsToCheck, profile.kingdom);
    if (!thermoCheck.isValid) {
      alert(`Error de Validación SCADA:\n\n${thermoCheck.message}`);
      return;
    }

    setIsSaving(true);
    try {
      // Usar targets editados si existen, sino los originales
      const finalPhase = { 
        ...phase, 
        targets: editedTargets || phase.targets, 
        duration_days: isEditing ? editDuration : (phase.duration_days || 14), 
        transition_hours: isEditing ? editTransition : (phase.transition_hours || 48) 
      };
      
      let finalProfileName = profile.commonName || 'Desconocido';

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
      
      const currentPhaseIndex = profile.phases.findIndex(p => p.id === phase.id);
      const nextPhaseRaw = profile.phases[currentPhaseIndex + 1];
      const nextPhaseConfig = nextPhaseRaw ? generateDeviceProfile({ ...nextPhaseRaw, duration_days: nextPhaseRaw.duration_days || 14, transition_hours: nextPhaseRaw.transition_hours || 48 }) : null;

      const planState = {
        phaseStartTime: Date.now(),
        duration_days: finalPhase.duration_days,
        transition_hours: finalPhase.transition_hours,
        currentPhaseConfig: deviceProfile,
        nextPhaseConfig: nextPhaseConfig
      };

      // 2. Mantener la llamada estática por compatibilidad y enviar el planState
      await onSave(deviceProfile, finalProfileName, finalPhase.name, planState);
      
      setIsSaving(false);
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
                {!isEditing && (
                  <button onClick={startEditing} className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 bg-blue-500/10 px-3 py-1.5 rounded-lg transition-colors">
                    <Edit3 size={16} /> Editar Perfil Completo
                  </button>
                )}
                {isEditing && (
                  <div className="flex items-center gap-2">
                    <button onClick={() => setIsEditing(false)} className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white bg-white/5 px-3 py-1.5 rounded-lg transition-colors">
                      Cancelar
                    </button>
                    <button onClick={handleResetCurrentPhase} className="flex items-center gap-2 text-sm text-orange-400 hover:text-orange-300 bg-orange-500/10 px-3 py-1.5 rounded-lg transition-colors" title="Restablecer a valores iniciales">
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
              <p className="text-sm text-neutral-300 mb-2">{isEditing ? editProfileDesc : profile.description}</p>
              <div className="text-xs text-neutral-400 flex gap-4">
                <span>Especie: <strong className="text-white">{isEditing ? editProfileName : profile.commonName}</strong> ({profile.scientificName})</span>
                <span>Fases: <strong className="text-white">{profile.phases.length} etapas</strong></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTargets = () => {
    if (!phase) return null;
    const t = isEditing && editedTargets ? editedTargets : phase.targets;
    const thermoValidation = validateThermodynamics(t, profile.kingdom);

    const handleAutoCalculateSubstrate = () => {
      if (!t) return;
      const ambMin = t.temperature.day.min;
      const ambMax = t.temperature.day.max;
      setEditedTargets({
        ...t,
        temperature: {
          ...t.temperature,
          substrate: {
            min: ambMin + 1,
            max: ambMax + 3
          }
        }
      });
    };

    const renderField = (label: string, valueStr: string, editElement: React.ReactNode) => (
      <div className="bg-white/5 border border-white/10 p-4 rounded-xl relative group">
        <div className="text-sm text-neutral-400 mb-1">{label}</div>
        {isEditing ? editElement : <div className="text-xl font-bold text-white">{valueStr}</div>}
      </div>
    );

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center border-b border-white/10 pb-2">
          <h3 className="text-lg font-semibold text-purple-400">3. Configuración de Fase</h3>
          <div className="text-sm text-neutral-400 italic">
            {!isEditing ? 'Haz clic en "Editar Perfil Completo" arriba para modificar.' : 'Edita los valores SCADA a continuación.'}
          </div>
        </div>

        {/* Banner de Validación Termodinámica */}
        {profile.kingdom === 'FUNGI' && (
          <div className={`p-3.5 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs transition-all ${
            !thermoValidation.isValid
              ? 'bg-red-500/10 border-red-500/30 text-red-300'
              : thermoValidation.isWarning
              ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
          }`}>
            <div className="flex items-center gap-2.5 font-medium">
              {!thermoValidation.isValid ? (
                <AlertTriangle className="text-red-400 flex-shrink-0" size={18} />
              ) : thermoValidation.isWarning ? (
                <AlertTriangle className="text-yellow-400 flex-shrink-0" size={18} />
              ) : (
                <CheckCircle2 className="text-emerald-400 flex-shrink-0" size={18} />
              )}
              <span>
                {!thermoValidation.isValid
                  ? thermoValidation.message
                  : thermoValidation.isWarning
                  ? thermoValidation.message
                  : 'Coherencia Termodinámica SCADA: Óptima (Sustrato compatible con termogénesis del micelio +2°C a +4°C).'}
              </span>
            </div>

            {isEditing && (!thermoValidation.isValid || thermoValidation.isWarning || !t.temperature.substrate) && (
              <button
                type="button"
                onClick={handleAutoCalculateSubstrate}
                className="flex items-center gap-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 px-3 py-1.5 rounded-lg font-bold transition-colors w-fit flex-shrink-0 cursor-pointer shadow-sm"
              >
                <Zap size={14} /> Auto-Calcular Sustrato (+2°C metabólico)
              </button>
            )}
          </div>
        )}
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Temperatura */}
          {renderField('Temperatura Día (°C)', `${t.temperature.day.min}° - ${t.temperature.day.max}°`, 
            <div className="flex gap-2 items-center">
              <input type="number" value={t.temperature.day.min} onChange={e => setEditedTargets({...t, temperature: {...t.temperature, day: {...t.temperature.day, min: Number(e.target.value)}}})} className="w-16 bg-black text-white p-1 rounded border border-white/20 text-center" />
              <span>-</span>
              <input type="number" value={t.temperature.day.max} onChange={e => setEditedTargets({...t, temperature: {...t.temperature, day: {...t.temperature.day, max: Number(e.target.value)}}})} className="w-16 bg-black text-white p-1 rounded border border-white/20 text-center" />
            </div>
          )}

          {/* Temp Sustrato */}
          {renderField('Temp. Sustrato (°C)', t.temperature.substrate ? `${t.temperature.substrate.min}° - ${t.temperature.substrate.max}°` : 'Auto (Derivada)', 
            <div className="flex gap-2 items-center">
              <input type="number" value={t.temperature.substrate?.min || ''} placeholder="Mín" onChange={e => setEditedTargets({...t, temperature: {...t.temperature, substrate: {...(t.temperature.substrate || {max: t.temperature.day.max + 3}), min: Number(e.target.value)}}})} className="w-16 bg-black text-white p-1 rounded border border-white/20 text-center text-sm" />
              <span>-</span>
              <input type="number" value={t.temperature.substrate?.max || ''} placeholder="Máx" onChange={e => setEditedTargets({...t, temperature: {...t.temperature, substrate: {...(t.temperature.substrate || {min: t.temperature.day.min + 1}), max: Number(e.target.value)}}})} className="w-16 bg-black text-white p-1 rounded border border-white/20 text-center text-sm" />
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
                {editLightHours + editDarkHours === 24 ? ' ✓' : ` ⚠️ (faltan ${24 - editLightHours - editDarkHours}h)`}
              </div>
            </div>
          )}

          {/* Duración (Días) */}
          {renderField('Duración Fase (Días)', `${phase.duration_days || 14} días`, 
            <div className="flex gap-2 items-center">
              <input type="number" min={1} value={editDuration} onChange={e => setEditDuration(Math.max(1, Number(e.target.value)))} className="w-16 bg-black text-white p-1 rounded border border-white/20 text-center" />
              <span className="text-neutral-400 text-xs">días</span>
            </div>
          )}

          {/* Transición (Horas) */}
          {renderField('Transición Suave (Hrs)', `${phase.transition_hours || 48} horas`, 
            <div className="flex gap-2 items-center">
              <input type="number" min={0} value={editTransition} onChange={e => setEditTransition(Math.max(0, Number(e.target.value)))} className="w-16 bg-black text-white p-1 rounded border border-white/20 text-center" />
              <span className="text-neutral-400 text-xs">horas</span>
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
    <dialog
      ref={dialogRef}
      onCancel={onClose}
      className="bg-[#121212] border border-white/10 rounded-2xl w-full max-w-[95vw] shadow-2xl m-auto p-0 overflow-hidden"
    >
      <div className="flex flex-col max-h-[90vh] overflow-hidden">
        
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
          
          {/* HERO BANNER: PERFIL EN EJECUCIÓN (ACCESO RÁPIDO O(1)) */}
          {activeProfileObj && (
            <div className="p-4 rounded-xl border border-emerald-500/40 bg-gradient-to-r from-emerald-950/40 via-emerald-900/20 to-black/40 shadow-[0_0_25px_rgba(16,185,129,0.15)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                  <Zap size={24} className="animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500 text-black shadow-sm flex items-center gap-1">
                      🟢 EN EJECUCIÓN EN ESTA CÁMARA
                    </span>
                    {activePhaseName && (
                      <span className="text-xs text-neutral-300 font-semibold">• Fase: {activePhaseName}</span>
                    )}
                  </div>
                  <div className="text-lg font-bold text-white mt-1 flex items-center gap-2">
                    {activeProfileObj.commonName}
                    <span className="text-xs text-neutral-400 font-normal italic">({activeProfileObj.scientificName})</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    const tab = customProfiles[activeProfileObj.id] ? 'CUSTOM' : activeProfileObj.kingdom;
                    setActiveTab(tab);
                    const targetPhaseId = (activePhaseName && activeProfileObj.phases.find(ph => ph.name.toLowerCase() === activePhaseName.toLowerCase() || ph.id === activePhaseName)?.id) || activeProfileObj.phases[0].id;
                    handleSelectProfile(activeProfileObj.id, targetPhaseId);
                    setIsEditing(true);
                  }}
                  className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
                >
                  <Edit3 size={15} /> Modificar Receta Activa
                </button>
              </div>
            </div>
          )}

          {activeTab === 'CUSTOM' && (
            <div className="mb-6">
              {renderCustomBuilder()}
            </div>
          )}
          
          {filteredProfiles.length > 0 ? (
            <>
              {/* SPECIES GRID */}
              <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredProfiles.map((p) => {
                  const isActiveRunning = activeProfileObj && p.id === activeProfileObj.id;
                  return (
                    <div key={p.id} className="relative group">
                      <button
                        onClick={() => handleSelectProfile(p.id, p.phases[0].id)}
                        className={`w-full p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
                          selectedProfileId === p.id 
                            ? 'bg-emerald-500/10 border-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/50' 
                            : isActiveRunning
                              ? 'bg-emerald-950/20 border-emerald-500/50 text-emerald-200 shadow-[0_0_10px_rgba(16,185,129,0.1)] hover:border-emerald-400'
                              : 'bg-black/20 border-white/5 text-neutral-400 hover:border-white/20 hover:bg-white/5'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="font-bold text-lg leading-tight">{p.commonName}</div>
                          {isActiveRunning && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500 text-black shadow-sm flex items-center gap-1 flex-shrink-0">
                              🟢 ACTIVO
                            </span>
                          )}
                        </div>
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
                  );
                })}
              </div>

              {/* ENCYCLOPEDIA */}
              {renderEncyclopedia()}

              {/* PHASES */}
              {profile && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-blue-400 border-b border-white/10 pb-2">2. Etapa Fenológica</h3>
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {profile.phases.map((p) => {
                      const isSelected = selectedPhaseId === p.id;
                      return (
                        <button
                          key={p.id}
                          onClick={() => handleSelectPhase(p.id)}
                          className={`px-4 py-2.5 rounded-lg border whitespace-nowrap transition-all text-sm ${
                            isSelected 
                              ? 'bg-blue-500/20 border-blue-500 text-white font-medium shadow-[0_0_10px_rgba(59,130,246,0.2)]' 
                              : 'bg-black/40 border-white/10 text-neutral-400 hover:border-white/30'
                          }`}
                        >
                          {p.name}
                        </button>
                      );
                    })}
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
      <dialog
        ref={createModalRef}
        onCancel={() => setShowCreateModal(false)}
        className="bg-[#1a1a1a] border border-emerald-500/30 rounded-2xl m-auto p-0 w-full max-w-md shadow-2xl overflow-hidden"
      >
        <div className="p-6">
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
      </dialog>
    </dialog>
  );
};
