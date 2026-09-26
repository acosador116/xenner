import assert from "node:assert/strict";
import test from "node:test";

import {
  shouldShowDrawingPreview,
  transformWhiteboardAst,
  WHITEBOARD_CAPTION,
} from "./whiteboard.ts";

const source = "data:image/svg+xml;base64,PHN2Zy8+";

test("reemplaza una imagen Markdown independiente por el nodo pizarra", () => {
  const tree = {
    type: "root",
    children: [
      {
        type: "paragraph",
        children: [{ type: "image", title: WHITEBOARD_CAPTION, url: source }],
      },
      {
        type: "image-block",
        title: WHITEBOARD_CAPTION,
        url: source,
      },
    ],
  };

  transformWhiteboardAst(tree);

  assert.equal(tree.children[0].type, "whiteboard");
  assert.equal(tree.children[0].url, source);
  assert.equal(tree.children[0].children, undefined);
  assert.equal(tree.children[1].type, "whiteboard");
});

test("no convierte imágenes normales, inline ni sources no locais", () => {
  const tree = {
    type: "root",
    children: [
      {
        type: "paragraph",
        children: [
          { type: "text", value: "Antes " },
          { type: "image", title: WHITEBOARD_CAPTION, url: source },
        ],
      },
      {
        type: "paragraph",
        children: [{ type: "image", title: WHITEBOARD_CAPTION, url: "pizarra.svg" }],
      },
    ],
  };

  transformWhiteboardAst(tree);

  assert.equal(tree.children[0].type, "paragraph");
  assert.equal(tree.children[0].children[1].type, "image");
  assert.equal(tree.children[1].type, "paragraph");
  assert.equal(tree.children[1].children[0].type, "image");
});

test("la vista previa solo se ve con el lienzo cerrado y con contenido", () => {
  const base = { editing: false, starting: false, hasContent: true };
  assert.equal(shouldShowDrawingPreview(base), true, "dibujo guardado y cerrado");

  // Editar un dibujo NO puede dejar su imagen encima: el lienzo se incrusta en
  // el mismo nodo y aparecería por debajo en lugar de en su lugar.
  assert.equal(shouldShowDrawingPreview({ ...base, editing: true }), false);
  assert.equal(shouldShowDrawingPreview({ ...base, starting: true }), false);
  // Un borrador recién creado no debe dejar un tablero en blanco de 320x200.
  assert.equal(shouldShowDrawingPreview({ ...base, hasContent: false }), false);
  assert.equal(
    shouldShowDrawingPreview({ editing: true, starting: false, hasContent: false }),
    false,
  );
});
