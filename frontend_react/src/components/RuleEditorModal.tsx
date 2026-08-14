import React, { useState, useEffect, useRef } from 'react';
// Componente legacy — tipo 'any' para compatibilidad sin refactorizar
type ReglaTermodinamica = any;
import { X, Plus, Trash2, Save } from 'lucide-react';

interface Props {
  deviceId: string;
  isOpen: boolean;
  onClose: () => void;
  currentRules: ReglaTermodinamica[];
  onSave: (rules: ReglaTermodinamica[]) => Promise<void>;
}

export const RuleEditorModal: React.FC<Props> = ({ deviceId, isOpen, onClose, currentRules, onSave }) => {
  const [rules, setRules] = useState<ReglaTermodinamica[]>(currentRules || []);
  const [isSaving, setIsSaving] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  const handleAddRule = () => {
    if (rules.length >= 20) {
      alert('Máximo de 20 reglas permitidas.');
      return;
    }
    setRules([...rules, { var: 'TEMP', op: 'MAYOR_QUE', val: 25, act: 'EXTRACTOR', estado: 'ENCENDIDO' }]);
  };

  const handleRemoveRule = (index: number) => {
    const newRules = [...rules];
    newRules.splice(index, 1);
    setRules(newRules);
  };

  const handleUpdateRule = (index: number, field: keyof ReglaTermodinamica, value: string | number) => {
    const newRules = [...rules];
    newRules[index] = {
      ...newRules[index],
      [field]: value
    };
    setRules(newRules);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(rules);
      onClose();
    } catch (e) {
      alert('Error guardando reglas');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onCancel={onClose}
      className="bg-[#121212] border border-white/10 rounded-2xl w-full max-w-4xl shadow-2xl m-auto p-0 overflow-hidden"
    >
      <div className="flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-6 border-b border-white/10">
          <div>
            <h2 className="text-2xl font-bold text-white">Motor de Reglas (Rule Engine)</h2>
            <p className="text-sm text-neutral-400">Nodo: {deviceId} | Máx: 20 reglas</p>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-white p-2">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {rules.length === 0 ? (
            <div className="text-center py-12 text-neutral-500">
              No hay reglas definidas. El sistema operará sin automatización.
            </div>
          ) : (
            rules.map((regla, idx) => (
              <div key={idx} className="flex flex-col md:flex-row items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/10">
                <div className="flex items-center gap-2 text-neutral-400 font-mono text-sm w-full md:w-auto">
                  <span className="bg-black/50 px-2 py-1 rounded">#{idx + 1}</span>
                  <span className="text-blue-400">SI</span>
                </div>
                
                <select 
                  value={regla.var} 
                  onChange={(e) => handleUpdateRule(idx, 'var', e.target.value)}
                  className="bg-black/40 border border-white/10 rounded-lg p-2 text-white outline-none focus:border-emerald-500 w-full md:w-auto"
                >
                  <option value="TEMP">TEMPERATURA</option>
                  <option value="HUMEDAD">HUMEDAD</option>
                  <option value="CO2">CO2</option>
                  <option value="VPD">VPD</option>
                  <option value="HORA_DEL_DIA">HORA DEL DÍA (0-23)</option>
                </select>

                <select 
                  value={regla.op} 
                  onChange={(e) => handleUpdateRule(idx, 'op', e.target.value)}
                  className="bg-black/40 border border-white/10 rounded-lg p-2 text-amber-400 outline-none focus:border-emerald-500 w-full md:w-auto"
                >
                  <option value="MAYOR_QUE">&gt; MAYOR A</option>
                  <option value="MENOR_QUE">&lt; MENOR A</option>
                  <option value="IGUAL">== IGUAL A</option>
                </select>

                <input 
                  type="number" 
                  value={regla.val}
                  onChange={(e) => handleUpdateRule(idx, 'val', parseFloat(e.target.value) || 0)}
                  className="bg-black/40 border border-white/10 rounded-lg p-2 text-white w-full md:w-24 outline-none focus:border-emerald-500 text-center"
                />

                <span className="text-blue-400 font-mono text-sm hidden md:block">ENTONCES</span>

                <select 
                  value={regla.estado} 
                  onChange={(e) => handleUpdateRule(idx, 'estado', e.target.value)}
                  className={`bg-black/40 border border-white/10 rounded-lg p-2 outline-none focus:border-emerald-500 font-bold w-full md:w-auto ${regla.estado === 'ENCENDIDO' ? 'text-emerald-400' : 'text-neutral-500'}`}
                >
                  <option value="ENCENDIDO">ENCENDER</option>
                  <option value="APAGADO">APAGAR</option>
                </select>

                <select 
                  value={regla.act} 
                  onChange={(e) => handleUpdateRule(idx, 'act', e.target.value)}
                  className="bg-black/40 border border-white/10 rounded-lg p-2 text-white outline-none focus:border-emerald-500 w-full md:w-auto"
                >
                  <option value="CALEFACTOR">CALEFACTOR</option>
                  <option value="EXTRACTOR">EXTRACTOR</option>
                  <option value="NIEBLA">NIEBLA</option>
                  <option value="LUZ">LUZ</option>
                </select>

                <button 
                  onClick={() => handleRemoveRule(idx)}
                  className="ml-auto text-neutral-500 hover:text-red-400 p-2 transition-colors w-full md:w-auto flex justify-center"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="p-6 border-t border-white/10 flex justify-between items-center bg-black/20 rounded-b-2xl">
          <button 
            onClick={handleAddRule}
            disabled={rules.length >= 20}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white transition-colors disabled:opacity-50"
          >
            <Plus size={20} />
            Nueva Regla
          </button>

          <div className="flex gap-4">
            <button 
              onClick={onClose}
              className="px-6 py-2 rounded-lg text-neutral-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
            >
              {isSaving ? <div className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full"></div> : <Save size={20} />}
              Guardar en ESP32
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
};
