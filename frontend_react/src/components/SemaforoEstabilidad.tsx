import React, { useMemo } from 'react';
import type { TelemetriaFungi, DeviceCropProfile } from '../types/cultivo';
import { CheckCircle2, AlertTriangle, AlertOctagon, Activity } from 'lucide-react';

interface Props {
  telemetria: TelemetriaFungi | null;
  crop: DeviceCropProfile | null;
  modo_operacion: 'AUTO' | 'MANUAL';
  isOffline?: boolean;
  lastSeen?: number | null;
}

export const SemaforoEstabilidad: React.FC<Props> = ({ telemetria, crop, modo_operacion, isOffline, lastSeen }) => {
  const { estado, mensaje, colorClass, Icon, isCriticalPulse } = useMemo(() => {
    if (isOffline) {
      const timeStr = lastSeen ? new Date(lastSeen).toLocaleString() : 'N/A';
      return {
        estado: 'ALERTA CRÍTICA: ESP32 DESCONECTADO',
        mensaje: `No se ha recibido telemetría. Última conexión detectada: ${timeStr}`,
        colorClass: 'text-red-400 bg-red-500/10 border-red-500/50',
        Icon: AlertTriangle,
        isCriticalPulse: true
      };
    }

    if (!telemetria) {
      return {
        estado: 'DESCONECTADO',
        mensaje: 'Esperando datos del nodo...',
        colorClass: 'text-neutral-500 bg-neutral-900/50 border-neutral-800',
        Icon: AlertOctagon,
        isCriticalPulse: false
      };
    }

    if ((!telemetria.dht_ok && !telemetria.dht2_ok) || !telemetria.analogico_ok) {
      return {
        estado: 'FALLO CRÍTICO',
        mensaje: 'Pérdida de comunicación con ambos sensores DHT o Sustrato. Failsafe activado.',
        colorClass: 'text-red-400 bg-red-950/30 border-red-500/50',
        Icon: AlertOctagon,
        isCriticalPulse: false
      };
    }

    if (!telemetria.dht_ok || !telemetria.dht2_ok) {
      return {
        estado: 'ADVERTENCIA DE HARDWARE',
        mensaje: 'Un sensor DHT está desconectado. Operando con redundancia (Fallback).',
        colorClass: 'text-yellow-400 bg-yellow-950/30 border-yellow-500/50',
        Icon: AlertTriangle,
        isCriticalPulse: false
      };
    }

    if (modo_operacion === 'MANUAL' || telemetria.estado_operacional === 'MANUAL') {
      return {
        estado: 'MODO OVERRIDE',
        mensaje: 'Control manual activo. Reglas ignoradas.',
        colorClass: 'text-orange-400 bg-orange-950/30 border-orange-500/50',
        Icon: AlertTriangle,
        isCriticalPulse: false
      };
    }

    if (telemetria.estado_operacional) {
      switch (telemetria.estado_operacional) {
        case 'NORMAL':
          return {
            estado: 'CLIMA ESTABLE',
            mensaje: 'Todas las variables dentro del rango ideal',
            colorClass: 'text-emerald-400 bg-emerald-950/30 border-emerald-500/50',
            Icon: CheckCircle2,
            isCriticalPulse: false
          };
        case 'CALENTANDO':
          return {
            estado: 'CALENTANDO',
            mensaje: 'Sistema compensando: Temperatura baja',
            colorClass: 'text-amber-400 bg-amber-950/30 border-amber-500/50',
            Icon: AlertTriangle,
            isCriticalPulse: false
          };
        case 'ENFRIANDO':
          return {
            estado: 'ENFRIANDO / EXTRAYENDO',
            mensaje: 'Sistema compensando: Exceso de Calor o CO2',
            colorClass: 'text-blue-400 bg-blue-950/30 border-blue-500/50',
            Icon: AlertTriangle,
            isCriticalPulse: false
          };
        case 'HUMIDIFICANDO':
          return {
            estado: 'HUMIDIFICANDO',
            mensaje: 'Sistema compensando: Humedad baja',
            colorClass: 'text-cyan-400 bg-cyan-950/30 border-cyan-500/50',
            Icon: AlertTriangle,
            isCriticalPulse: false
          };
        case 'SAFE_MODE':
          return {
            estado: 'SAFE MODE',
            mensaje: 'Hardware descansando (Filtro Anti-Corto Ciclo)',
            colorClass: 'text-purple-400 bg-purple-950/30 border-purple-500/50',
            Icon: Activity,
            isCriticalPulse: false
          };
        case 'EMERGENCIA':
          return {
            estado: 'EMERGENCIA',
            mensaje: 'Variables en niveles críticos, mitigación activa.',
            colorClass: 'text-red-500 bg-red-950/30 border-red-500/50',
            Icon: AlertOctagon,
            isCriticalPulse: false
          };
      }
    }

    return {
      estado: 'EVALUANDO',
      mensaje: 'Recopilando telemetría...',
      colorClass: 'text-neutral-400 bg-neutral-900/50 border-neutral-500/50',
      Icon: Activity,
      isCriticalPulse: false
    };

  }, [telemetria, crop, modo_operacion, isOffline, lastSeen]);

  return (
    <div className={`flex items-center gap-4 p-4 rounded-xl border backdrop-blur-sm shadow-lg ${colorClass} transition-all duration-500 ${isCriticalPulse ? 'animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.2)]' : ''}`}>
      <div className={`p-3 rounded-full bg-black/20 ${colorClass.split(' ')[0]}`}>
        <Icon size={32} />
      </div>
      <div>
        <h3 className="font-bold text-lg tracking-wide uppercase">{estado}</h3>
        <p className="text-sm opacity-90">{mensaje}</p>
      </div>
    </div>
  );
};
