import { createSignal } from "solid-js";

import { readNoteHistory } from "../services/noteHistory";
import { notifyError, notifySuccess } from "../services/toastService";
import type { NoteVersion } from "../workspace/history";
import { getWorkspace, restoreNoteBody } from "../workspace/store";

// Sesión de "últimos cambios" de una nota. El menú contextual del explorador la
// abre y `NoteHistoryPanel` la dibuja; aquí solo se coordina el estado.
export function useHistoryController() {
  const [path, setPath] = createSignal<string | null>(null);
  const [versions, setVersions] = createSignal<NoteVersion[]>([]);
  const [busy, setBusy] = createSignal(false);
  // Las etiquetas relativas ("hace 3 min") se calculan al abrir el panel; no
  // hace falta un temporizador corriendo mientras está abierto.
  const now = () => Date.now();

  function refresh(): void {
    const current = path();
    if (!current) {
      setVersions([]);
      return;
    }
    setVersions(readNoteHistory(current));
  }

  function open(target: string): void {
    setPath(target);
    refresh();
  }

  function close(): void {
    setPath(null);
    setVersions([]);
  }

  async function restore(version: NoteVersion): Promise<void> {
    const current = path();
    if (!current || busy()) return;
    setBusy(true);
    try {
      const restored = await restoreNoteBody(current, version.body);
      if (restored) notifySuccess("Versión restaurada", "La nota volvió a ese contenido");
      else notifyError("No se pudo restaurar", "Revisa si el archivo cambió fuera de Xenner");
      refresh();
    } finally {
      setBusy(false);
    }
  }

  /** Nombre legible de la nota abierta en el historial. */
  function noteName(): string {
    const current = path();
    if (!current) return "";
    const entry = getWorkspace()?.entries.find((candidate) => candidate.path === current);
    const raw = entry?.name ?? current.split("/").pop() ?? current;
    return raw.replace(/\.md$/i, "");
  }

  return { path, versions, busy, now, open, close, restore, noteName };
}
