import React, { useEffect, useState } from 'react';
import { 
  Send, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  ShieldCheck, 
  Activity, 
  MessageCircle
} from 'lucide-react';
import { 
  getTelegramConfig, 
  saveTelegramConfig, 
  sendTestNotification
} from '../services/notificationService';
import type { TelegramConfig } from '../services/notificationService';

interface NotificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationSettingsModal: React.FC<NotificationSettingsModalProps> = ({ isOpen, onClose }) => {
  const [enabled, setEnabled] = useState(true);
  const [botToken, setBotToken] = useState('');
  const [chatIds, setChatIds] = useState<string[]>([]);
  const [newChatId, setNewChatId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message?: string } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    getTelegramConfig().then((cfg) => {
      setEnabled(cfg.enabled ?? true);
      setBotToken(cfg.botToken || '');
      setChatIds(cfg.chatIds || []);
      setLoading(false);
    });
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddChatId = () => {
    const clean = newChatId.trim();
    if (!clean) return;
    if (!chatIds.includes(clean)) {
      setChatIds([...chatIds, clean]);
    }
    setNewChatId('');
  };

  const handleRemoveChatId = (idx: number) => {
    setChatIds(chatIds.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setSaveSuccess(false);
      const config: TelegramConfig = {
        enabled,
        botToken: botToken.trim(),
        chatIds: chatIds.filter(id => id.trim().length > 0)
      };
      await saveTelegramConfig(config);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      console.error('Error guardando config de Telegram:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!botToken.trim() || chatIds.length === 0) {
      setTestResult({ success: false, message: 'Ingresa un Bot Token y al menos un Chat ID antes de probar.' });
      return;
    }

    try {
      setTesting(true);
      setTestResult(null);
      const res = await sendTestNotification(botToken.trim(), chatIds[0].trim());
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ success: false, message: err?.message || 'Error en prueba de envío' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
              <MessageCircle className="text-cyan-400" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-white uppercase flex items-center gap-2">
                Alertas Telegram & Notificaciones Push
              </h2>
              <p className="text-xs text-neutral-500 font-mono">
                Despacho en tiempo real a celulares de socios (P0 Crítico, P1 y Leads)
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto space-y-6 pr-1">
          {loading ? (
            <div className="py-12 text-center text-xs font-mono text-neutral-500 uppercase tracking-widest">
              Cargando configuración...
            </div>
          ) : (
            <>
              {/* Switch Activo/Inactivo */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-neutral-900/60 border border-white/5">
                <div>
                  <span className="font-bold text-sm text-white">Canal de Alertas Activo</span>
                  <p className="text-xs text-neutral-500 font-mono">Habilitar el despacho automático de eventos y prospectos</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEnabled(!enabled)}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${enabled ? 'bg-cyan-500' : 'bg-neutral-800'}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-black absolute top-0.5 transition-transform ${enabled ? 'left-6.5' : 'left-0.5'}`} />
                </button>
              </div>

              {/* Bot Token */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-neutral-400 mb-2">
                  Telegram Bot Token (@BotFather)
                </label>
                <input
                  type="password"
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                  placeholder="7123456789:AAHk... (Obtenido desde @BotFather)"
                  className="w-full bg-neutral-900/80 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono placeholder-neutral-600 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              {/* Lista de Chat IDs */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-neutral-400 mb-2">
                  Chat IDs Destinatarios (Socios / Grupos)
                </label>
                
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newChatId}
                    onChange={(e) => setNewChatId(e.target.value)}
                    placeholder="Ej: 123456789 (o -100xxx para grupo)"
                    className="flex-1 bg-neutral-900/80 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white font-mono placeholder-neutral-600 focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={handleAddChatId}
                    className="px-4 py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-bold text-xs uppercase font-mono border border-cyan-500/30 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus size={14} /> Añadir
                  </button>
                </div>

                {chatIds.length === 0 ? (
                  <p className="text-xs text-neutral-600 font-mono italic">No hay destinatarios registrados.</p>
                ) : (
                  <div className="space-y-2">
                    {chatIds.map((id, idx) => (
                      <div key={idx} className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-neutral-900/40 border border-white/5 text-xs font-mono text-neutral-300">
                        <span>Chat ID #{idx + 1}: <b>{id}</b></span>
                        <button
                          type="button"
                          onClick={() => handleRemoveChatId(idx)}
                          className="text-neutral-500 hover:text-red-400 transition-colors cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Guía Rápida */}
              <div className="p-4 rounded-2xl bg-black/40 border border-white/5 text-xs space-y-2 text-neutral-400 font-mono">
                <div className="flex items-center gap-2 font-bold text-neutral-300 uppercase tracking-wide">
                  <ShieldCheck size={14} className="text-emerald-400" /> Guía de Configuración en 1 Minuto:
                </div>
                <p>1. Abre Telegram y busca <b>@BotFather</b>. Escribe <code>/newbot</code> y dale un nombre (ej. <i>AgriEdgeAlertsBot</i>).</p>
                <p>2. Copia el <b>HTTP API Token</b> generado y pégalo arriba.</p>
                <p>3. Abre tu bot recién creado en Telegram y presiona <b>START</b>.</p>
                <p>4. Busca <b>@userinfobot</b> en Telegram para ver tu <b>Id</b> numérico y añádelo como Chat ID.</p>
              </div>

              {/* Feedback de Pruebas */}
              {testResult && (
                <div className={`p-4 rounded-2xl border flex items-center gap-3 text-xs font-mono ${
                  testResult.success 
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                    : 'bg-red-500/10 border-red-500/30 text-red-300'
                }`}>
                  {testResult.success ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                  <span>{testResult.success ? '¡Mensaje de prueba enviado con éxito a Telegram!' : testResult.message}</span>
                </div>
              )}

              {saveSuccess && (
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center gap-2">
                  <CheckCircle2 size={15} /> Configuración guardada exitosamente en Firebase RTDB.
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-white/10 pt-4 mt-6 flex flex-col sm:flex-row justify-between gap-3">
          <button
            type="button"
            onClick={handleTest}
            disabled={testing || !botToken || chatIds.length === 0}
            className="py-3 px-5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
          >
            {testing ? <Activity className="animate-spin" size={15} /> : <Send size={14} />}
            Probar Envío Telegram
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="py-3 px-5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-bold uppercase tracking-wider text-neutral-400 cursor-pointer"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="py-3 px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-black font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 shadow-[0_0_20px_rgba(6,182,212,0.3)]"
            >
              {saving ? <Activity className="animate-spin" size={15} /> : <CheckCircle2 size={15} />}
              Guardar Configuración
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
