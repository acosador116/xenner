import assert from "node:assert/strict";
import test from "node:test";

import {
  createDrawingId,
  createDrawingShape,
  drawingFromDataUrl,
  drawingIdFromSvg,
  drawingStage,
  drawingToDataUrl,
  normalizePaper,
  serializeDrawing,
} from "./drawing.ts";

test("serializa una pizarra vacía como SVG seguro", () => {
  const svg = serializeDrawing([]);
  assert.match(svg, /^<svg/);
  assert.match(svg, /viewBox="0 0 320 200"/);
  assert.match(svg, /width="320" height="200"/);
  assert.match(svg, /data-xenner-empty="true"/);
  assert.match(svg, /data-xenner-asset="safe"/);
  assert.match(svg, /data-xenner-drawing-id="drawing-[^"]+"/);
});

test("mantiene un id único y lo recupera del SVG", () => {
  const id = createDrawingId();
  const svg = serializeDrawing([], id);
  assert.equal(drawingIdFromSvg(svg), id);
  assert.notEqual(serializeDrawing([]), serializeDrawing([]));
});

test("serializa el color de texto con el atributo correcto", () => {
  const shape = createDrawingShape("text", { x: 10, y: 20 }, "#123456", 4);
  shape.text = "Hola";
  const svg = serializeDrawing([shape]);
  assert.match(svg, /<text[^>]+fill="#123456"/);
  assert.match(svg, />Hola<\/text>/);
});

test("ajusta el viewBox al contenido dibujado", () => {
  const shape = createDrawingShape("rect", { x: 120, y: 80 }, "#123456", 4);
  shape.x2 = 220;
  shape.y2 = 160;
  const svg = serializeDrawing([shape], "drawing-content");
  assert.match(svg, /viewBox="104 64 132 112"/);
  assert.match(svg, /data-xenner-empty="false"/);
});

test("normaliza rectángulos dibujados en sentido inverso", () => {
  const shape = createDrawingShape("rect", { x: 220, y: 160 }, "#123456", 4);
  shape.x2 = 120;
  shape.y2 = 80;
  const svg = serializeDrawing([shape]);
  assert.match(svg, /<rect x="120" y="80" width="100" height="80"/);
});

test("convierte el SVG a un data URL seguro", () => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg"><text>Texto ñ</text></svg>';
  const dataUrl = drawingToDataUrl(svg);
  assert.ok(dataUrl.startsWith("data:image/svg+xml;base64,"));
  assert.equal(drawingFromDataUrl(dataUrl), svg);
});

test("el papel redimensionado manda sobre el viewBox vacío", () => {
  const paper = { x: 40, y: 20, width: 640, height: 400 };
  const svg = serializeDrawing([], "drawing-paper", paper);
  assert.match(svg, /width="640" height="400"/);
  assert.match(svg, /viewBox="40 20 640 400"/);
});

test("una figura fuera del papel agranda el lienzo en vez de recortarse", () => {
  const shape = createDrawingShape("rect", { x: 700, y: 520 }, "#123456", 4);
  shape.x2 = 760;
  shape.y2 = 560;
  const paper = { x: 0, y: 0, width: 400, height: 300 };
  const stage = drawingStage([shape], paper);
  assert.deepEqual(stage, { x: 0, y: 0, width: 776, height: 576 });
  const svg = serializeDrawing([shape], "drawing-union", paper);
  assert.match(svg, /viewBox="0 0 776 576"/);
  assert.match(svg, /<rect x="700" y="520"/);
});

test("normaliza el papel a los límites del lienzo", () => {
  const tiny = normalizePaper({ x: 0, y: 0, width: 10, height: 10 });
  assert.ok(tiny.width > 10 && tiny.height > 10, "respeta un mínimo usable");

  const huge = normalizePaper({ x: 900, y: 500, width: 5_000, height: 5_000 });
  assert.ok(huge.width <= 1_000 && huge.height <= 600, "nunca supera el lienzo");
  assert.ok(huge.x + huge.width <= 1_000, "el papel no se sale por la derecha");
  assert.ok(huge.y + huge.height <= 600, "el papel no se sale por abajo");
});

test("el papel por defecto es el viewBox del contenido", () => {
  const shape = createDrawingShape("rect", { x: 120, y: 80 }, "#123456", 4);
  shape.x2 = 220;
  shape.y2 = 160;
  assert.deepEqual(drawingStage([shape]), { x: 104, y: 64, width: 132, height: 112 });
});
