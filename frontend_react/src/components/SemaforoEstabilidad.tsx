import React, { useMemo } from 'react';
import type { TelemetriaFungi, ReglaTermodinamica } from '../types/cultivo';
import { CheckCircle2, AlertTriangle, AlertOctagon } from 'lucide-react';

interface Props {
  telemetria: TelemetriaFungi | null;
  reglas: ReglaTermodinamica[] | null;
  modo_operacion: 'AUTO' | 'MANUAL';
}

export const SemaforoEstabilidad: React.FC<Props> = ({ telemetria, reglas, modo_operacion }) => {
  const { estado, mensaje, colorClass, Icon } = useMemo(() => {
    if (!telemetria) {
      return {
        estado: 'DESCONECTADO',
        mensaje: 'Esperando datos del nodo...',
        colorClass: 'text-neutral-500 bg-neutral-900/50 border-neutral-800',
        Icon: AlertOctagon
      };
    }

    if (!telemetria.dht_ok || !telemetria.analogico_ok) {
      return {
        estado: 'FALLO CRÍTICO',
        mensaje: 'Pérdida de comunicación con sensores. Failsafe activado.',
        colorClass: 'text-red-400 bg-red-950/30 border-red-500/50',
        Icon: AlertOctagon
      };
    }

    if (modo_operacion === 'MANUAL') {
      return {
        estado: 'MODO OVERRIDE',
        mensaje: 'Control manual activo. Reglas ignoradas.',
        colorClass: 'text-orange-400 bg-orange-950/30 border-orange-500/50',
        Icon: AlertTriangle
      };
    }

    // Evaluar reglas dinámicas
    if (reglas && reglas.length > 0) {
      let reglasActivas = 0;
      let variablesCorrigiendo = new Set<string>();

      for (const regla of reglas) {
        let valorActual = 0;
        switch (regla.var) {
          case 'TEMP': valorActual = telemetria.temp_aire || 0; break;
          case 'HUMEDAD': valorActual = telemetria.humedad_aire || 0; break;
          case 'CO2': valorActual = telemetria.co2_ppm || 0; break;
          case 'VPD': valorActual = telemetria.vpd || 0; break;
        }

        let condicionCumplida = false;
        if (regla.op === 'MAYOR_QUE' && valorActual > regla.val) condicionCumplida = true;
        if (regla.op === 'MENOR_QUE' && valorActual < regla.val) condicionCumplida = true;
        if (regla.op === 'IGUAL' && valorActual === regla.val) condicionCumplida = true;

        if (condicionCumplida) {
          reglasActivas++;
          variablesCorrigiendo.add(regla.var);
        }
      }

      if (reglasActivas > 0) {
        const vars = Array.from(variablesCorrigiendo).join(', ');
        return {
          estado: 'CORRIGIENDO CLIMA',
          mensaje: `Sistema compensando parámetros: ${vars}`,
          colorClass: 'text-amber-400 bg-amber-950/30 border-amber-500/50',
          Icon: AlertTriangle
        };
      }
    }

    return {
      estado: 'CLIMA ESTABLE',
      mensaje: 'Todas las variables dentro del rango ideal',
      colorClass: 'text-emerald-400 bg-emerald-950/30 border-emerald-500/50',
      Icon: CheckCircle2
    };

  }, [telemetria, reglas, modo_operacion]);

  return (
    <div className={`flex items-center gap-4 p-4 rounded-xl border backdrop-blur-sm shadow-lg ${colorClass} transition-all duration-500`}>
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
