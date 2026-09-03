import React, { useEffect, useState } from 'react';
import { ref, onValue, update, remove } from 'firebase/database';
import { database } from '../config/firebase';
import { Users, Mail, Clock, Trash2, MessageSquare, X } from 'lucide-react';

interface Lead {
  id: string;
  name: string;
  email: string;
  cropType: string;
  message: string;
  createdAt: number;
  status: 'NUEVO' | 'CONTACTADO' | 'COTIZADO';
}

interface LeadsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LeadsModal: React.FC<LeadsModalProps> = ({ isOpen, onClose }) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    const leadsRef = ref(database, 'leads');
    const unsubscribe = onValue(leadsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const parsedLeads: Lead[] = Object.entries(data).map(([id, val]: [string, any]) => ({
          id,
          name: val.name || 'Sin Nombre',
          email: val.email || 'Sin Correo',
          cropType: val.cropType || 'custom',
          message: val.message || '',
          createdAt: val.createdAt || Date.now(),
          status: val.status || 'NUEVO'
        })).sort((a, b) => b.createdAt - a.createdAt);

        setLeads(parsedLeads);
      } else {
        setLeads([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleUpdateStatus = async (id: string, newStatus: Lead['status']) => {
    try {
      const leadRef = ref(database, `leads/${id}`);
      await update(leadRef, { status: newStatus });
    } catch (err) {
      console.error('Error actualizando estado del lead:', err);
    }
  };

  const handleDeleteLead = async (id: string) => {
    if (!window.confirm('¿Seguro que deseas eliminar esta solicitud?')) return;
    try {
      const leadRef = ref(database, `leads/${id}`);
      await remove(leadRef);
    } catch (err) {
      console.error('Error eliminando lead:', err);
    }
  };

  const cropLabel = (crop: string) => {
    switch (crop) {
      case 'fungi': return '🍄 Micología Comercial';
      case 'plantae': return '🌱 Horticultura Hidropónica';
      case 'cannabis': return '🌿 Cannabis Medicinal';
      default: return '⚙️ Proyecto a Medida';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl bg-[#0a0a0a] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <Users className="text-amber-400" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-white uppercase flex items-center gap-2">
                Prospectos & Solicitudes Comerciales
              </h2>
              <p className="text-xs text-neutral-500 font-mono">
                {leads.length} {leads.length === 1 ? 'solicitud recibida' : 'solicitudes recibidas'} desde la Landing Page
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Listado */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {loading ? (
            <div className="py-12 text-center text-xs font-mono text-neutral-500 uppercase tracking-widest">
              Cargando solicitudes...
            </div>
          ) : leads.length === 0 ? (
            <div className="py-16 text-center">
              <MessageSquare className="mx-auto text-neutral-700 mb-3" size={36} />
              <p className="text-sm font-bold text-neutral-400">No hay solicitudes comerciales registradas</p>
              <p className="text-xs text-neutral-600 font-mono mt-1">Los formularios enviados desde la Landing Page aparecerán aquí en tiempo real.</p>
            </div>
          ) : (
            leads.map((lead) => (
              <div 
                key={lead.id}
                className="bg-neutral-900/60 border border-white/5 hover:border-white/10 rounded-2xl p-5 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div>
                    <h3 className="font-bold text-white text-base flex items-center gap-2">
                      {lead.name}
                      <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full border bg-neutral-800 border-white/10 text-neutral-300">
                        {cropLabel(lead.cropType)}
                      </span>
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-neutral-400 mt-1">
                      <a href={`mailto:${lead.email}`} className="flex items-center gap-1 hover:text-emerald-400 transition-colors font-mono">
                        <Mail size={13} /> {lead.email}
                      </a>
                      <span className="flex items-center gap-1 text-neutral-500 font-mono text-[11px]">
                        <Clock size={12} /> {new Date(lead.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={lead.status}
                      onChange={(e) => handleUpdateStatus(lead.id, e.target.value as Lead['status'])}
                      className={`text-xs font-mono font-bold px-3 py-1.5 rounded-xl border focus:outline-none cursor-pointer ${
                        lead.status === 'NUEVO'
                          ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                          : lead.status === 'CONTACTADO'
                          ? 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                          : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                      }`}
                    >
                      <option value="NUEVO">NUEVO</option>
                      <option value="CONTACTADO">CONTACTADO</option>
                      <option value="COTIZADO">COTIZADO</option>
                    </select>

                    <button
                      onClick={() => handleDeleteLead(lead.id)}
                      className="p-2 rounded-xl text-neutral-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                      title="Eliminar solicitud"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <div className="bg-black/40 border border-white/5 rounded-xl p-3.5 text-xs text-neutral-300 font-mono whitespace-pre-wrap">
                  {lead.message}
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
};
