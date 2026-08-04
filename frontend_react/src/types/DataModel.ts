export interface NodeStatus {
  lastSeen: number;
  isOnline: boolean;
  ipAddress?: string;
  firmwareVersion?: string;
}

export interface PlantNode {
  id: string; // Ej: "ESP32_01"
  macAddress: string;
  name: string; // Nombre amigable para el operador
  type: 'ESP32_AGNOSTIC' | 'SENSOR_ONLY' | 'RELAY_ONLY';
  status: NodeStatus;
  
  // Cultivo Activo (Novedad)
  activeProfile?: {
    profileId: string;
    phaseId: string;
    startedAt: number; // Unix timestamp
  };
}

export interface Zone {
  id: string;
  name: string; // Ej: "Carpa de Fructificación A"
  nodes: Record<string, PlantNode>;
}

export interface Room {
  id: string;
  name: string; // Ej: "Nave de Cultivo N° 1"
  zones: Record<string, Zone>;
}

export interface Farm {
  id: string;
  name: string; // Ej: "AgroFungi Sur S.A."
  rooms: Record<string, Room>;
}

// Interfaz raíz que manejará todo el estado topológico en React o Firebase
export interface IndustrialTopology {
  farms: Record<string, Farm>;
}
