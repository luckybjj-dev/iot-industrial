import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Sprout, ShieldAlert, Activity } from 'lucide-react';

export const Login: React.FC = () => {
  const { signInWithGoogle } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setError(null);
      setLoading(true);
      await signInWithGoogle();
    } catch (err: any) {
      console.error("🔥 Error completo de Firebase Auth:", err);
      console.error("Código:", err.code, "Mensaje:", err.message, "CustomData:", err.customData);
      setError(err.message || "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-neutral-200 font-sans selection:bg-emerald-500/30 p-4">
      {/* Decorative background grid */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5 pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-md bg-[#0a0a0a] border border-white/5 rounded-3xl p-8 shadow-2xl">
        <div className="text-center mb-10">
          <div className="mx-auto w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
            <Sprout size={32} className="text-emerald-400" />
          </div>
          <h1 className="text-3xl font-black mb-2 tracking-tighter uppercase text-white flex justify-center items-center gap-2">
            SCADA <span className="text-emerald-500">Node</span>
          </h1>
          <p className="text-neutral-500 text-xs font-mono tracking-widest uppercase">
            Acceso Restringido - Nivel Industrial
          </p>
        </div>

        {error && (
          <div className="bg-red-950/50 border border-red-500/50 text-red-400 px-4 py-3 rounded-xl mb-6 flex items-center gap-3 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
            <ShieldAlert size={20} className="flex-shrink-0" />
            <span className="text-xs font-bold tracking-wide uppercase">{error}</span>
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl text-sm font-black tracking-widest uppercase transition-all duration-300 shadow-xl bg-white text-black hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Activity className="animate-spin" size={20} />
          ) : (
            <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          )}
          Entrar con Google
        </button>

        <div className="mt-8 text-center border-t border-white/5 pt-6">
          <p className="text-neutral-600 text-[10px] font-mono tracking-widest uppercase">
            Sistema HMI/SCADA de Ambiente Controlado
            <br />
            Solo personal autorizado
          </p>
        </div>
      </div>
    </div>
  );
};
