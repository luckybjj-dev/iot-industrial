import { ref, get, set } from 'firebase/database';
import { database } from '../config/firebase';

export interface TelegramConfig {
  enabled: boolean;
  botToken: string;
  chatIds: string[]; // Soporta múltiples destinatarios (socios, grupos)
}

export type AlertLevel = 'P0' | 'P1' | 'P2';

// Registro en memoria de últimas alertas enviadas para control anti-spam (cooldown)
const lastAlertTimes: Record<string, number> = {};

// Tiempos de Cooldown en milisegundos
const COOLDOWNS: Record<AlertLevel, number> = {
  P0: 15 * 60 * 1000,   // 15 minutos para alertas críticas P0
  P1: 2 * 60 * 60 * 1000, // 2 horas para advertencias P1
  P2: 0                 // Inmediato para leads comerciales
};

/**
 * Obtiene la configuración de Telegram desde Firebase RTDB (/system/notifications/telegram)
 */
export async function getTelegramConfig(): Promise<TelegramConfig> {
  try {
    const configRef = ref(database, 'system/notifications/telegram');
    const snapshot = await get(configRef);
    if (snapshot.exists()) {
      return snapshot.val() as TelegramConfig;
    }
  } catch (error) {
    console.warn('[NotificationService] Error leyendo configuración de Telegram:', error);
  }

  // Configuración por defecto
  return {
    enabled: true,
    botToken: '',
    chatIds: []
  };
}

/**
 * Guarda o actualiza la configuración de Telegram en Firebase RTDB
 */
export async function saveTelegramConfig(config: TelegramConfig): Promise<void> {
  const configRef = ref(database, 'system/notifications/telegram');
  await set(configRef, config);
}

/**
 * Envía un mensaje vía HTTP a la API de Telegram con formato Markdown
 */
async function dispatchToTelegram(botToken: string, chatId: string, message: string): Promise<boolean> {
  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: false
      })
    });

    const data = await response.json();
    return data.ok === true;
  } catch (err) {
    console.error(`[NotificationService] Error despachando a Telegram chat ${chatId}:`, err);
    return false;
  }
}

/**
 * Envía una alerta inteligente con filtro anti-spam / cooldown
 */
export async function sendSmartAlert(
  key: string,
  level: AlertLevel,
  title: string,
  body: string
): Promise<boolean> {
  const now = Date.now();
  const lastSent = lastAlertTimes[key] || 0;
  const cooldown = COOLDOWNS[level];

  // Filtro Anti-Spam: Si aún está en periodo de cooldown, se silencia
  if (now - lastSent < cooldown) {
    console.log(`[NotificationService] Alerta "${key}" suprimida por cooldown anti-spam (${Math.round((cooldown - (now - lastSent)) / 1000)}s restantes).`);
    return false;
  }

  const config = await getTelegramConfig();
  if (!config.enabled || !config.botToken || !config.chatIds || config.chatIds.length === 0) {
    console.log('[NotificationService] Telegram no configurado o deshabilitado.');
    return false;
  }

  const icon = level === 'P0' ? '🚨' : level === 'P1' ? '⚠️' : '📢';
  const levelBadge = level === 'P0' ? '<b>[CRÍTICO P0]</b>' : level === 'P1' ? '<b>[ADVERTENCIA P1]</b>' : '<b>[COMERCIAL P2]</b>';

  const formattedMessage = `${icon} <b>AgriEdge OS — Alerta de Sistema</b>\n${levelBadge} <b>${title}</b>\n\n${body}\n\n⏰ <i>${new Date().toLocaleString()}</i>\n🌐 <a href="https://invernadero-industrial.web.app">Abrir SCADA Dashboard</a>`;

  let anySuccess = false;
  for (const chatId of config.chatIds) {
    if (!chatId.trim()) continue;
    const ok = await dispatchToTelegram(config.botToken, chatId.trim(), formattedMessage);
    if (ok) anySuccess = true;
  }

  if (anySuccess) {
    lastAlertTimes[key] = now;
  }

  return anySuccess;
}

/**
 * Notificación instantánea de nuevo prospecto comercial
 */
export async function notifyNewLead(lead: { name: string; email: string; cropType: string; message: string }): Promise<void> {
  const cropText = 
    lead.cropType === 'fungi' ? '🍄 Micología Comercial' :
    lead.cropType === 'plantae' ? '🌱 Horticultura Hidropónica' :
    lead.cropType === 'cannabis' ? '🌿 Cannabis Medicinal' : '⚙️ Proyecto a Medida';

  const body = `👤 <b>Nombre / Empresa:</b> ${lead.name}\n📧 <b>Correo:</b> ${lead.email}\n🌾 <b>Rubro:</b> ${cropText}\n📝 <b>Requerimientos:</b>\n<i>${lead.message}</i>`;

  await sendSmartAlert(
    `lead_${Date.now()}`,
    'P2',
    'Nueva Solicitud Comercial Recibida',
    body
  );
}

/**
 * Enviar mensaje de prueba
 */
export async function sendTestNotification(botToken: string, chatId: string): Promise<{ success: boolean; message?: string }> {
  try {
    const testMsg = `🌿 <b>AgriEdge OS — Notificación de Prueba</b>\n✅ <b>Conexión Exitosa con Telegram Bot</b>\n\nEl canal de alertas en tiempo real está 100% operativo para recibir:\n• 🚨 Eventos Críticos P0 (Safe Mode / Emergencias Térmicas)\n• ⚠️ Advertencias P1 (Sensores y VPD)\n• 👥 Nuevos Prospectos Comerciales\n\n⏰ <i>${new Date().toLocaleString()}</i>`;

    const ok = await dispatchToTelegram(botToken, chatId, testMsg);
    if (ok) {
      return { success: true };
    } else {
      return { success: false, message: 'Telegram rechazó el envío. Verifica el Bot Token y Chat ID.' };
    }
  } catch (err: any) {
    return { success: false, message: err?.message || 'Error de conexión con Telegram API' };
  }
}
