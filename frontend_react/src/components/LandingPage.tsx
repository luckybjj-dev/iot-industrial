import React, { useState } from 'react';
import { 
  Sprout, 
  Cpu, 
  ShieldCheck, 
  Zap, 
  Gauge, 
  Thermometer, 
  Droplets, 
  Wind, 
  Layers, 
  ArrowRight, 
  CheckCircle2, 
  Lock, 
  Radio, 
  Send, 
  Flame, 
  Leaf, 
  Sliders, 
  Sparkles,
  Server,
  Activity
} from 'lucide-react';
import { ref, push } from 'firebase/database';
import { database } from '../config/firebase';
import { notifyNewLead } from '../services/notificationService';

interface LandingPageProps {
  onOpenLogin: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenLogin }) => {
  const [activeKingdomTab, setActiveKingdomTab] = useState<'fungi' | 'plantae'>('fungi');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactCrop, setContactCrop] = useState('fungi');
  const [contactMsg, setContactMsg] = useState('');
  const [contactSent, setContactSent] = useState(false);
  const [contactLoading, setContactLoading] = useState(false);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName || !contactEmail) return;

    try {
      setContactLoading(true);
      const leadPayload = {
        name: contactName.trim(),
        email: contactEmail.trim(),
        cropType: contactCrop,
        message: contactMsg.trim(),
        createdAt: Date.now(),
        status: 'NUEVO' as const
      };

      const leadsRef = ref(database, 'leads');
      await push(leadsRef, leadPayload);

      // Despachar alerta instantánea a Telegram a los administradores
      notifyNewLead(leadPayload).catch(err => {
        console.warn('[LandingPage] No se pudo enviar alerta a Telegram:', err);
      });

      setContactSent(true);
      setContactName('');
      setContactEmail('');
      setContactMsg('');
      setTimeout(() => setContactSent(false), 8000);
    } catch (error) {
      console.error('[LandingPage] Error guardando solicitud de contacto:', error);
    } finally {
      setContactLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030303] text-neutral-100 font-sans selection:bg-emerald-500/30 overflow-x-hidden">
      
      {/* Background Decor */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.15),rgba(255,255,255,0))] pointer-events-none z-0"></div>
      <div className="fixed inset-0 bg-[url('/grid.svg')] opacity-[0.03] pointer-events-none z-0"></div>

      {/* ── NAVBAR ────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#030303]/80 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Brand Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              <Sprout className="text-black" size={22} />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-white uppercase flex items-center gap-1.5">
                AgriEdge <span className="text-emerald-400">OS</span>
              </span>
              <span className="text-[9px] font-mono tracking-widest text-neutral-500 uppercase block -mt-1">
                Industrial SCADA v2.4
              </span>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-mono uppercase tracking-wider text-neutral-400">
            <a href="#features" className="hover:text-emerald-400 transition-colors">Características</a>
            <a href="#hardware" className="hover:text-emerald-400 transition-colors">Hardware Edge</a>
            <a href="#biology" className="hover:text-emerald-400 transition-colors">Fungi & Plantae</a>
            <a href="#architecture" className="hover:text-emerald-400 transition-colors">Arquitectura</a>
            <a href="#contact" className="hover:text-emerald-400 transition-colors">Contacto</a>
          </nav>

          {/* Action CTA */}
          <div className="flex items-center gap-4">
            <button
              onClick={onOpenLogin}
              className="px-5 py-2.5 rounded-xl text-xs font-black tracking-widest uppercase bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black shadow-[0_0_25px_rgba(16,185,129,0.3)] hover:shadow-[0_0_35px_rgba(16,185,129,0.5)] transition-all duration-300 flex items-center gap-2 cursor-pointer"
            >
              <Lock size={14} /> Acceso a Clientes
            </button>
          </div>
        </div>
      </header>

      {/* ── HERO SECTION ─────────────────────────────────────────────────── */}
      <section className="relative z-10 pt-20 pb-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        
        {/* Pill Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono tracking-wider uppercase mb-8 shadow-[0_0_20px_rgba(16,185,129,0.15)] animate-pulse">
          <Sparkles size={14} /> Sistema Operativo Ciberfísico Autónomo
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white uppercase max-w-5xl mx-auto leading-[1.08]">
          Automatización de <br className="hidden sm:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
            Microclimas Industriales
          </span> <br />
          de Precisión Extrema
        </h1>

        {/* Subtitle */}
        <p className="mt-8 text-base sm:text-lg text-neutral-400 max-w-3xl mx-auto font-light leading-relaxed">
          Plataforma SCADA y Edge Computing en tiempo real para micología comercial e hidroponía avanzada. Control determinista con ESP32 FreeRTOS, modulación térmica PID, regulación dinámica de VPD y resiliencia offline de grado industrial.
        </p>

        {/* CTA Buttons */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={onOpenLogin}
            className="px-8 py-4 rounded-xl text-xs sm:text-sm font-black tracking-widest uppercase bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black shadow-[0_0_30px_rgba(16,185,129,0.4)] transition-all duration-300 flex items-center gap-3 cursor-pointer"
          >
            Ingresar al SCADA <ArrowRight size={18} />
          </button>
          
          <a
            href="#hardware"
            className="px-8 py-4 rounded-xl text-xs sm:text-sm font-bold tracking-widest uppercase bg-neutral-900/80 hover:bg-neutral-800 border border-white/10 text-white transition-all flex items-center gap-2"
          >
            <Cpu size={18} className="text-emerald-400" /> Explorar Hardware
          </a>
        </div>

        {/* ── LIVE INTERACTIVE TELEMETRY CARD PREVIEW ─────────────────────── */}
        <div className="mt-20 relative max-w-5xl mx-auto bg-[#0a0a0a]/90 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl">
          
          {/* Header Bar of Preview */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-white/5 text-left">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping"></div>
              <div>
                <h3 className="text-sm font-black tracking-wide text-white uppercase flex items-center gap-2">
                  Nodo Maestro ESP32 • <span className="text-emerald-400">Cámara Piloto 01</span>
                </h3>
                <p className="text-[10px] font-mono text-neutral-500 uppercase">
                  Telemetría Realtime • Lazo Cerrado PID Activo
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono bg-emerald-950/40 text-emerald-300 border border-emerald-500/40 px-3 py-1 rounded-full">
              <Radio size={14} className="text-emerald-400 animate-pulse" /> ONLINE • 20.6°C / 49.1% HR
            </div>
          </div>

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mt-6">
            <div className="bg-[#111111] border border-white/5 rounded-2xl p-4 text-left">
              <div className="flex items-center justify-between text-neutral-400 mb-2">
                <span className="text-[10px] font-mono uppercase">Temperatura</span>
                <Thermometer size={16} className="text-amber-400" />
              </div>
              <div className="text-2xl font-black text-white">20.6<span className="text-xs text-neutral-500">°C</span></div>
              <div className="text-[9px] font-mono text-emerald-400 mt-1">Target: 21.0 - 24.0°C</div>
            </div>

            <div className="bg-[#111111] border border-white/5 rounded-2xl p-4 text-left">
              <div className="flex items-center justify-between text-neutral-400 mb-2">
                <span className="text-[10px] font-mono uppercase">Humedad</span>
                <Droplets size={16} className="text-cyan-400" />
              </div>
              <div className="text-2xl font-black text-white">49.1<span className="text-xs text-neutral-500">%</span></div>
              <div className="text-[9px] font-mono text-cyan-400 mt-1">Target: 40 - 50%</div>
            </div>

            <div className="bg-[#111111] border border-white/5 rounded-2xl p-4 text-left">
              <div className="flex items-center justify-between text-neutral-400 mb-2">
                <span className="text-[10px] font-mono uppercase">VPD Clima</span>
                <Gauge size={16} className="text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-emerald-400">1.05<span className="text-xs text-neutral-500">kPa</span></div>
              <div className="text-[9px] font-mono text-emerald-400 mt-1">Transpiración Óptima</div>
            </div>

            <div className="bg-[#111111] border border-white/5 rounded-2xl p-4 text-left">
              <div className="flex items-center justify-between text-neutral-400 mb-2">
                <span className="text-[10px] font-mono uppercase">Zona Raíz / Sustr.</span>
                <Leaf size={16} className="text-purple-400" />
              </div>
              <div className="text-2xl font-black text-white">18.4<span className="text-xs text-neutral-500">°C</span></div>
              <div className="text-[9px] font-mono text-purple-400 mt-1">Sonda NTC eFuse</div>
            </div>

            <div className="bg-[#111111] border border-white/5 rounded-2xl p-4 text-left">
              <div className="flex items-center justify-between text-neutral-400 mb-2">
                <span className="text-[10px] font-mono uppercase">CO2 NDIR</span>
                <Wind size={16} className="text-blue-400" />
              </div>
              <div className="text-2xl font-black text-white">580<span className="text-xs text-neutral-500">ppm</span></div>
              <div className="text-[9px] font-mono text-blue-400 mt-1">Sensor SCD30 I2C</div>
            </div>

            <div className="bg-[#111111] border border-white/5 rounded-2xl p-4 text-left">
              <div className="flex items-center justify-between text-neutral-400 mb-2">
                <span className="text-[10px] font-mono uppercase">Actuadores</span>
                <Zap size={16} className="text-yellow-400" />
              </div>
              <div className="flex gap-1.5 mt-1 flex-wrap">
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">NBL:ON</span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-500">CAL:OF</span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-500">EXT:OF</span>
              </div>
              <div className="text-[9px] font-mono text-neutral-400 mt-2">6 Relés Industriales</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ────────────────────────────────────────────────────── */}
      <section className="border-y border-white/5 bg-[#050505] py-10 px-4">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="text-3xl sm:text-4xl font-black text-emerald-400">99.99%</div>
            <div className="text-xs font-mono uppercase tracking-widest text-neutral-400 mt-1">Uptime Autónomo</div>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-black text-teal-400">&lt; 50ms</div>
            <div className="text-xs font-mono uppercase tracking-widest text-neutral-400 mt-1">Latencia Telemetría</div>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-black text-cyan-400">±0.2°C</div>
            <div className="text-xs font-mono uppercase tracking-widest text-neutral-400 mt-1">Precisión PID EWMA</div>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-black text-purple-400">100%</div>
            <div className="text-xs font-mono uppercase tracking-widest text-neutral-400 mt-1">Resiliencia Offline</div>
          </div>
        </div>
      </section>

      {/* ── FEATURES SECTION ─────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-xs font-mono uppercase tracking-widest text-emerald-400">Ingeniería de Control</span>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white uppercase mt-2">
            Capacidades Industriales de Vanguardia
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          
          <div className="bg-[#0a0a0a] border border-white/5 hover:border-emerald-500/40 rounded-3xl p-8 transition-all duration-300 group">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Flame className="text-amber-400" size={24} />
            </div>
            <h3 className="text-xl font-bold text-white uppercase tracking-wide mb-3">Lazo PID & Modulación SSR</h3>
            <p className="text-sm text-neutral-400 leading-relaxed font-light">
              Algoritmo de modulación de potencia por ancho de pulso (*Time-Proportioning*) a nivel de software en FreeRTOS. Elimina el desgaste de relés mecánicos y previene la inercia térmica en cámaras de cultivo.
            </p>
          </div>

          <div className="bg-[#0a0a0a] border border-white/5 hover:border-emerald-500/40 rounded-3xl p-8 transition-all duration-300 group">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Gauge className="text-cyan-400" size={24} />
            </div>
            <h3 className="text-xl font-bold text-white uppercase tracking-wide mb-3">Control Psicrométrico VPD</h3>
            <p className="text-sm text-neutral-400 leading-relaxed font-light">
              Cálculo estequiométrico en tiempo real del Déficit de Presión de Vapor (VPD). Regulación armónica entre niebla ultrasónica y extracción para maximizar la tasa de transpiración y asimilación de nutrientes.
            </p>
          </div>

          <div className="bg-[#0a0a0a] border border-white/5 hover:border-emerald-500/40 rounded-3xl p-8 transition-all duration-300 group">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <ShieldCheck className="text-emerald-400" size={24} />
            </div>
            <h3 className="text-xl font-bold text-white uppercase tracking-wide mb-3">Árbitro de Conflictos & Failsafe</h3>
            <p className="text-sm text-neutral-400 leading-relaxed font-light">
              Interlocks de seguridad deterministas que impiden colisiones físicas (ej. calefactor + enfriador simultáneos, o extracción activa durante humidificación). Safe Mode automático ante desconexión de sensores.
            </p>
          </div>

          <div className="bg-[#0a0a0a] border border-white/5 hover:border-emerald-500/40 rounded-3xl p-8 transition-all duration-300 group">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Layers className="text-purple-400" size={24} />
            </div>
            <h3 className="text-xl font-bold text-white uppercase tracking-wide mb-3">Filtrado Matemático EWMA</h3>
            <p className="text-sm text-neutral-400 leading-relaxed font-light">
              Filtro de media móvil exponencial que neutraliza perturbaciones espurias (como abrir la puerta del invernadero), evitando ciclos de conmutación destructivos en compresores y extractores.
            </p>
          </div>

          <div className="bg-[#0a0a0a] border border-white/5 hover:border-emerald-500/40 rounded-3xl p-8 transition-all duration-300 group">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Server className="text-blue-400" size={24} />
            </div>
            <h3 className="text-xl font-bold text-white uppercase tracking-wide mb-3">Independencia de la Nube</h3>
            <p className="text-sm text-neutral-400 leading-relaxed font-light">
              Toda la inteligencia de control reside físicamente en la memoria Flash LittleFS del microcontrolador. Si el router o internet fallan, el cultivo continúa su receta biológica al 100%.
            </p>
          </div>

          <div className="bg-[#0a0a0a] border border-white/5 hover:border-emerald-500/40 rounded-3xl p-8 transition-all duration-300 group">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Sliders className="text-teal-400" size={24} />
            </div>
            <h3 className="text-xl font-bold text-white uppercase tracking-wide mb-3">Crop Steering Dinámico</h3>
            <p className="text-sm text-neutral-400 leading-relaxed font-light">
              Transiciones multifase programables día por día. Ajuste automático de fotoperiodo, curvas de estrés hídrico controlado y cambios de setpoint para inducir floración o fructificación.
            </p>
          </div>

        </div>
      </section>

      {/* ── HARDWARE SHOWCASE ────────────────────────────────────────────── */}
      <section id="hardware" className="py-24 px-4 sm:px-6 lg:px-8 bg-[#050505] border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-xs font-mono uppercase tracking-widest text-emerald-400">Arquitectura de Campo</span>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white uppercase mt-2">
              Hardware Industrial de Precisión
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="space-y-6">
              
              <div className="flex gap-4 p-5 rounded-2xl bg-[#0a0a0a] border border-white/5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                  <Cpu className="text-emerald-400" size={20} />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white uppercase">ESP32 Dual-Core (FreeRTOS)</h4>
                  <p className="text-xs text-neutral-400 mt-1">
                    Núcleo 0 dedicado a WiFi / LwIP / Firebase TLS y Núcleo 1 dedicado exclusivamente al control termodinámico en tiempo real sin interrupciones.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 p-5 rounded-2xl bg-[#0a0a0a] border border-white/5">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
                  <Droplets className="text-cyan-400" size={20} />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white uppercase">Dual DHT22 Redundante</h4>
                  <p className="text-xs text-neutral-400 mt-1">
                    Lectura cruzada promediada con tolerancia a fallas. Si un sensor se desconecta físicamente, el sistema conmuta instantáneamente al canal de respaldo.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 p-5 rounded-2xl bg-[#0a0a0a] border border-white/5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
                  <Thermometer className="text-amber-400" size={20} />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white uppercase">Sonda NTC con Calibración eFuse</h4>
                  <p className="text-xs text-neutral-400 mt-1">
                    Multisampling de 32 muestras y curvas matemáticas Steinhart-Hart caracterizadas con Vref interna de fábrica para medición exacta en sustrato o zona radicular.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 p-5 rounded-2xl bg-[#0a0a0a] border border-white/5">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
                  <Wind className="text-blue-400" size={20} />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white uppercase">Sensor CO2 NDIR Óptico (SCD30)</h4>
                  <p className="text-xs text-neutral-400 mt-1">
                    Sensor infrarrojo no dispersivo de doble canal con bus I2C para medición de gases sin derivas químicas y control de ventilación inteligente.
                  </p>
                </div>
              </div>

            </div>

            <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 relative overflow-hidden text-left">
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                <Cpu size={240} className="text-emerald-400" />
              </div>
              
              <span className="text-[10px] font-mono uppercase px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Grado Industrial 24/7
              </span>

              <h3 className="text-2xl sm:text-3xl font-black text-white uppercase mt-4">
                Diseñado para Ambientes Hostiles
              </h3>

              <p className="text-sm text-neutral-400 mt-4 leading-relaxed font-light">
                Cámaras de cultivo con 95% de humedad relativa, polvo de sustrato y calor metabólico requieren electrónica resiliente. AgriEdge OS incorpora:
              </p>

              <ul className="mt-6 space-y-3 text-xs font-mono text-neutral-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                  Hardware Watchdog Timer (WDT) anticuelgues
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                  Anti-Short-Cycle (180s) para protección de compresores
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                  HMI Local Pantalla TFT ST7735 Anti-Flickering
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                  Persistencia Atómica Transaccional en LittleFS
                </li>
              </ul>

              <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                <span className="text-[11px] font-mono text-neutral-500 uppercase">Capacidad: 6 Actuadores de Potencia</span>
                <span className="text-xs font-bold text-emerald-400 font-mono">220V / 10A</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── BIOLOGICAL ECOSYSTEM (FUNGI & PLANTAE) ─────────────────────────── */}
      <section id="biology" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-xs font-mono uppercase tracking-widest text-emerald-400">Modelos Agronómicos</span>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white uppercase mt-2">
            Optimizado para Dos Reinos Biológicos
          </h2>
          <p className="text-sm text-neutral-400 max-w-2xl mx-auto mt-4 font-light">
            Algoritmos termodinámicos adaptados a la fisiología específica de hongos y plantas.
          </p>
        </div>

        <div className="flex justify-center mb-12">
          <div className="bg-neutral-900/90 p-1.5 rounded-2xl border border-white/10 flex gap-2">
            <button
              onClick={() => setActiveKingdomTab('fungi')}
              className={`px-8 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center gap-2 cursor-pointer ${
                activeKingdomTab === 'fungi'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-[0_0_20px_rgba(147,51,234,0.3)]'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Sprout size={16} /> Reino Fungi (Micología)
            </button>
            <button
              onClick={() => setActiveKingdomTab('plantae')}
              className={`px-8 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center gap-2 cursor-pointer ${
                activeKingdomTab === 'plantae'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-black font-black shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Leaf size={16} /> Reino Plantae (Horticultura)
            </button>
          </div>
        </div>

        {activeKingdomTab === 'fungi' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#0a0a0a] border border-purple-500/20 rounded-3xl p-8 text-left">
              <h4 className="text-lg font-black text-purple-400 uppercase mb-3">Termogénesis de Sustrato</h4>
              <p className="text-xs text-neutral-400 leading-relaxed font-light">
                El micelio colonizador genera hasta +3°C por calor metabólico. AgriEdge compensa el diferencial térmico entre el bloque y el aire para evitar la muerte celular del micelio.
              </p>
            </div>
            <div className="bg-[#0a0a0a] border border-purple-500/20 rounded-3xl p-8 text-left">
              <h4 className="text-lg font-black text-purple-400 uppercase mb-3">Micro-Niebla Ultrasónica</h4>
              <p className="text-xs text-neutral-400 leading-relaxed font-light">
                Inyección de niebla con gotas menores a 5 micras para mantener humedades del 85-95% sin condensación líquida sobre los primordios ni riesgo de contaminación bacteriana.
              </p>
            </div>
            <div className="bg-[#0a0a0a] border border-purple-500/20 rounded-3xl p-8 text-left">
              <h4 className="text-lg font-black text-purple-400 uppercase mb-3">Purga Inteligente de CO2</h4>
              <p className="text-xs text-neutral-400 leading-relaxed font-light">
                Extracción temporizada gobernada por sensor NDIR. Evita la elongación deforme de tallos en especies sensibles como Pleurotus ostreatus o Ganoderma lucidum.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#0a0a0a] border border-emerald-500/20 rounded-3xl p-8 text-left">
              <h4 className="text-lg font-black text-emerald-400 uppercase mb-3">Control de Zona Radicular</h4>
              <p className="text-xs text-neutral-400 leading-relaxed font-light">
                Monitoreo de temperatura radicular en sustratos inertes (coco, perlita). Previene estrés térmico y la proliferación de patógenos letales como *Pythium* y *Fusarium*.
              </p>
            </div>
            <div className="bg-[#0a0a0a] border border-emerald-500/20 rounded-3xl p-8 text-left">
              <h4 className="text-lg font-black text-emerald-400 uppercase mb-3">Fotoperiodo & DLI</h4>
              <p className="text-xs text-neutral-400 leading-relaxed font-light">
                Automatización de ciclos de luz para Frutilla Monterey de día neutro, Tomates, Cannabis y hortalizas. Sincronización horaria autónoma vía NTP.
              </p>
            </div>
            <div className="bg-[#0a0a0a] border border-emerald-500/20 rounded-3xl p-8 text-left">
              <h4 className="text-lg font-black text-emerald-400 uppercase mb-3">Riego por Pulsos Anti-Flood</h4>
              <p className="text-xs text-neutral-400 leading-relaxed font-light">
                Estrategia de pulsos cortos de inyección con ventanas de absorción (*Soak Time* de 10 min) y corte de emergencia para prevenir encharcamiento y asfixia radicular.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* ── 3-TIER PLC ARCHITECTURE ───────────────────────────────────────── */}
      <section id="architecture" className="py-24 px-4 sm:px-6 lg:px-8 bg-[#050505] border-t border-white/5">
        <div className="max-w-7xl mx-auto text-center">
          <span className="text-xs font-mono uppercase tracking-widest text-emerald-400">Paradigma de Ingeniería</span>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white uppercase mt-2">
            Arquitectura de 3 Capas (Estándar PLC)
          </h2>
          <p className="text-sm text-neutral-400 max-w-2xl mx-auto mt-4 font-light">
            Separación estricta de responsabilidades en el microcontrolador para máxima estabilidad y seguridad.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 text-left">
            <div className="p-8 rounded-3xl bg-[#0a0a0a] border border-white/5">
              <div className="text-xs font-mono text-emerald-400 font-bold uppercase mb-2">Capa 1</div>
              <h4 className="text-lg font-black text-white uppercase mb-3">Lectura y Filtrado Matemático</h4>
              <p className="text-xs text-neutral-400 leading-relaxed font-light">
                Multisampling de hardware, caracterización de curvas ADC con calibración eFuse y filtrado de señales mediante EWMA para eliminar ruido analógico.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-[#0a0a0a] border border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
              <div className="text-xs font-mono text-emerald-400 font-bold uppercase mb-2">Capa 2</div>
              <h4 className="text-lg font-black text-white uppercase mb-3">Árbitro y Motor Determinista</h4>
              <p className="text-xs text-neutral-400 leading-relaxed font-light">
                Resolución jerárquica de emergencias, lazo cerrado PID, bandas muertas asimétricas y exclusión mutua entre actuadores conflictivos.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-[#0a0a0a] border border-white/5">
              <div className="text-xs font-mono text-emerald-400 font-bold uppercase mb-2">Capa 3</div>
              <h4 className="text-lg font-black text-white uppercase mb-3">Filtro de Potencia y Ejecución</h4>
              <p className="text-xs text-neutral-400 leading-relaxed font-light">
                Protección contra ciclos cortos de encendido (*Anti-Short-Cycle* de 180s) y conmutación segura de salidas digitales hacia relés de potencia.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CONTACT & DEMO REQUEST FORM ───────────────────────────────────── */}
      <section id="contact" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="max-w-4xl mx-auto text-center">
          
          <span className="text-xs font-mono uppercase tracking-widest text-emerald-400">Implementación Comercial</span>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white uppercase mt-2">
            Solicita una Demostración o Cotización
          </h2>
          <p className="text-sm text-neutral-400 max-w-xl mx-auto mt-4 font-light">
            Cuéntanos sobre tus naves o cámaras de cultivo. Diseñamos la arquitectura a la medida de tu producción.
          </p>

          <form onSubmit={handleContactSubmit} className="mt-12 bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 text-left shadow-2xl">
            
            {contactSent && (
              <div className="bg-emerald-950/40 border border-emerald-500/50 text-emerald-300 px-4 py-3 rounded-xl mb-6 flex items-center gap-3 text-xs">
                <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0" />
                <span>¡Solicitud enviada exitosamente! Un ingeniero de AgriEdge se contactará contigo a la brevedad.</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-neutral-400 mb-2">Nombre / Empresa</label>
                <input
                  type="text"
                  required
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Agrícola San Pedro"
                  className="w-full bg-neutral-900/80 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-neutral-400 mb-2">Correo Electrónico</label>
                <input
                  type="email"
                  required
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="contacto@agricola.cl"
                  className="w-full bg-neutral-900/80 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-xs font-mono uppercase tracking-wider text-neutral-400 mb-2">Tipo de Producción</label>
              <select
                value={contactCrop}
                onChange={(e) => setContactCrop(e.target.value)}
                className="w-full bg-neutral-900/80 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
              >
                <option value="fungi">Micología Comercial (Orellanas, Shiitake, Melena de León)</option>
                <option value="plantae">Horticultura Hidropónica / Invernaderos (Frutillas, Tomates, Hojas)</option>
                <option value="cannabis">Cannabis Medicinal / Indoor Controlado</option>
                <option value="custom">Proyecto Industrial a Medida</option>
              </select>
            </div>

            <div className="mt-6">
              <label className="block text-xs font-mono uppercase tracking-wider text-neutral-400 mb-2">Detalles del Cultivo / Dimensiones</label>
              <textarea
                rows={3}
                required
                value={contactMsg}
                onChange={(e) => setContactMsg(e.target.value)}
                placeholder="Indica cantidad de salas, volumen en m3 o requerimientos de climatización..."
                className="w-full bg-neutral-900/80 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500 transition-colors"
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={contactLoading}
              className="w-full mt-6 py-4 px-8 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-black text-xs uppercase tracking-widest transition-all duration-300 shadow-[0_0_25px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {contactLoading ? (
                <>
                  <Activity className="animate-spin" size={16} /> Procesando Solicitud...
                </>
              ) : (
                <>
                  <Send size={16} /> Enviar Solicitud Comercial
                </>
              )}
            </button>
          </form>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-12 px-4 sm:px-6 lg:px-8 bg-[#020202] text-xs font-mono text-neutral-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-emerald-500/20 rounded-lg flex items-center justify-center">
              <Sprout className="text-emerald-400" size={14} />
            </div>
            <span className="text-neutral-300 font-bold uppercase tracking-wider">AgriEdge OS</span>
            <span>• Estándar de Automatización Industrial</span>
          </div>

          <div className="flex gap-6 uppercase tracking-wider text-[11px]">
            <a href="#features" className="hover:text-white transition-colors">Características</a>
            <a href="#hardware" className="hover:text-white transition-colors">Hardware</a>
            <button onClick={onOpenLogin} className="hover:text-emerald-400 transition-colors cursor-pointer">Portal Clientes</button>
          </div>

          <div>
            © {new Date().getFullYear()} AgriEdge Technologies. Todos los derechos reservados.
          </div>
        </div>
      </footer>

    </div>
  );
};
