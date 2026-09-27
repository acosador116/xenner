import { createSignal } from "solid-js";

import { loadSkin } from "../services/skinLoader";
import {
  applyAppearance,
  readAppearance,
  saveAppearance,
  watchSystemColorScheme,
} from "../services/appearance";
import type { Appearance } from "../types/appearance";
import type { SkinInfo } from "../types/skin";

// El modo claro/oscuro ya no recarga la skin: `applyAppearance` conmuta
// `data-color-scheme` y `styles/global.css` conmuta la paleta base. Solo hace
// falta volver a leer los TXT cuando cambia la skin activa o la de Apariencia.
export function useAppearanceController() {
  const [skins, setSkins] = createSignal<SkinInfo[]>([]);
  const [activeSkin, setActiveSkin] = createSignal("");
  const [skinLoading, setSkinLoading] = createSignal(true);
  const [appearance, setAppearance] = createSignal<Appearance>(readAppearance());
  let skinRequest = 0;

  async function changeSkin(id?: string): Promise<void> {
    const request = ++skinRequest;
    setSkinLoading(true);
    try {
      const loaded = await loadSkin(id);
      if (request !== skinRequest) return;
      setSkins(loaded.skins);
      setActiveSkin(loaded.activeId);
    } finally {
      if (request === skinRequest) setSkinLoading(false);
    }
  }

  function updateAppearance(next: Appearance): void {
    setAppearance(next);
    saveAppearance(next);
    applyAppearance(next);
  }

  function skinCreated(skin: SkinInfo): void {
    setSkins((previous) => [
      ...previous.filter((candidate) => candidate.id !== skin.id),
      skin,
    ]);
    void changeSkin(skin.id);
  }

  function start(): () => void {
    applyAppearance(appearance());
    void changeSkin();
    // El watcher solo mantiene `data-color-scheme` al día cuando el modo es
    // "system"; la paleta clara/oscura la aplica el CSS.
    return watchSystemColorScheme(() => {
      if (appearance().mode === "system") applyAppearance(appearance());
    });
  }

  return {
    skins,
    activeSkin,
    skinLoading,
    appearance,
    changeSkin,
    updateAppearance,
    skinCreated,
    start,
  };
}
