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

    const isStandbyOrNoCrop = !crop || crop.temp_ideal_min === 0 || crop.temp_ideal_max === 0;

    if (isStandbyOrNoCrop || telemetria.estado_operacional === 'MONITOREO' || telemetria.estado_operacional === 'STANDBY') {
      return {
        estado: 'MODO MONITOREO',
        mensaje: 'Sin perfil de cultivo asignado. Sensores en línea y actuadores en reposo',
        colorClass: 'text-cyan-400 bg-cyan-950/30 border-cyan-500/50',
        Icon: Activity,
        isCriticalPulse: false
      };
    }

    // 1. Detección de Anomalía Crítica: Conflicto Térmico Simultáneo (Calor + Frío)
    if ((telemetria.heater_on || telemetria.estado_operacional === 'CALENTANDO') && telemetria.cooler_on) {
      return {
        estado: 'FALLO CRÍTICO: CONFLICTO TÉRMICO',
        mensaje: 'Anomalía detectada: Calefactor y Enfriador activos simultáneamente. Failsafe activado.',
        colorClass: 'text-red-500 bg-red-950/30 border-red-500/50',
        Icon: AlertOctagon,
        isCriticalPulse: true
      };
    }

    // 2. Emergencia Térmica en Zona Radicular / Sustrato (Micelio)
    if (telemetria.sensor_analogico != null && crop && crop.temp_sustrato_crit_max > 10 && telemetria.sensor_analogico >= crop.temp_sustrato_crit_max) {
      return {
        estado: 'EMERGENCIA TÉRMICA EN SUSTRATO',
        mensaje: `Calefactor inhibido por seguridad: Sustrato caliente (${telemetria.sensor_analogico.toFixed(1)}°C >= ${crop.temp_sustrato_crit_max}°C) → Evacuando calor radicular`,
        colorClass: 'text-red-500 bg-red-950/30 border-red-500/50',
        Icon: AlertOctagon,
        isCriticalPulse: true
      };
    }

    if (telemetria.estado_operacional) {
      switch (telemetria.estado_operacional) {
        case 'NORMAL':
          return {
            estado: 'CLIMA ESTABLE',
            mensaje: 'Todas las variables dentro del rango ideal (Actuadores en reposo)',
            colorClass: 'text-emerald-400 bg-emerald-950/30 border-emerald-500/50',
            Icon: CheckCircle2,
            isCriticalPulse: false
          };

        case 'CALENTANDO': {
          const tempVal = telemetria.temp_promedio != null ? `${telemetria.temp_promedio.toFixed(1)}°C` : '--';
          const minVal = crop?.temp_ideal_min != null ? `${crop.temp_ideal_min}°C` : '--';
          
          let estadoTitulo = 'CALENTANDO';
          let razonesCompensacion = `Calefactor ON (Temp. baja: ${tempVal} < ${minVal})`;

          // Concatenación Multivariable: Si el extractor también está activo por humedad o CO2
          if (telemetria.extractor_on) {
            if (crop && telemetria.humedad_promedio != null && telemetria.humedad_promedio > crop.hum_ideal_max) {
              estadoTitulo = 'CALENTANDO / DESHUMIDIFICANDO';
              razonesCompensacion += ` + Extractor ON (Exceso humedad: ${telemetria.humedad_promedio.toFixed(1)}% > ${crop.hum_ideal_max}%)`;
            } else if (crop && telemetria.co2_ppm != null && telemetria.co2_ppm >= crop.co2_crit_max) {
              estadoTitulo = 'CALENTANDO / PURGANDO CO2';
              razonesCompensacion += ` + Extractor ON (Purga CO2: ${telemetria.co2_ppm} ppm >= ${crop.co2_crit_max} ppm)`;
            } else {
              estadoTitulo = 'CALENTANDO / VENTILANDO';
              razonesCompensacion += ` + Extractor ON (Ventilación activa)`;
            }
          }

          if (telemetria.fogger_on) {
            razonesCompensacion += ' + Niebla ON';
          }

          return {
            estado: estadoTitulo,
            mensaje: `Sistema compensando: ${razonesCompensacion}`,
            colorClass: 'text-amber-400 bg-amber-950/30 border-amber-500/50',
            Icon: AlertTriangle,
            isCriticalPulse: false
          };
        }

        case 'ENFRIANDO': {
          const co2Exceso = crop && telemetria.co2_ppm != null && telemetria.co2_ppm >= crop.co2_crit_max;
          const tempAlta = crop && telemetria.temp_promedio != null && telemetria.temp_promedio > crop.temp_ideal_max;
          const humExceso = crop && telemetria.humedad_promedio != null && telemetria.humedad_promedio > crop.hum_ideal_max;

          let estadoTitulo = 'ENFRIANDO / EXTRAYENDO';
          let razon = 'Disipación de calor o ventilación activa';

          if (tempAlta && humExceso) {
            razon = `Temp. alta (${telemetria.temp_promedio?.toFixed(1)}°C > ${crop?.temp_ideal_max}°C) + Exceso humedad (${telemetria.humedad_promedio?.toFixed(1)}% > ${crop?.hum_ideal_max}%) → Enfriador/Extractor ON`;
          } else if (co2Exceso) {
            estadoTitulo = 'PURGANDO CO2';
            razon = `Acumulación de CO2 (${telemetria.co2_ppm} ppm >= ${crop?.co2_crit_max} ppm) → Extractor ON`;
          } else if (tempAlta) {
            razon = `Temperatura ambiental alta (${telemetria.temp_promedio?.toFixed(1)}°C > ${crop?.temp_ideal_max}°C) → Enfriador/Extractor ON`;
          } else if (humExceso) {
            estadoTitulo = 'DESHUMIDIFICANDO';
            razon = `Exceso de humedad (${telemetria.humedad_promedio?.toFixed(1)}% > ${crop?.hum_ideal_max}%) → Extractor ON`;
          }

          if (telemetria.fogger_on) {
            estadoTitulo = 'ENFRIANDO / HUMIDIFICANDO';
            razon += ' + Niebla ON (Enfriamiento evaporativo)';
          }

          return {
            estado: estadoTitulo,
            mensaje: `Sistema compensando: ${razon}`,
            colorClass: 'text-blue-400 bg-blue-950/30 border-blue-500/50',
            Icon: AlertTriangle,
            isCriticalPulse: false
          };
        }

        case 'HUMIDIFICANDO': {
          let razon = 'Niebla ON activa';
          const humBaja = crop && telemetria.humedad_promedio != null && telemetria.humedad_promedio < crop.hum_ideal_min;
          
          const calcVpd = (t: number, h: number) => {
            const svp = 0.61078 * Math.exp((17.27 * t) / (t + 237.3));
            return svp * (1 - (h / 100.0));
          };
          const vpdMax = crop ? calcVpd(crop.temp_ideal_max, crop.hum_ideal_min) : 1.20;
          const vpdAlto = telemetria.vpd != null && telemetria.vpd > vpdMax;

          if (humBaja && vpdAlto) {
            razon = `Humedad baja (${telemetria.humedad_promedio?.toFixed(1)}% < ${crop?.hum_ideal_min}%) y VPD elevado (${telemetria.vpd?.toFixed(2)} > ${vpdMax.toFixed(2)} kPa)`;
          } else if (humBaja) {
            razon = `Humedad ambiental baja (${telemetria.humedad_promedio?.toFixed(1)}% < ${crop?.hum_ideal_min}%)`;
          } else if (vpdAlto) {
            razon = `Déficit de Presión de Vapor (VPD) alto (${telemetria.vpd?.toFixed(2)} > ${vpdMax.toFixed(2)} kPa)`;
          } else {
            razon = 'Estabilización de microclima hídrico';
          }

          let estadoTitulo = 'HUMIDIFICANDO';
          if (telemetria.heater_on) {
            razon += ' + Calefactor ON (PID)';
          }

          return {
            estado: estadoTitulo,
            mensaje: `Sistema compensando: ${razon} → Niebla ON`,
            colorClass: 'text-cyan-400 bg-cyan-950/30 border-cyan-500/50',
            Icon: AlertTriangle,
            isCriticalPulse: false
          };
        }

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
            mensaje: 'Variables en niveles críticos, mitigación y refrigeración activa.',
            colorClass: 'text-red-500 bg-red-950/30 border-red-500/50',
            Icon: AlertOctagon,
            isCriticalPulse: true
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
