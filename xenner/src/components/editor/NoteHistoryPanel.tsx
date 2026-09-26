import { createMemo, For, onMount, Show } from "solid-js";

import styles from "../../styles/components/NoteHistoryPanel.module.css";
import {
  formatDelta,
  formatVersionTime,
  HISTORY_VERSIONS,
  type NoteVersion,
  versionDelta,
  versionPreview,
} from "../../workspace/history";
import { Button } from "../ui/Button";
import { ModalBackdrop } from "../ui/ModalBackdrop";
import { CloseIcon, RestoreIcon } from "../ui/Icons";

export interface NoteHistoryPanelProps {
  notePath: string;
  noteName: string;
  versions: NoteVersion[];
  /** Reloj de referencia para las etiquetas "hace X min". */
  now: number;
  busy?: boolean;
  onClose(): void;
  onRestore(version: NoteVersion): void;
  onForget(): void;
}

export function NoteHistoryPanel(props: NoteHistoryPanelProps) {
  // `versions` llega de localStorage, así que se copia para que el contador
  // relativo no dependa de la identidad del array.
  const ordered = createMemo(() => [...props.versions].sort((a, b) => b.at - a.at));
  const isCurrent = (version: NoteVersion): boolean => version === ordered()[0];
  let panel: HTMLElement | undefined;

  // El menú contextual que abre este panel tenía el foco; sin recuperarlo el
  // Tab se iría al documento de fondo y Escape no llegaría al panel.
  onMount(() => panel?.focus({ preventScroll: true }));

  return (
    <ModalBackdrop class={styles.backdrop} onBackdropPointerDown={props.onClose}>
      <section
        ref={(element) => (panel = element)}
        class={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="note-history-title"
        tabIndex={-1}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            props.onClose();
          }
        }}
      >
        <header class={styles.header}>
          <div>
            <h2 id="note-history-title">Últimos cambios</h2>
            <p class={styles.subtitle} title={props.notePath}>{props.noteName}</p>
          </div>
          <button
            type="button"
            class={styles.close}
            aria-label="Cerrar el historial"
            onClick={props.onClose}
          >
            <CloseIcon />
          </button>
        </header>

        <Show
          when={ordered().length > 0}
          fallback={
            <p class={styles.empty}>
              Todavía no hay cambios guardados de esta nota. El historial se llena solo
              conforme se vaya guardando.
            </p>
          }
        >
          <ol class={styles.list}>
            <For each={ordered()}>
              {(version, index) => {
                const previous = (): NoteVersion | null => ordered()[index() + 1] ?? null;
                return (
                  <li class={styles.entry}>
                    <div class={styles.entryMeta}>
                      <span class={styles.when}>
                        {isCurrent(version) ? "Versión actual" : formatVersionTime(version.at, props.now)}
                      </span>
                      <Show when={!isCurrent(version) && versionDelta(version, previous()) !== 0}>
                        <span class={styles.delta}>
                          {formatDelta(versionDelta(version, previous()))}
                        </span>
                      </Show>
                    </div>
                    <p class={styles.preview}>
                      {versionPreview(version.body) || "Nota vacía"}
                    </p>
                    <div class={styles.entryActions}>
                      <Show
                        when={!isCurrent(version)}
                        fallback={<span class={styles.currentBadge}>Guardada</span>}
                      >
                        <Button
                          disabled={props.busy}
                          onClick={() => props.onRestore(version)}
                          title="Escribir este contenido otra vez en el archivo"
                        >
                          <RestoreIcon /> Restaurar
                        </Button>
                      </Show>
                    </div>
                  </li>
                );
              }}
            </For>
          </ol>
        </Show>

        <footer class={styles.footer}>
          <p class={styles.hint}>
            Xenner guarda hasta {HISTORY_VERSIONS} versiones por nota. El archivo{" "}
            <code>.md</code> sigue siendo la fuente de verdad.
          </p>
          <div class={styles.footerActions}>
            <Button disabled={ordered().length === 0 || props.busy} onClick={props.onForget}>
              Borrar historial
            </Button>
            <Button variant="primary" onClick={props.onClose}>Cerrar</Button>
          </div>
        </footer>
      </section>
    </ModalBackdrop>
  );
}
