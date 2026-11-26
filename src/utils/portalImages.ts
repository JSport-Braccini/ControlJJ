import heroVolleyballImg from '../assets/images/portal_hero_volleyball_1795730718985.jpg';
import pastTrophyImg from '../assets/images/past_champ_trophy_1795730719010.jpg';
import pastActionImg from '../assets/images/past_champ_action_1795730720265.jpg';
import pastCrowdImg from '../assets/images/past_champ_crowd_1795730720238.jpg';

export type PortalPresetKey =
  | 'preset:hero_volleyball'
  | 'preset:past_trophy'
  | 'preset:past_action'
  | 'preset:past_crowd';

export const PORTAL_PRESET_OPTIONS: { key: PortalPresetKey; label: string; src: string }[] = [
  { key: 'preset:hero_volleyball', label: 'Coliseo Principal (Panorámica)', src: heroVolleyballImg },
  { key: 'preset:past_trophy', label: 'Entrega de Trofeo Campeón', src: pastTrophyImg },
  { key: 'preset:past_action', label: 'Acción en Cancha / Remate', src: pastActionImg },
  { key: 'preset:past_crowd', label: 'Tribunas y Hinchada Llena', src: pastCrowdImg },
];

export function resolvePortalImage(
  imageUrl?: string,
  fallbackPreset: PortalPresetKey = 'preset:hero_volleyball'
): string {
  const clean = (imageUrl || '').trim();
  if (!clean) {
    return PORTAL_PRESET_OPTIONS.find((p) => p.key === fallbackPreset)?.src || heroVolleyballImg;
  }
  const matchedPreset = PORTAL_PRESET_OPTIONS.find((p) => p.key === clean);
  if (matchedPreset) {
    return matchedPreset.src;
  }
  return clean;
}

/**
 * Comprime cualquier imagen subida por el administrador vía <canvas> para mantener
 * el documento sincronizado en Firestore cómodamente por debajo del límite de 1 MB.
 */
export function compressImageForPortal(file: File, maxWidth = 1200, quality = 0.78): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer la imagen seleccionada.'));
    reader.onload = (ev) => {
      const rawDataUrl = ev.target?.result as string;
      const img = new Image();
      img.onerror = () => resolve(rawDataUrl);
      img.onload = () => {
        try {
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;
          if (width > maxWidth) {
            const scale = maxWidth / width;
            width = Math.round(width * scale);
            height = Math.round(height * scale);
          }
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, width);
          canvas.height = Math.max(1, height);
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(rawDataUrl);
            return;
          }
          ctx.fillStyle = '#0A192F';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } catch {
          resolve(rawDataUrl);
        }
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  });
}
