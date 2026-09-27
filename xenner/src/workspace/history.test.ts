import assert from "node:assert/strict";
import test from "node:test";

import {
  formatDelta,
  formatVersionTime,
  HISTORY_COALESCE_MS,
  HISTORY_VERSIONS,
  latestVersionAt,
  pruneStore,
  pushVersion,
  versionDelta,
  versionPreview,
} from "./history.ts";

const MINUTE = 60_000;

test("no duplica el mismo contenido consecutivamente", () => {
  const first = pushVersion([], "hola", 1_000);
  const second = pushVersion(first, "hola", 2_000);
  assert.equal(second.length, 1);
  assert.equal(second[0].body, "hola");
});

test("fusiona guardados seguidos muy próximos", () => {
  const base = 1_000_000;
  let versions = pushVersion([], "a", base);
  // Escribir produce guardados cada pocos segundos: sin fusionar, el historial
  // sería una lista de pasos de una letra.
  for (let index = 1; index <= 5; index += 1) {
    versions = pushVersion(versions, `a${".".repeat(index)}`, base + index * 1_000);
  }
  assert.equal(versions.length, 1, "toda la ráfaga se funde en una sola versión");
  assert.equal(versions[0].body, "a.....");
  assert.equal(
    versions[0].at,
    base,
    "la versión conserva el inicio de la ráfaga, no el último guardado",
  );

  // Pasada la ventana, el siguiente guardado abre una versión nueva.
  const spaced = pushVersion(versions, "b", base + HISTORY_COALESCE_MS + 1);
  assert.equal(spaced.length, 2);
  assert.equal(spaced[1].body, "b");
});

test("acota el número de versiones por nota", () => {
  let versions: ReturnType<typeof pushVersion> = [];
  for (let index = 0; index < HISTORY_VERSIONS + 12; index += 1) {
    versions = pushVersion(versions, `v${index}`, index * (HISTORY_COALESCE_MS + 1_000));
  }
  assert.equal(versions.length, HISTORY_VERSIONS);
  assert.equal(versions[versions.length - 1].body, `v${HISTORY_VERSIONS + 11}`);
});

test("descarta las notas más antiguas del almacén", () => {
  const store: Record<string, ReturnType<typeof pushVersion>> = {
    antigua: pushVersion([], "a", 1_000),
    media: pushVersion([], "b", 5_000),
    nueva: pushVersion([], "c", 9_000),
    vacia: [],
  };
  const pruned = pruneStore(store, 2);
  assert.deepEqual(Object.keys(pruned).sort(), ["media", "nueva"]);
  assert.equal(latestVersionAt(pruned.nueva), 9_000);
});

test("calcula el delta respecto a la versión anterior", () => {
  const previous = { id: "a", at: 1, body: "hola" };
  const current = { id: "b", at: 2, body: "hola mundo" };
  assert.equal(versionDelta(current, previous), 6);
  assert.equal(versionDelta(current, current), 0);
  assert.equal(versionDelta(current, null), 0);
  assert.equal(formatDelta(6), "+6 caracteres");
  assert.equal(formatDelta(-6), "−6 caracteres");
  assert.equal(formatDelta(0), "sin cambios de tamaño");
});

test("etiqueta el tiempo relativo en español", () => {
  const now = 10 * 24 * 60 * MINUTE;
  assert.equal(formatVersionTime(now - 5_000, now), "hace un momento");
  assert.equal(formatVersionTime(now - 3 * MINUTE, now), "hace 3 min");
  assert.equal(formatVersionTime(now - 2 * 60 * MINUTE, now), "hace 2 h");
  assert.equal(formatVersionTime(now - 3 * 24 * 60 * MINUTE, now), "hace 3 días");
  assert.equal(formatVersionTime(now - 1 * 24 * 60 * MINUTE, now), "hace 1 día");
});

test("la vista previa limpia el Markdown y se recorta", () => {
  assert.equal(versionPreview("# Título\n\nHola **mundo**"), "Título Hola mundo");
  assert.equal(versionPreview("> cita"), "cita");
  assert.equal(versionPreview("![alt](p.png)"), "(imagen)");
  assert.equal(versionPreview("```js\ncode\n```"), "(código)");
  assert.equal(versionPreview(""), "");
  const long = versionPreview("a".repeat(400), 50);
  assert.equal(long.length, 51);
  assert.ok(long.endsWith("…"));
});
