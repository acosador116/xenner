import { createSignal, For, onMount, Show } from "solid-js";

import { FONT_OPTIONS } from "../../data/appearance";
import {
  SETTINGS_SECTIONS,
  THEME_MODES,
  type SettingsNavigationItem,
  type SettingsSection,
} from "../../data/settings";
import styles from "../../styles/components/SettingsModal.module.css";
import type { Appearance } from "../../types/appearance";
import type { SkinInfo } from "../../types/skin";
import { CheckIcon, CloseIcon, InfoIcon } from "../ui/Icons";
import { IconButton } from "../ui/IconButton";
import { ModalBackdrop } from "../ui/ModalBackdrop";
import { SkinCreator } from "./SkinCreator";

export interface SettingsModalProps {
  skins: SkinInfo[];
  activeSkin: string;
  loading: boolean;
  appearance: Appearance;
  onAppearanceChange(appearance: Appearance): void;
  onSkinChange(id: string): void;
  onSkinCreated(skin: SkinInfo): void;
  onClose(): void;
}

interface AppearanceField {
  key: "editorSize" | "lineHeight" | "contentWidth";
  label: string;
  hint: string;
  min: number;
  max: number;
  step: number;
  format(value: number): string;
}

const APPEARANCE_FIELDS: readonly AppearanceField[] = [
  {
    key: "editorSize",
    label: "Tamaño del texto",
    hint: "Del cuerpo de la nota",
    min: 12,
    max: 24,
    step: 1,
    format: (value) => `${value} px`,
  },
  {
    key: "lineHeight",
    label: "Interlineado",
    hint: "Separación entre líneas",
    min: 1.2,
    max: 2.2,
    step: 0.05,
    format: (value) => value.toFixed(2),
  },
  {
    key: "contentWidth",
    label: "Ancho de lectura",
    hint: "Columna del texto, entre 560 y 1200 px",
    min: 560,
    max: 1200,
    step: 20,
    format: (value) => `${value} px`,
  },
];

export function SettingsModal(props: SettingsModalProps) {
  const [section, setSection] = createSignal<SettingsSection>("appearance");
  let dialog: HTMLDivElement | undefined;

  onMount(() => queueMicrotask(() => dialog?.focus()));

  const current = (): SettingsNavigationItem => {
    return SETTINGS_SECTIONS.find((item) => item.id === section()) ?? SETTINGS_SECTIONS[0];
  };

  const fieldValue = (field: AppearanceField): number => props.appearance[field.key];

  const setField = (field: AppearanceField, value: number): void => {
    props.onAppearanceChange({ ...props.appearance, [field.key]: value });
  };

  // La skin embebida es la que trae la paleta clara/oscura en global.css, así
  // que solo tiene sentido alternar el modo cuando no hay una skin encima.
  const showThemeModes = (): boolean => props.activeSkin === "";

  return (
    <ModalBackdrop onBackdropPointerDown={props.onClose}>
      <div
        ref={(element) => {
          dialog = element;
        }}
        class={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        tabindex={-1}
        onKeyDown={(event) => {
          if (event.key === "Escape") props.onClose();
        }}
      >
        <nav class={styles.nav} aria-label="Secciones de configuración">
          <div class={styles.brand}>Configuración</div>
          <For each={SETTINGS_SECTIONS}>
            {(item) => (
              <button
                type="button"
                class={`${styles.section} ${section() === item.id ? styles.sectionActive : ""}`}
                aria-current={section() === item.id ? "page" : undefined}
                onClick={() => setSection(item.id)}
              >
                <strong>{item.label}</strong>
                <small>{item.hint}</small>
              </button>
            )}
          </For>
          <p class={styles.navFooter}>Los cambios se aplican al instante.</p>
        </nav>

        <section class={styles.content}>
          <header class={styles.header}>
            <div>
              <p>Preferencias</p>
              <h2 id="settings-title">{current().label}</h2>
            </div>
            <IconButton aria-label="Cerrar configuración" onClick={props.onClose}>
              <CloseIcon />
            </IconButton>
          </header>

          <div class={styles.scroll}>
            <div class={styles.body}>
              <Show when={section() === "appearance"}>
                <div class={styles.group}>
                  <h3 class={styles.groupTitle}>Modo de color</h3>
                  <p class={styles.groupHint}>
                    El tema base vive en <code>global.css</code> y cambia con
                    esta preferencia. Las skins de arriba tienen su propia paleta.
                  </p>
                  <Show
                    when={showThemeModes()}
                    fallback={
                      <div class={styles.notice}>
                        <InfoIcon />
                        <span>
                          Activa <strong>Xenner</strong> para alternar entre modo claro y
                          oscuro. Con una skin instalada se usa su paleta.
                        </span>
                      </div>
                    }
                  >
                    <div class={styles.card}>
                      <div class={styles.row}>
                        <div class={styles.rowLabel}>
                          <strong>Tema</strong>
                          <small>Sigue al sistema o fíjalo</small>
                        </div>
                        <div class={styles.rowControl}>
                          <div class={styles.segmented} role="radiogroup" aria-label="Modo de color">
                            <For each={THEME_MODES}>
                              {(mode) => (
                                <button
                                  type="button"
                                  role="radio"
                                  aria-checked={props.appearance.mode === mode.id}
                                  onClick={() =>
                                    props.onAppearanceChange({ ...props.appearance, mode: mode.id })
                                  }
                                >
                                  {mode.label}
                                </button>
                              )}
                            </For>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Show>
                </div>

                <div class={styles.group}>
                  <h3 class={styles.groupTitle}>Tipografías</h3>
                  <p class={styles.groupHint}>
                    La de la interfaz afecta a paneles y menús; la del editor, al texto de las
                    notas.
                  </p>
                  <div class={styles.card}>
                    <div class={styles.row}>
                      <label class={styles.rowLabel} for="ui-font">
                        <strong>Interfaz</strong>
                        <small>Botones, menús y barras</small>
                      </label>
                      <div class={styles.rowControl}>
                        <select
                          id="ui-font"
                          class={`${styles.input} ${styles.select}`}
                          value={props.appearance.uiFont}
                          onChange={(event) =>
                            props.onAppearanceChange({
                              ...props.appearance,
                              uiFont: event.currentTarget.value,
                            })
                          }
                        >
                          <For each={FONT_OPTIONS}>
                            {(font) => <option value={font.value}>{font.label}</option>}
                          </For>
                        </select>
                      </div>
                    </div>
                    <div class={styles.row}>
                      <label class={styles.rowLabel} for="editor-font">
                        <strong>Editor</strong>
                        <small>El cuerpo de la nota</small>
                      </label>
                      <div class={styles.rowControl}>
                        <select
                          id="editor-font"
                          class={`${styles.input} ${styles.select}`}
                          value={props.appearance.editorFont}
                          onChange={(event) =>
                            props.onAppearanceChange({
                              ...props.appearance,
                              editorFont: event.currentTarget.value,
                            })
                          }
                        >
                          <For each={FONT_OPTIONS}>
                            {(font) => <option value={font.value}>{font.label}</option>}
                          </For>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div class={styles.group}>
                  <h3 class={styles.groupTitle}>Lectura</h3>
                  <p class={styles.groupHint}>Se aplican solo a la nota abierta.</p>
                  <div class={styles.card}>
                    <For each={APPEARANCE_FIELDS}>
                      {(field) => (
                        <div class={styles.row}>
                          <label class={styles.rowLabel} for={`appearance-${field.key}`}>
                            <strong>{field.label}</strong>
                            <small>{field.hint}</small>
                          </label>
                          <div class={styles.rowControl}>
                            <input
                              id={`appearance-${field.key}`}
                              class={styles.range}
                              type="range"
                              min={field.min}
                              max={field.max}
                              step={field.step}
                              value={fieldValue(field)}
                              onInput={(event) =>
                                setField(field, Number(event.currentTarget.value))
                              }
                            />
                            <output>{field.format(fieldValue(field))}</output>
                          </div>
                        </div>
                      )}
                    </For>
                  </div>
                </div>
              </Show>

              <Show when={section() === "skins"}>
                <div class={styles.group}>
                  <h3 class={styles.groupTitle}>Skins</h3>
                  <p class={styles.groupHint}>
                    Una skin es un conjunto de archivos <code>.txt</code> que sustituyen a las
                    variables <code>--skin-*</code> de <code>global.css</code>.
                  </p>
                  <ul class={styles.skinList}>
                    <li>
                      <button
                        type="button"
                        class={`${styles.skinCard} ${props.activeSkin === "" ? styles.skinCardActive : ""}`}
                        disabled={props.loading}
                        onClick={() => props.onSkinChange("")}
                      >
                        <span class={styles.skinCardCopy}>
                          <strong>Xenner</strong>
                          <small>Base · claro y oscuro</small>
                        </span>
                        <Show when={props.activeSkin === ""}>
                          <span class={styles.check}>
                            <CheckIcon />
                          </span>
                        </Show>
                      </button>
                    </li>
                    <For each={props.skins}>
                      {(skin) => (
                        <li>
                          <button
                            type="button"
                            class={`${styles.skinCard} ${props.activeSkin === skin.id ? styles.skinCardActive : ""}`}
                            disabled={props.loading}
                            onClick={() => props.onSkinChange(skin.id)}
                          >
                            <span class={styles.skinCardCopy}>
                              <strong>{skin.name}</strong>
                              <small>
                                {skin.origin === "user"
                                  ? "Tuya"
                                  : skin.author
                                    ? `Del sistema · ${skin.author}`
                                    : "Del sistema"}
                              </small>
                            </span>
                            <Show when={props.activeSkin === skin.id}>
                              <span class={styles.check}>
                                <CheckIcon />
                              </span>
                            </Show>
                          </button>
                        </li>
                      )}
                    </For>
                  </ul>
                </div>
              </Show>

              <Show when={section() === "create"}>
                <div class={styles.group}>
                  <h3 class={styles.groupTitle}>Creador de skins</h3>
                  <p class={styles.groupHint}>
                    El resultado se guarda como TXT editable y no admite CSS arbitrario.
                  </p>
                  <div class={styles.embed}>
                    <SkinCreator onCreated={props.onSkinCreated} />
                  </div>
                </div>
              </Show>
            </div>
          </div>
        </section>
      </div>
    </ModalBackdrop>
  );
}
