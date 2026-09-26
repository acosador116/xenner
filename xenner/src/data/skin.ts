import type { ColorScheme } from "../types/appearance";
import { FONT_OPTIONS } from "./appearance.ts";
import type { SkinColorKey, SkinDraft, SkinPalette, SkinPreset, SkinShadow } from "../types/skin";

/** La pila de la tipografía de sistema: valor por defecto de cualquier tema. */
export const DEFAULT_FONT_VALUE = FONT_OPTIONS[0].value;

export const SKIN_PALETTES: Record<ColorScheme, SkinPalette> = {
  dark: {
    background: "#191919",
    surface: "#202020",
    panel: "#252525",
    text: "#e7e7e4",
    textDim: "#9b9b98",
    border: "#3c3c39",
    accent: "#5b9bd5",
    hover: "#2b2b2a",
    active: "#343431",
  },
  light: {
    background: "#ffffff",
    surface: "#ffffff",
    panel: "#f7f7f5",
    text: "#2f2f2f",
    textDim: "#787774",
    border: "#e3e2e0",
    accent: "#2383e2",
    hover: "#efefed",
    active: "#e7e7e4",
  },
};

export const DEFAULT_SKIN_DRAFT: SkinDraft = {
  name: "Mi tema",
  mode: "dark",
  ...SKIN_PALETTES.dark,
  radius: 12,
  blur: 0,
  borderWidth: 1,
  shadow: "soft",
  font: DEFAULT_FONT_VALUE,
};

/**
 * Colores del creador, nombrados por dónde se ven y no por su nombre técnico
 * en CSS. Nada de "hover" o "superficie": quien crea un tema quiere saber qué
 * parte de la pantalla va a cambiar.
 */
export const SKIN_COLOR_FIELDS: readonly { key: SkinColorKey; label: string }[] = [
  { key: "background", label: "Fondo" },
  { key: "surface", label: "Notas y barras" },
  { key: "panel", label: "Listado de notas" },
  { key: "text", label: "Texto" },
  { key: "textDim", label: "Texto suave" },
  { key: "border", label: "Bordes" },
  { key: "accent", label: "Enlaces y selección" },
  { key: "hover", label: "Al pasar el ratón" },
  { key: "active", label: "Elemento elegido" },
];

export const SKIN_SHADOW_OPTIONS: readonly { value: SkinShadow; label: string }[] = [
  { value: "none", label: "Sin sombra" },
  { value: "soft", label: "Suave" },
  { value: "strong", label: "Marcada" },
];

export const SKIN_PRESETS: readonly SkinPreset[] = [
  {
    label: "Noche",
    draft: {
      ...DEFAULT_SKIN_DRAFT,
      name: "Noche",
      radius: 16,
      shadow: "strong",
    },
  },
  {
    label: "Papel",
    draft: {
      ...DEFAULT_SKIN_DRAFT,
      ...SKIN_PALETTES.light,
      name: "Papel",
      mode: "light",
      radius: 5,
      borderWidth: 1,
      shadow: "soft",
      font: "serif",
    },
  },
  {
    label: "Neón",
    draft: {
      ...DEFAULT_SKIN_DRAFT,
      name: "Neón",
      accent: "#c084fc",
      hover: "#3b1d58",
      active: "#6d28d9",
      radius: 20,
      blur: 8,
      borderWidth: 1,
      shadow: "strong",
      font: "display",
    },
  },
  {
    label: "Cristal",
    draft: {
      ...DEFAULT_SKIN_DRAFT,
      ...SKIN_PALETTES.light,
      name: "Cristal",
      mode: "light",
      background: "#dbeafecc",
      surface: "#ffffffaa",
      panel: "#eff6ffb3",
      text: "#172554",
      textDim: "#64748b",
      border: "#ffffff99",
      accent: "#2563eb",
      hover: "#ffffff66",
      active: "#bfdbfe99",
      radius: 24,
      blur: 20,
      borderWidth: 1,
      shadow: "strong",
    },
  },
];
