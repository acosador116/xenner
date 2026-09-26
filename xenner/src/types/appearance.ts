export type ThemeMode = "light" | "dark" | "system";
export type ColorScheme = "light" | "dark";

export interface Appearance {
  mode: ThemeMode;
  uiFont: string;
  editorFont: string;
  editorSize: number;
  lineHeight: number;
  contentWidth: number;
}

export type FontGroupId = "sans" | "serif" | "mono" | "display";

export interface FontOption {
  readonly id: string;
  /** Grupo por sensación, para no soltar una lista plana de 38 opciones. */
  readonly group: FontGroupId;
  readonly label: string;
  /** Pila CSS: la familia concreta y de qué se sustituye si no está instalada. */
  readonly value: string;
}
