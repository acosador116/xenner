import assert from "node:assert/strict";
import test from "node:test";

import {
  beginMarquee,
  createDrawingId,
  createDrawingShape,
  drawingFromDataUrl,
  drawingIdFromSvg,
  drawingStage,
  drawingToDataUrl,
  marqueeBounds,
  marqueeHasArea,
  mergeSelection,
  moveMarquee,
  normalizePaper,
  rectOverlapsShape,
  serializeDrawing,
  shapesInBounds,
  toggleSelection,
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

test("el rectángulo de selección cubre por igual las cuatro direcciones", () => {
  // El invariante real: entre dos puntos, el área es la misma se arrastre de un
  // lado a otro o al revés, y cada esquina da su rectángulo esperado.
  const cases = [
    { from: { x: 300, y: 180 }, to: { x: 700, y: 420 }, expected: { x: 300, y: 180, width: 400, height: 240 }, name: "abajo-derecha" },
    { from: { x: 700, y: 180 }, to: { x: 300, y: 420 }, expected: { x: 300, y: 180, width: 400, height: 240 }, name: "abajo-izquierda" },
    { from: { x: 300, y: 420 }, to: { x: 700, y: 180 }, expected: { x: 300, y: 180, width: 400, height: 240 }, name: "arriba-derecha" },
    { from: { x: 700, y: 420 }, to: { x: 300, y: 180 }, expected: { x: 300, y: 180, width: 400, height: 240 }, name: "arriba-izquierda" },
  ];
  for (const testCase of cases) {
    const forward = marqueeBounds(moveMarquee(beginMarquee(testCase.from), testCase.to));
    const backward = marqueeBounds(moveMarquee(beginMarquee(testCase.to), testCase.from));
    assert.deepEqual(forward, testCase.expected, `arrastrar hacia ${testCase.name}`);
    assert.deepEqual(backward, testCase.expected, `${testCase.name}, sentido inverso`);
  }
});

test("el rectángulo mide lo mismo que el gesto, aunque se cruce el origen", () => {
  // Este es el fallo que hacía que solo funcionara hacia abajo. Si en vez del
  // origen se guarda el rectángulo ya normalizado, en cuanto el puntero cruza
  // el origen ese rectángulo pasa a ser el nuevo "origen" y el área medida se
  // queda corta: arrastrando 200x120 hacia arriba-izquierda reportaba 140x80.
  const origin = { x: 500, y: 300 };
  const path = [
    { x: 480, y: 290, expected: { x: 480, y: 290, width: 20, height: 10 } },
    { x: 440, y: 260, expected: { x: 440, y: 260, width: 60, height: 40 } },
    { x: 300, y: 180, expected: { x: 300, y: 180, width: 200, height: 120 } },
  ];
  let marquee = beginMarquee(origin);
  for (const step of path) {
    marquee = moveMarquee(marquee, step);
    assert.deepEqual(marqueeBounds(marquee), step.expected, `en ${step.x},${step.y}`);
  }
});

test("el gesto se acota al lienzo y distingue clic de arrastre", () => {
  const marquee = moveMarquee(beginMarquee({ x: 20, y: 20 }), { x: -500, y: 9_999 });
  assert.deepEqual(marqueeBounds(marquee), { x: 0, y: 20, width: 20, height: 580 });
  assert.equal(marqueeHasArea(marquee), true);

  const click = beginMarquee({ x: 300, y: 300 });
  assert.equal(marqueeHasArea(click), false, "un clic no es un arrastre");
  const nudge = moveMarquee(click, { x: 302, y: 300 });
  assert.equal(marqueeHasArea(nudge), false, "2 px de temblor siguen siendo un clic");
  const drag = moveMarquee(click, { x: 306, y: 300 });
  assert.equal(marqueeHasArea(drag), true);
});

test("el rectángulo selecciona lo que toca, no solo lo que cabe dentro", () => {
  const shape = createDrawingShape("rect", { x: 100, y: 100 }, "#123456", 4);
  shape.x2 = 200;
  shape.y2 = 200;

  // Cubre la figura entera.
  assert.equal(rectOverlapsShape({ x: 50, y: 50, width: 250, height: 250 }, shape), true);
  // Solo se solapa por una esquina: también entra, como en Miro o Figma.
  assert.equal(rectOverlapsShape({ x: 180, y: 180, width: 100, height: 100 }, shape), true);
  // Un solapamiento de 1 px también cuenta.
  assert.equal(rectOverlapsShape({ x: 199, y: 100, width: 40, height: 100 }, shape), true);
  // Rozar el borde sin invadirlo no es solapar: no entra.
  assert.equal(rectOverlapsShape({ x: 200, y: 100, width: 40, height: 100 }, shape), false);
  // Con un margen de separación, tampoco.
  assert.equal(rectOverlapsShape({ x: 201, y: 100, width: 40, height: 100 }, shape), false);
  assert.equal(rectOverlapsShape({ x: 0, y: 0, width: 50, height: 50 }, shape), false);
});

test("seleccionar por rectángulo trae las figuras en orden y sin repetir", () => {
  const far = createDrawingShape("rect", { x: 800, y: 500 }, "#123456", 4);
  far.x2 = 860;
  far.y2 = 560;
  const near = createDrawingShape("rect", { x: 40, y: 40 }, "#123456", 4);
  near.x2 = 90;
  near.y2 = 90;
  // Fuera del área, que acaba en x=900.
  const outside = createDrawingShape("rect", { x: 950, y: 100 }, "#123456", 4);
  outside.x2 = 990;
  outside.y2 = 140;
  const shapes = [outside, far, near];

  // Arrastrando arriba-izquierda desde abajo-derecha.
  const marquee = moveMarquee(beginMarquee({ x: 900, y: 580 }), { x: 0, y: 0 });
  assert.deepEqual(marqueeBounds(marquee), { x: 0, y: 0, width: 900, height: 580 });
  const picked = shapesInBounds(shapes, marqueeBounds(marquee));
  assert.deepEqual(
    picked.map((shape) => shape.id),
    [far.id, near.id],
    "toma las que toca y respeta el orden del lienzo",
  );

  assert.deepEqual(mergeSelection([near.id], [far.id, near.id]), [near.id, far.id]);
  assert.deepEqual(mergeSelection(["a"], []), ["a"]);
  assert.deepEqual(toggleSelection(["a", "b"], ["b", "c"]), ["a", "c"]);
  assert.deepEqual(toggleSelection([], ["a"]), ["a"]);
});
