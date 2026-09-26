// Persistencia del historial de notas.
//
// Dónde vive: `localStorage`. Motivo: el historial es una sesión local de
// "últimos cambios", no un backup. Los archivos .md siguen siendo la fuente de
// verdad y el historial solo guarda copias de lo guardado desde Xenner. Así el
// mismo código funciona en Tauri y en la vista previa del navegador, y una
// skin o un workspace nuevo no arrastran historia ajena.
//
// Límite duro: si no cabe, se recorta la nota menos reciente. Un historial que
// rompe el arranque de la app sería peor que no tener historial.

import {
  HISTORY_VERSIONS,
  latestVersionAt,
  type NoteVersion,
  pruneStore,
  pushVersion,
} from "../workspace/history";

const STORAGE_KEY = "xenner:note-history:v1";
/** Techo conservador del almacén; localStorage suele andar por 5 MB. */
const MAX_STORE_CHARS = 1_500_000;

export type NoteHistoryStore = Record<string, NoteVersion[]>;

function emptyStore(): NoteHistoryStore {
  return {};
}

function readStore(): NoteHistoryStore {
  if (typeof localStorage === "undefined") return emptyStore();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return emptyStore();
    const store: NoteHistoryStore = {};
    for (const [path, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!Array.isArray(value)) continue;
      const versions = value.filter(isNoteVersion).slice(-HISTORY_VERSIONS);
      if (versions.length > 0) store[path] = versions;
    }
    return store;
  } catch {
    return emptyStore();
  }
}

function isNoteVersion(value: unknown): value is NoteVersion {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<NoteVersion>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.at === "number" &&
    Number.isFinite(candidate.at) &&
    typeof candidate.body === "string"
  );
}

function storeWeight(store: NoteHistoryStore): number {
  let total = 0;
  for (const versions of Object.values(store)) {
    for (const version of versions) total += version.body.length;
  }
  return total;
}

/** Recorta las notas menos recientes hasta que el almacén vuelva a caber. */
function fitStore(store: NoteHistoryStore): NoteHistoryStore {
  let next = pruneStore(store);
  if (storeWeight(next) <= MAX_STORE_CHARS) return next;

  const ordered = Object.entries(next).sort(
    (left, right) => latestVersionAt(right[1]) - latestVersionAt(left[1]),
  );
  for (let index = ordered.length - 1; index >= 1; index -= 1) {
    const [path] = ordered[index];
    const trimmed = { ...next };
    delete trimmed[path];
    next = trimmed;
    if (storeWeight(next) <= MAX_STORE_CHARS) break;
  }
  return next;
}

function writeStore(store: NoteHistoryStore): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fitStore(store)));
  } catch {
    // Cuota llena o almacenamiento no disponible: el historial es opcional y
    // nunca puede impedir seguir escribiendo.
  }
}

/** Devuelve las versiones de la nota, de más reciente a más antigua. */
export function readNoteHistory(path: string): NoteVersion[] {
  const versions = readStore()[path] ?? [];
  return [...versions].sort((left, right) => right.at - left.at);
}

export function recordNoteVersion(path: string, body: string, at = Date.now()): void {
  if (!path) return;
  try {
    const store = readStore();
    store[path] = pushVersion(store[path] ?? [], body, at);
    writeStore(store);
  } catch {
    // Idempotente por diseño: si falla, el siguiente guardado lo reintenta.
  }
}

/**
 * Deja constancia del estado con el que se abre una nota. Solo actúa la primera
 * vez: así el historial empieza por el contenido original, incluso si la nota
 * se creó o editó fuera de Xenner.
 */
export function seedNoteHistory(path: string, body: string, at = Date.now()): void {
  if (!path) return;
  try {
    const store = readStore();
    if (store[path]?.length) return;
    store[path] = pushVersion([], body, at);
    writeStore(store);
  } catch {
    // El historial es opcional.
  }
}

export function clearNoteHistory(path: string): void {
  try {
    const store = readStore();
    if (!(path in store)) return;
    delete store[path];
    writeStore(store);
  } catch {
    // Borrar el historial nunca es crítico.
  }
}

export function forgetNoteHistory(paths: readonly string[]): void {
  try {
    const store = readStore();
    let changed = false;
    for (const path of paths) {
      if (path in store) {
        delete store[path];
        changed = true;
      }
    }
    if (changed) writeStore(store);
  } catch {
    // Igual que clearNoteHistory.
  }
}

