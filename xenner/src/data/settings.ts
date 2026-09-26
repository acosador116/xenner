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

export const SETTINGS_SECTIONS: readonly SettingsNavigationItem[] = [
  { id: "appearance", label: "Apariencia", hint: "Modo, tipografías y lectura" },
  { id: "skins", label: "Skins", hint: "Instaladas y activas" },
  { id: "create", label: "Crear skin", hint: "Paleta y estilo propios" },
];
