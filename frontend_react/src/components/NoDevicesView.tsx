import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Sprout, PlusCircle, CheckCircle2, ShieldAlert, Activity, LogOut, KeyRound, Radio } from 'lucide-react';

export const NoDevicesView: React.FC = () => {
  const { user, claimDevice, logout } = useAuth();
  const [deviceId, setDeviceId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!deviceId.trim()) {
      setError('Por favor ingresa el ID del nodo ESP32 o código de activación.');
      return;
    }

    try {
      setLoading(true);
      await claimDevice(deviceId);
      setSuccessMsg(`¡Nodo ${deviceId.toUpperCase()} vinculado exitosamente a tu cuenta!`);
      setDeviceId('');
    } catch (err: any) {
      setError(err.message || 'Error al vincular el dispositivo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-neutral-200 font-sans selection:bg-emerald-500/30 p-4">
      {/* Background Decor */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.15),rgba(255,255,255,0))] pointer-events-none z-0"></div>
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5 pointer-events-none z-0"></div>

      <div className="relative z-10 w-full max-w-lg bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-6 border-b border-white/5 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.15)]">
              <Sprout size={22} className="text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight uppercase text-white">
                AgriEdge <span className="text-emerald-400">OS</span>
              </h2>
              <p className="text-[10px] font-mono text-neutral-500 uppercase">
                Portal de Operadores
              </p>
            </div>
          </div>

          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-neutral-400 hover:text-white transition-colors text-xs font-mono uppercase bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 cursor-pointer"
          >
            <LogOut size={14} /> Salir
          </button>
        </div>

        {/* User Greeting */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[11px] font-mono uppercase mb-4">
            <Radio size={12} className="animate-pulse" /> Cuenta Activa: {user?.email}
          </div>

          <h3 className="text-2xl font-black text-white uppercase tracking-tight">
            Esperando Asignación de Nodos
          </h3>
          <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
            Tu cuenta no tiene cámaras de cultivo ni dispositivos vinculados actualmente. Si compraste un kit o tienes un código de nodo, ingrésalo a continuación.
          </p>
        </div>

        {/* Feedback Messages */}
        {error && (
          <div className="bg-red-950/40 border border-red-500/50 text-red-300 px-4 py-3 rounded-xl mb-4 flex items-center gap-3 text-xs">
            <ShieldAlert size={18} className="flex-shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-950/40 border border-emerald-500/50 text-emerald-300 px-4 py-3 rounded-xl mb-4 flex items-center gap-3 text-xs">
            <CheckCircle2 size={18} className="flex-shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Claim Device Form */}
        <form onSubmit={handleClaim} className="space-y-4">
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-400 mb-1.5">
              ID del Dispositivo o Código de Activación
            </label>
            <div className="relative">
              <KeyRound size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                type="text"
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                placeholder="ESP32_7C9EBD618F54"
                className="w-full bg-neutral-900/90 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500 transition-colors uppercase font-mono"
              />
            </div>
            <p className="text-[10px] font-mono text-neutral-500 mt-1">
              * El ID se encuentra impreso en la etiqueta de tu nodo o en la pantalla TFT al arrancar.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black font-black text-xs uppercase tracking-widest transition-all duration-300 shadow-[0_0_20px_rgba(16,185,129,0.2)] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <Activity className="animate-spin" size={16} />
            ) : (
              <>
                <PlusCircle size={16} /> Vincular Cámara a mi Cuenta
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-white/5 pt-6">
          <p className="text-neutral-500 text-[11px] font-light">
            ¿Necesitas ayuda o requieres soporte comercial? <br />
            <a href="mailto:soporte@agriedge.io" className="text-emerald-400 font-mono hover:underline">
              soporte@agriedge.io
            </a>
          </p>
        </div>

      </div>
    </div>
  );
};
