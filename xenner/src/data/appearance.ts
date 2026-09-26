import type { Appearance, FontOption } from "../types/appearance";

export const FONT_OPTIONS: readonly FontOption[] = [
  { id: "system", label: "Sistema", value: "system-ui, sans-serif" },
  { id: "roboto", label: "Roboto / Noto Sans", value: 'Roboto, "Noto Sans", system-ui, sans-serif' },
  { id: "inter", label: "Inter", value: 'Inter, "Noto Sans", system-ui, sans-serif' },
  { id: "serif", label: "Serif (de libro)", value: 'Georgia, "Noto Serif", serif' },
  { id: "mono", label: "Monoespaciada", value: "ui-monospace, SFMono-Regular, Menlo, monospace" },
];

/**
 * Valores con los que arranca Xenner. Vive en `data/` porque es información
 * estática: la usa el servicio para sanear lo guardado y el modal para saber
 * cuándo algo se ha apartado de lo normal y ofrecer "Restablecer".
 */
export const DEFAULT_APPEARANCE: Appearance = {
  mode: "system",
  uiFont: FONT_OPTIONS[0].value,
  editorFont: FONT_OPTIONS[0].value,
  editorSize: 16,
  lineHeight: 1.7,
  contentWidth: 860,
};

/** ¿Alguna preferencia se ha cambiado respecto a lo que trae Xenner? */
export function isDefaultAppearance(appearance: Appearance): boolean {
  return (
    appearance.mode === DEFAULT_APPEARANCE.mode &&
    appearance.uiFont === DEFAULT_APPEARANCE.uiFont &&
    appearance.editorFont === DEFAULT_APPEARANCE.editorFont &&
    appearance.editorSize === DEFAULT_APPEARANCE.editorSize &&
    appearance.lineHeight === DEFAULT_APPEARANCE.lineHeight &&
    appearance.contentWidth === DEFAULT_APPEARANCE.contentWidth
  );
}
