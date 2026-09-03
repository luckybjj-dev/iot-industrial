import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Sprout, ShieldAlert, Activity, Mail, Lock, CheckCircle2, ArrowLeft, KeyRound, UserPlus, LogIn } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
  initialMode?: 'login' | 'register' | 'recovery';
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialMode = 'login' }) => {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, resetPassword } = useAuth();
  
  const [mode, setMode] = useState<'login' | 'register' | 'recovery'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const mapAuthError = (err: any): string => {
    const code = err.code || '';
    switch (code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return 'Credenciales inválidas. Verifica tu correo y contraseña.';
      case 'auth/email-already-in-use':
        return 'Este correo ya se encuentra registrado. Inicia sesión.';
      case 'auth/weak-password':
        return 'La contraseña debe tener al menos 6 caracteres.';
      case 'auth/invalid-email':
        return 'El formato del correo electrónico no es válido.';
      case 'auth/too-many-requests':
        return 'Demasiados intentos fallidos. Intenta de nuevo más tarde.';
      case 'auth/popup-closed-by-user':
        return 'Ventana de Google cerrada antes de completar el acceso.';
      default:
        return err.message || 'Ocurrió un error al procesar la solicitud.';
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!email) {
      setError('Por favor ingresa tu correo electrónico.');
      return;
    }

    if (mode === 'recovery') {
      try {
        setLoading(true);
        await resetPassword(email);
        setSuccessMsg('Enlace de recuperación enviado. Revisa tu bandeja de entrada.');
      } catch (err: any) {
        setError(mapAuthError(err));
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!password) {
      setError('Por favor ingresa tu contraseña.');
      return;
    }

    if (mode === 'register') {
      if (password.length < 6) {
        setError('La contraseña debe tener un mínimo de 6 caracteres.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Las contraseñas no coinciden.');
        return;
      }
      try {
        setLoading(true);
        await signUpWithEmail(email, password);
        if (onClose) onClose();
      } catch (err: any) {
        setError(mapAuthError(err));
      } finally {
        setLoading(false);
      }
      return;
    }

    // Modo Login
    try {
      setLoading(true);
      await signInWithEmail(email, password);
      if (onClose) onClose();
    } catch (err: any) {
      setError(mapAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setError(null);
      setSuccessMsg(null);
      setLoading(true);
      await signInWithGoogle();
      if (onClose) onClose();
    } catch (err: any) {
      setError(mapAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 shadow-2xl overflow-hidden">
        
        {/* Glow de fondo */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Botón de cierre / retorno */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-6 left-6 p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/5 transition-all flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider cursor-pointer"
          >
            <ArrowLeft size={16} /> Volver
          </button>
        )}

        <div className="text-center mt-4 mb-6">
          <div className="mx-auto w-14 h-14 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
            <Sprout size={28} className="text-emerald-400" />
          </div>
          <h2 className="text-2xl font-black tracking-tight uppercase text-white flex justify-center items-center gap-2">
            AgriEdge <span className="text-emerald-400">OS</span>
          </h2>
          <p className="text-neutral-500 text-xs font-mono tracking-widest uppercase mt-1">
            {mode === 'login' && 'Acceso al Centro de Control SCADA'}
            {mode === 'register' && 'Registro de Nuevo Operador'}
            {mode === 'recovery' && 'Restablecimiento de Credenciales'}
          </p>
        </div>

        {/* Tabs de Modo */}
        {mode !== 'recovery' && (
          <div className="flex bg-neutral-900/80 p-1 rounded-xl border border-white/5 mb-6">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(null); setSuccessMsg(null); }}
              className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                mode === 'login' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <LogIn size={14} /> Iniciar Sesión
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setError(null); setSuccessMsg(null); }}
              className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                mode === 'register' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <UserPlus size={14} /> Registrarse
            </button>
          </div>
        )}

        {/* Mensajes de Feedback */}
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

        {/* Formulario Principal */}
        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-400 mb-1.5">
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operador@agriedge.io"
                required
                className="w-full bg-neutral-900/90 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          {mode !== 'recovery' && (
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-400">
                  Contraseña
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => { setMode('recovery'); setError(null); setSuccessMsg(null); }}
                    className="text-[11px] font-mono text-emerald-400 hover:underline cursor-pointer"
                  >
                    ¿Olvidaste tu clave?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full bg-neutral-900/90 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>
          )}

          {mode === 'register' && (
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-400 mb-1.5">
                Confirmar Contraseña
              </label>
              <div className="relative">
                <KeyRound size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full bg-neutral-900/90 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black font-black text-xs uppercase tracking-widest transition-all duration-300 shadow-[0_0_20px_rgba(16,185,129,0.2)] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <Activity className="animate-spin" size={16} />
            ) : mode === 'login' ? (
              'Ingresar al Dashboard'
            ) : mode === 'register' ? (
              'Crear Cuenta de Operador'
            ) : (
              'Enviar Enlace de Recuperación'
            )}
          </button>
        </form>

        {mode === 'recovery' && (
          <button
            type="button"
            onClick={() => { setMode('login'); setError(null); setSuccessMsg(null); }}
            className="w-full mt-4 text-xs font-mono text-neutral-400 hover:text-white transition-colors text-center cursor-pointer"
          >
            ← Volver a Iniciar Sesión
          </button>
        )}

        {/* Separador y Google Auth */}
        {mode !== 'recovery' && (
          <>
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/5"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-[#0a0a0a] px-3 text-neutral-600 font-mono uppercase tracking-widest text-[10px]">
                  O continúa con
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-xl text-xs font-bold tracking-wider uppercase transition-all duration-300 border border-white/10 bg-neutral-900/60 hover:bg-neutral-800 text-white disabled:opacity-50 cursor-pointer"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google Workspace
            </button>
          </>
        )}

        <div className="mt-6 text-center border-t border-white/5 pt-4">
          <p className="text-neutral-600 text-[10px] font-mono tracking-widest uppercase">
            Plataforma Cloud Segura • Encriptación TLS 1.3
          </p>
        </div>
      </div>
    </div>
  );
};
