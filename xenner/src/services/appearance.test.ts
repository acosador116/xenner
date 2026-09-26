import assert from "node:assert/strict";
import test from "node:test";

import { isDefaultAppearance } from "../data/appearance.ts";
import { DEFAULT_APPEARANCE, sanitizeAppearance } from "./appearance.ts";

test("normaliza preferencias de apariencia y limita valores", () => {
  const result = sanitizeAppearance({
    mode: "dark",
    uiFont: "Inter, sans-serif",
    editorFont: "Georgia, serif",
    editorSize: 999,
    lineHeight: 0,
    contentWidth: 10,
  });
  assert.equal(result.mode, "dark");
  assert.equal(result.uiFont, "Inter, sans-serif");
  assert.equal(result.editorFont, "Georgia, serif");
  assert.equal(result.editorSize, 24);
  assert.equal(result.lineHeight, 1.2);
  assert.equal(result.contentWidth, 560);
});

test("rechaza una tipografía que podría romper CSS", () => {
  const result = sanitizeAppearance({ uiFont: "Inter; color: red" });
  assert.equal(result.uiFont, DEFAULT_APPEARANCE.uiFont);
});

test("detecta si el aspecto se ha apartado de lo que trae Xenner", () => {
  // El botón "Restablecer" solo aparece cuando esto da falso.
  assert.equal(isDefaultAppearance(DEFAULT_APPEARANCE), true);
  assert.equal(isDefaultAppearance(sanitizeAppearance({})), true);

  for (const key of Object.keys(DEFAULT_APPEARANCE) as (keyof typeof DEFAULT_APPEARANCE)[]) {
    const changed = { ...DEFAULT_APPEARANCE, [key]: "__otro__" } as never;
    assert.equal(isDefaultAppearance(changed), false, `cambiar ${key} debe notarse`);
  }

  assert.equal(
    isDefaultAppearance({ ...DEFAULT_APPEARANCE, editorSize: 18 }),
    false,
  );
  assert.equal(
    isDefaultAppearance({ ...DEFAULT_APPEARANCE, mode: "light" }),
    false,
  );
});
