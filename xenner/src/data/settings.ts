import type { ThemeMode } from "../types/appearance";

export type SettingsSection = "appearance" | "skins" | "create";

export interface SettingsNavigationItem {
  id: SettingsSection;
  label: string;
  hint: string;
}

export interface ThemeModeOption {
  id: ThemeMode;
  label: string;
}

export const THEME_MODES: readonly ThemeModeOption[] = [
  { id: "system", label: "Sistema" },
  { id: "light", label: "Claro" },
  { id: "dark", label: "Oscuro" },
];

/**
 * Las secciones se nombran por lo que la persona quiere conseguir, no por cómo
 * está construido por dentro. "Temas" y no "Skins", y sin mencionar archivos
 * `.txt`, variables CSS ni tokens: eso va en la documentación, no en la
 * interfaz.
 */
export const SETTINGS_SECTIONS: readonly SettingsNavigationItem[] = [
  { id: "appearance", label: "Aspecto", hint: "Cómo se ven tus notas" },
  { id: "skins", label: "Temas", hint: "Elige el que más te guste" },
  { id: "create", label: "Crear un tema", hint: "Un aspecto propio" },
];
