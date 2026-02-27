import { UserNode } from './user';

// Tipos de cosas que pueden pasar
export type HistoryEventType =
  | 'DETECTED_UNFOLLOWER' // El escáner detectó que te dejó de seguir
  | 'YOU_UNFOLLOWED' // Tú le diste al botón de Unfollow a través de la app
  | 'WHITELISTED' // Lo protegiste (movido a whitelist)
  | 'UNWHITELISTED'; // Lo desprotegiste

export interface HistoryEvent {
  id: string; // Un ID único para el evento (uuid)
  timestamp: number; // Fecha en milisegundos
  type: HistoryEventType; // Qué pasó
  user: UserNode; // A quién le pasó (guardamos la foto y nombre de ese momento)
}

// Estructura de estadísticas para el Dashboard (futuro)
export interface HistoryStats {
  totalUnfollowedByYou: number;
  totalTraitorsDetected: number;
  totalWhitelisted: number;
  lastScanDate: number | null;
}
