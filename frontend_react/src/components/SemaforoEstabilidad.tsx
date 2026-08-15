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
        isCriticalPulse: true
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
        estado: 'MODO OVERRIDE MANUAL',
        mensaje: 'Control manual activo por operador. Reglas automáticas en pausa.',
        colorClass: 'text-orange-400 bg-orange-950/30 border-orange-500/50',
        Icon: AlertTriangle,
        isCriticalPulse: false
      };
    }

    if (telemetria.estado_operacional === 'SAFE_MODE') {
      return {
        estado: 'SAFE MODE (PROTECCIÓN TÉRMICA)',
        mensaje: 'Hardware en reposo de seguridad por protección de ciclo de relés.',
        colorClass: 'text-purple-400 bg-purple-950/30 border-purple-500/50',
        Icon: Activity,
        isCriticalPulse: false
      };
    }

    // ── EVALUACIÓN REAL GROUND-TRUTH CONTRA EL PERFIL AGRONÓMICO ACTIVO ──
    if (crop) {
      const t = telemetria.temp_promedio;
      const h = telemetria.humedad_promedio;
      const s = telemetria.sensor_analogico;
      const co2 = telemetria.co2_ppm;

      // 1. Chequeo de niveles críticos de supervivencia (EMERGENCIA)
      const criticals: string[] = [];
      if (t != null && (t < crop.temp_crit_min || t > crop.temp_crit_max)) {
        criticals.push(`Temp crítica (${t.toFixed(1)}°C)`);
      }
      if (s != null && s >= crop.temp_sustrato_crit_max) {
        criticals.push(`Sustrato crítico (${s.toFixed(1)}°C)`);
      }
      if (h != null && h < crop.hum_crit_min) {
        criticals.push(`Humedad crítica (${h.toFixed(1)}%)`);
      }
      if (co2 != null && co2 >= crop.co2_crit_max) {
        criticals.push(`CO2 tóxico (${co2} ppm)`);
      }

      if (criticals.length > 0 || telemetria.estado_operacional === 'EMERGENCIA') {
        return {
          estado: 'EMERGENCIA CLIMÁTICA',
          mensaje: `Mitigación activa: ${criticals.length > 0 ? criticals.join(' · ') : 'Variables en umbrales críticos'}`,
          colorClass: 'text-red-500 bg-red-950/40 border-red-500/60',
          Icon: AlertOctagon,
          isCriticalPulse: true
        };
      }

      // 2. Chequeo de desviaciones del rango ideal (COMPENSANDO / ALERTA)
      const deviations: string[] = [];
      if (t != null && t < crop.temp_ideal_min) {
        deviations.push(`Temp baja (${t.toFixed(1)}°C < ${crop.temp_ideal_min}°C)`);
      } else if (t != null && t > crop.temp_ideal_max) {
        deviations.push(`Temp alta (${t.toFixed(1)}°C > ${crop.temp_ideal_max}°C)`);
      }

      if (h != null && h < crop.hum_ideal_min) {
        deviations.push(`Humedad baja (${h.toFixed(1)}% < ${crop.hum_ideal_min}%)`);
      } else if (h != null && h > crop.hum_ideal_max) {
        deviations.push(`Humedad alta (${h.toFixed(1)}% > ${crop.hum_ideal_max}%)`);
      }

      if (co2 != null && co2 > crop.co2_ideal_max) {
        deviations.push(`CO2 elevado (${co2} ppm > ${crop.co2_ideal_max} ppm)`);
      }

      if (deviations.length > 0) {
        let compensationHeader = 'COMPENSANDO CLIMA';
        if (telemetria.estado_operacional === 'CALENTANDO') compensationHeader = 'CALENTANDO CÁMARA';
        else if (telemetria.estado_operacional === 'ENFRIANDO') compensationHeader = 'ENFRIANDO / EXTRAYENDO';
        else if (telemetria.estado_operacional === 'HUMIDIFICANDO') compensationHeader = 'HUMIDIFICANDO CÁMARA';

        return {
          estado: compensationHeader,
          mensaje: deviations.join(' · '),
          colorClass: 'text-amber-400 bg-amber-950/30 border-amber-500/50',
          Icon: AlertTriangle,
          isCriticalPulse: false
        };
      }

      // 3. Todas las variables se encuentran dentro de los rangos ideales
      return {
        estado: 'CLIMA ESTABLE',
        mensaje: 'Todas las variables dentro del rango ideal',
        colorClass: 'text-emerald-400 bg-emerald-950/30 border-emerald-500/50',
        Icon: CheckCircle2,
        isCriticalPulse: false
      };
    }

    // Fallback si aún no se ha cargado el objeto crop
    return {
      estado: telemetria.estado_operacional === 'NORMAL' ? 'CLIMA ESTABLE' : `MODO: ${telemetria.estado_operacional || 'EVALUANDO'}`,
      mensaje: 'Recopilando perfiles y telemetría...',
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
