// Historial de versiones de una nota — dominio puro, sin DOM ni servicios.
//
// La nota se guarda en un archivo que la persona puede tocar desde fuera, así
// que este historial NO sustituye a un control de versiones: es una sesión de
// "últimos cambios" para deshacer lo que se acaba de escribir desde Xenner.

export interface NoteVersion {
  /** Identificador estable para poder referenciarlo desde la interfaz. */
  id: string;
  /** Epoch en milisegundos del guardado. */
  at: number;
  /** Cuerpo Markdown exacto de la nota en ese momento. */
  body: string;
}

/** Versiones conservadas por nota. */
export const HISTORY_VERSIONS = 25;
/** Notas con historial conservadas; el resto se descarta por antigüedad. */
export const HISTORY_NOTES = 30;
/**
 * Dos guardados dentro de esta ventana se funden en una sola versión. Escribir
 * produce un guardado cada pocos segundos; sin esta ventana el historial se
 * llenaría de pasos de una letra y no serviría para volver atrás.
 */
export const HISTORY_COALESCE_MS = 45_000;

let sequence = 0;

function nextId(at: number): string {
  sequence += 1;
  return `v-${at.toString(36)}-${sequence.toString(36)}`;
}

/**
 * Inserta una versión respetando el orden (más reciente al final), sin
 * duplicar el cuerpo actual y fusionando guardados muy próximos.
 *
 * La fusión conserva la marca de tiempo del INICIO de la ráfaga. Si se
 * actualizara en cada guardado, escribir sin parar compararía siempre contra
 * el guardado anterior y el historial se quedaría en una única versión para
 * siempre.
 */
export function pushVersion(
  versions: readonly NoteVersion[],
  body: string,
  at: number,
): NoteVersion[] {
  const last = versions[versions.length - 1];
  if (last && last.body === body) return [...versions];

  if (last && at - last.at < HISTORY_COALESCE_MS) {
    return [...versions.slice(0, -1), { id: nextId(last.at), at: last.at, body }];
  }
  return [...versions, { id: nextId(at), at, body }].slice(-HISTORY_VERSIONS);
}

/** Mantiene el almacén acotado: primero las notas más recientemente tocadas. */
export function pruneStore(
  store: Record<string, NoteVersion[]>,
  maxNotes = HISTORY_NOTES,
): Record<string, NoteVersion[]> {
  const entries = Object.entries(store).filter(([, versions]) => versions.length > 0);
  if (entries.length <= maxNotes) return store;
  entries.sort((left, right) => {
    const leftAt = left[1][left[1].length - 1]?.at ?? 0;
    const rightAt = right[1][right[1].length - 1]?.at ?? 0;
    return rightAt - leftAt;
  });
  return Object.fromEntries(entries.slice(0, maxNotes));
}

export function latestVersionAt(versions: readonly NoteVersion[]): number {
  return versions[versions.length - 1]?.at ?? 0;
}

/** Diferencia de tamaño en caracteres respecto a la versión anterior. */
export function versionDelta(version: NoteVersion, previous: NoteVersion | null): number {
  if (!previous) return 0;
  return version.body.length - previous.body.length;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function formatVersionTime(at: number, now: number): string {
  const elapsed = Math.max(0, now - at);
  if (elapsed < 45_000) return "hace un momento";
  if (elapsed < HOUR) {
    const minutes = Math.round(elapsed / MINUTE);
    return `hace ${minutes} min`;
  }
  if (elapsed < DAY) {
    const hours = Math.round(elapsed / HOUR);
    return `hace ${hours} h`;
  }
  if (elapsed < 7 * DAY) {
    const days = Math.round(elapsed / DAY);
    return `hace ${days} ${days === 1 ? "día" : "días"}`;
  }
  return new Date(at).toLocaleDateString("es");
}

export function formatDelta(delta: number): string {
  if (delta === 0) return "sin cambios de tamaño";
  const sign = delta > 0 ? "+" : "−";
  return `${sign}${Math.abs(delta)} caracteres`;
}

/** Vista previa de una línea: sin marcas Markdown ni espacios repetidos. */
export function versionPreview(body: string, limit = 120): string {
  const text = body
    .replace(/```[\s\S]*?```/g, " (código) ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " (imagen) ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/[*_~`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= limit) return text;
  return `${text.slice(0, limit).trimEnd()}…`;
}
