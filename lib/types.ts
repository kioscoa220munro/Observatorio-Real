export type ViewMode = 'points' | 'heat' | 'network';

export type Category = {
  id: string;
  label: string;
  icon: string;
  color: string;
};

export type Report = {
  id: string;
  lng: number;
  lat: number;
  category: string;
  magnitude: number;
  description: string;
  evidence_urls: string[];
  status: string;
  corroborations: number;
  created_at: string;
};

/**
 * Magnitud automática según la cantidad de usuarios que confirmaron el evento.
 * 0–1 = M1, 2–4 = M2, 5–9 = M3, 10–24 = M4, 25+ = M5.
 */
export function magnitudeFromVotes(votes: number): number {
  if (votes >= 25) return 5;
  if (votes >= 10) return 4;
  if (votes >= 5) return 3;
  if (votes >= 2) return 2;
  return 1;
}

export const CATEGORIES: Category[] = [
  { id: 'transito', label: 'Tránsito y calles', icon: '🚦', color: '#e33b47' },
  { id: 'agua', label: 'Agua e inundación', icon: '💧', color: '#259bc1' },
  { id: 'alumbrado', label: 'Alumbrado', icon: '💡', color: '#e1a72c' },
  { id: 'basura', label: 'Basura', icon: '🗑️', color: '#64748b' },
  { id: 'arbol', label: 'Árbol caído o peligroso', icon: '🌳', color: '#35a66f' },
  { id: 'espacio_verde', label: 'Espacio verde', icon: '🌿', color: '#35a66f' },
  { id: 'semaforo', label: 'Semáforo', icon: '🚥', color: '#d65c35' },
  { id: 'accesibilidad', label: 'Accesibilidad', icon: '♿', color: '#6b5bd2' },
  { id: 'infraestructura', label: 'Infraestructura', icon: '🏗️', color: '#8a6a4a' },
  { id: 'servicio', label: 'Servicio municipal', icon: '🏛️', color: '#258bd6' },
];
