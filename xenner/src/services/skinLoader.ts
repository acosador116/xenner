// SkinEngine: carga la skin activa y la publica como variables CSS
// `--skin-<componente>-<clave>` en el estilo inline de :root.
//
// La paleta base NO vive aquí: está en `src/styles/global.css` como tokens
// `--skin-*` del modo claro y su variante oscura. Por cascada, este módulo
// solo necesita escribir las claves que la skin define; el resto lo resuelve
// el CSS. Así una skin parcial nunca deja un componente sin estilo y cambiar
// de modo claro/oscuro no tiene que reescribir ninguna variable.
//
// Cadena de lectura POR CADA fichero:
//   1) comandos Tauri (runtime desktop)
//   2) skins creadas en el navegador (previsualización en localStorage)
//   3) bundle Vite de xenner/skins/**/*.txt (pnpm dev sin Tauri)
// Regla: loadSkin() nunca lanza excepción sin capturar.

import { invoke } from "@tauri-apps/api/core";

import type { LoadedSkin, SkinComponent, SkinInfo } from "../types/skin";
import {
  parseSkinComponent,
  parseSkinConfig,
  parseSkinManifest,
} from "../skin/parse";

export const SKIN_COMPONENTS: readonly SkinComponent[] = [
  "background",
  "button",
  "note",
  "sidebar",
  "input",
  "toolbar",
];

const BROWSER_SKIN_KEY = "xenner:skin-active:v1";
const BROWSER_USER_SKINS_KEY = "xenner:user-skins:preview:v1";

function browserSkinConfig(): string | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const id = localStorage.getItem(BROWSER_SKIN_KEY) ?? "";
    return `skinPath="${id.replace(/[^a-zA-Z0-9_-]/g, "")}"`;
  } catch {
    return null;
  }
}

function previewUserSkins(): SkinInfo[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(BROWSER_USER_SKINS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Record<string, { info?: SkinInfo }>;
    return Object.values(parsed)
      .map((entry) => entry.info)
      .filter((info): info is SkinInfo => Boolean(info));
  } catch {
    return [];
  }
}

function previewUserComponent(skin: string, component: string): string | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(BROWSER_USER_SKINS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, { components?: Record<string, Record<string, string>> }>;
    const values = parsed[skin]?.components?.[component];
    if (!values) return null;
    return Object.entries(values)
      .map(([key, value]) => `${key}="${value}"`)
      .join("\n");
  } catch {
    return null;
  }
}

// Bundling de skins para dev sin runtime Tauri (rutas relativas a este módulo).
const BUNDLE = import.meta.glob("../../skins/**/*.txt", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

async function tauriReadConfig(): Promise<string | null> {
  try {
    return await invoke<string>("read_config");
  } catch {
    return browserSkinConfig();
  }
}

async function tauriSetActiveSkin(skin: string): Promise<boolean> {
  try {
    await invoke<void>("set_active_skin", { skin });
    return true;
  } catch {
    try {
      localStorage.setItem(BROWSER_SKIN_KEY, skin);
      return true;
    } catch {
      return false;
    }
  }
}

async function tauriScan(): Promise<SkinInfo[] | null> {
  try {
    return await invoke<SkinInfo[]>("scan_skins");
  } catch {
    return null;
  }
}

async function tauriReadFile(skin: string, file: string): Promise<string | null> {
  try {
    return await invoke<string>("read_skin_file", { skin, file });
  } catch {
    return null;
  }
}

function bundleSkins(): SkinInfo[] {
  const re = /^\.\.\/\.\.\/skins\/([^/]+)\/skin\.txt$/;
  const infos: SkinInfo[] = [];
  for (const [path, raw] of Object.entries(BUNDLE)) {
    const m = path.match(re);
    if (!m) continue;
    const id = m[1];
    const manifest = parseSkinManifest(raw);
    infos.push({
      id,
      name: manifest.name || id,
      version: manifest.version || "",
      author: manifest.author || "",
      origin: "system" as const,
      editable: false,
    });
  }
  infos.sort((a, b) => a.id.localeCompare(b.id));
  return infos;
}

function mergeSkinSources(primary: SkinInfo[], secondary: SkinInfo[]): SkinInfo[] {
  const ids = new Set(primary.map((skin) => skin.id));
  return [...primary, ...secondary.filter((skin) => !ids.has(skin.id))].sort((left, right) =>
    left.id.localeCompare(right.id),
  );
}

function bundleConfig(): string {
  return BUNDLE["../../skins/config.txt"] ?? "";
}

async function readComponentText(
  activeId: string,
  component: SkinComponent,
): Promise<string | null> {
  if (!activeId) return null;
  const viaTauri = await tauriReadFile(activeId, component);
  if (viaTauri !== null) return viaTauri;
  const preview = previewUserComponent(activeId, component);
  if (preview !== null) return preview;
  return BUNDLE[`../../skins/${activeId}/${component}.txt`] ?? null;
}

let latestLoad = 0;
const appliedVars = new Set<string>();

function applyVars(vars: Record<string, Record<string, string>>): void {
  const root = document.documentElement;
  for (const name of appliedVars) root.style.removeProperty(name);
  appliedVars.clear();
  for (const [component, values] of Object.entries(vars)) {
    for (const [key, value] of Object.entries(values)) {
      const name = `--skin-${component}-${key}`;
      root.style.setProperty(name, value);
      appliedVars.add(name);
    }
  }
}

/**
 * Carga la skin activa (config.txt, o `preferredId` si se indicó) y publica
 * sus variables CSS como overrides inline de :root. Las claves ausentes las
 * resuelve `styles/global.css`, que además decide la paleta clara/oscura
 * según `data-color-scheme`.
 * Cualquier fallo en cualquier nivel cae al siguiente; jamás propaga error.
 */
export async function loadSkin(preferredId?: string): Promise<LoadedSkin> {
  const request = ++latestLoad;

  try {
    const [scannedSkins, tauriConfig] = await Promise.all([
      tauriScan(),
      tauriReadConfig(),
    ]);
    if (request !== latestLoad) return { activeId: preferredId ?? "", skins: [] };

    const skins = mergeSkinSources(
      scannedSkins?.length ? scannedSkins : bundleSkins(),
      previewUserSkins(),
    );
    const config = tauriConfig ?? bundleConfig();
    const configId = parseSkinConfig(config).skinPath ?? "";
    const activeId = preferredId ?? configId;
    if (preferredId !== undefined) await tauriSetActiveSkin(activeId);

    const texts = await Promise.all(
      SKIN_COMPONENTS.map((component) => readComponentText(activeId, component)),
    );
    if (request !== latestLoad) return { activeId, skins };

    const overrides: Record<string, Record<string, string>> = {};
    SKIN_COMPONENTS.forEach((component, index) => {
      const text = texts[index];
      const parsed = text === null ? {} : parseSkinComponent(component, text);
      if (Object.keys(parsed).length > 0) overrides[component] = parsed;
    });
    applyVars(overrides);

    if (activeId && !skins.some((skin) => skin.id === activeId)) {
      console.warn(
        `[xenner] skin "${activeId}" no encontrada en scan: se usa global.css para las claves ausentes`,
      );
    }
    return { activeId, skins };
  } catch (error) {
    if (request !== latestLoad) return { activeId: preferredId ?? "", skins: [] };

    console.warn("[xenner] loadSkin falló, se conservan los tokens de global.css:", error);
    try {
      applyVars({});
    } catch {
      // Nunca propaga un error de skins al usuario.
    }
    return { activeId: "", skins: [] };
  }
}
