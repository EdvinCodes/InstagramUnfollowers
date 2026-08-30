import { UserNode } from './user';

// Tipos de cosas que pueden pasar
export type HistoryEventType =
  | 'DETECTED_UNFOLLOWER'
  | 'YOU_UNFOLLOWED'
  | 'YOU_FOLLOWED'
  | 'WHITELISTED'
  | 'UNWHITELISTED'
  | 'SOFT_BLOCKED'
  | 'REQUEST_CANCELLED';

export interface HistoryEvent {
  id: string; // Un ID único para el evento (uuid)
  timestamp: number; // Fecha en milisegundos
  type: HistoryEventType; // Qué pasó
  user: UserNode; // A quién le pasó (guardamos la foto y nombre de ese momento)
  count?: number; // Resumen diario (solicitudes canceladas)
}

// Estructura de estadísticas para el Dashboard (futuro)
export interface HistoryStats {
  totalUnfollowedByYou: number;
  totalTraitorsDetected: number;
  totalWhitelisted: number;
  totalCancelled: number;
  lastScanDate: number | null;
}
