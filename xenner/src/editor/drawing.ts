import type {
  DrawingShape,
  Point,
  ShapeBounds,
  ShapeKind,
} from "../types/drawing";

export const CANVAS_WIDTH = 1_000;
export const CANVAS_HEIGHT = 600;
export const DRAWING_PADDING = 16;
export const EMPTY_DRAWING_WIDTH = 320;
export const EMPTY_DRAWING_HEIGHT = 200;
export const DEFAULT_DRAWING_COLOR = "#6750a4";
// El papel (el rectángulo visible del lienzo) se puede redimensionar arrastrando
// su esquina inferior derecha. Estos son los límites en unidades de dibujo.
// El mínimo incluye un margen extra: si no, al llegar al alto máximo la
// esquina se quedaría pegada al borde y "arrastrar para agrandar" no crecería.
export const MIN_PAPER_WIDTH = 320;
export const MIN_PAPER_HEIGHT = 200;
export const MIN_PAPER_GAP = 24;

let shapeId = 0;
let drawingSequence = 0;

export function createDrawingId(): string {
  const randomUuid = globalThis.crypto?.randomUUID?.();
  if (randomUuid) return `drawing-${randomUuid}`;
  drawingSequence += 1;
  return `drawing-${Date.now().toString(36)}-${drawingSequence.toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export function drawingIdFromSvg(svg: string): string | null {
  if (!svg) return null;
  if (typeof DOMParser === "undefined") {
    const match = svg.match(/data-xenner-drawing-id="([a-zA-Z0-9_-]{1,100})"/);
    return match?.[1] ?? null;
  }
  const parsed = new DOMParser().parseFromString(svg, "image/svg+xml");
  if (parsed.querySelector("parsererror")) return null;
  const value = parsed.documentElement.getAttribute("data-xenner-drawing-id");
  return value && /^[a-zA-Z0-9_-]{1,100}$/.test(value) ? value : null;
}

function nextId(): string {
  shapeId += 1;
  return `shape-${shapeId}`;
}

function distanceToSegment(point: Point, start: Point, end: Point): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (dx === 0 && dy === 0) return Math.hypot(point.x - start.x, point.y - start.y);
  const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(point.x - (start.x + t * dx), point.y - (start.y + t * dy));
}

export function drawingShapeBounds(shape: DrawingShape): ShapeBounds {
  if (shape.kind === "path") {
    const points = shape.points.length > 0 ? shape.points : [{ x: shape.x1, y: shape.y1 }];
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    const minX = Math.min(...xs, shape.x1, shape.x2);
    const minY = Math.min(...ys, shape.y1, shape.y2);
    return {
      x: minX,
      y: minY,
      width: Math.max(2, Math.max(...xs, shape.x1, shape.x2) - minX),
      height: Math.max(2, Math.max(...ys, shape.y1, shape.y2) - minY),
    };
  }
  if (shape.kind === "text") {
    return {
      x: shape.x1,
      y: shape.y1 - 24,
      width: Math.max(48, shape.text.length * 13 + 18),
      height: 32,
    };
  }
  return {
    x: Math.min(shape.x1, shape.x2),
    y: Math.min(shape.y1, shape.y2),
    width: Math.max(2, Math.abs(shape.x2 - shape.x1)),
    height: Math.max(2, Math.abs(shape.y2 - shape.y1)),
  };
}

export function drawingBounds(shapes: DrawingShape[], padding = 0): ShapeBounds {
  if (!shapes.length) return { x: 0, y: 0, width: 0, height: 0 };
  const first = drawingShapeBounds(shapes[0]);
  const bounds = shapes.slice(1).reduce(
    (current, shape) => {
      const next = drawingShapeBounds(shape);
      const x = Math.min(current.x, next.x);
      const y = Math.min(current.y, next.y);
      const right = Math.max(current.x + current.width, next.x + next.width);
      const bottom = Math.max(current.y + current.height, next.y + next.height);
      return { x, y, width: right - x, height: bottom - y };
    },
    first,
  );
  const safePadding = Math.max(0, Number.isFinite(padding) ? padding : 0);
  return {
    x: bounds.x - safePadding,
    y: bounds.y - safePadding,
    width: Math.max(1, bounds.width + safePadding * 2),
    height: Math.max(1, bounds.height + safePadding * 2),
  };
}

export function drawingViewBox(shapes: DrawingShape[], padding = DRAWING_PADDING): ShapeBounds {
  if (!shapes.length) {
    return { x: 0, y: 0, width: EMPTY_DRAWING_WIDTH, height: EMPTY_DRAWING_HEIGHT };
  }
  return drawingBounds(shapes, padding);
}

/**
 * Rectángulo visible del lienzo. El papel manda sobre el alto, pero la
 * esquina inferior derecha también puede ser un tirador: se admite un margen
 * extra para que "arrastrar para agrandar" siga creciendo cuando el alto ya no
 * deja sitio.
 */
export function normalizePaper(paper: ShapeBounds): ShapeBounds {
  const minimumWidth = Math.min(CANVAS_WIDTH, MIN_PAPER_WIDTH + MIN_PAPER_GAP);
  const minimumHeight = Math.min(CANVAS_HEIGHT, MIN_PAPER_HEIGHT + MIN_PAPER_GAP);
  const width = Math.min(
    CANVAS_WIDTH,
    Math.max(minimumWidth, Math.round(paper.width) || minimumWidth),
  );
  const height = Math.min(
    CANVAS_HEIGHT,
    Math.max(minimumHeight, Math.round(paper.height) || minimumHeight),
  );
  return {
    x: Math.max(0, Math.min(Math.round(paper.x) || 0, CANVAS_WIDTH - width)),
    y: Math.max(0, Math.min(Math.round(paper.y) || 0, CANVAS_HEIGHT - height)),
    width,
    height,
  };
}

function unionBounds(left: ShapeBounds, right: ShapeBounds): ShapeBounds {
  const x = Math.min(left.x, right.x);
  const y = Math.min(left.y, right.y);
  return {
    x,
    y,
    width: Math.max(left.x + left.width, right.x + right.width) - x,
    height: Math.max(left.y + left.height, right.y + right.height) - y,
  };
}

/**
 * Rectángulo que se serializa como viewBox: el papel elegido por la persona
 * más el contenido dibujado, para que redimensionar el papel nunca recorte una
 * figura. Sin papel, manda el contenido.
 */
export function drawingStage(
  shapes: DrawingShape[],
  paper?: ShapeBounds,
  padding = DRAWING_PADDING,
): ShapeBounds {
  if (!paper) return drawingViewBox(shapes, padding);
  const current = normalizePaper(paper);
  // El lienzo vacío no aporta nada: unirlo solo inflaría el papel hasta el
  // origen, que es justo lo que se acaba de arrastrar para evitar.
  if (!shapes.length) return current;
  return unionBounds(current, drawingBounds(shapes, padding));
}

/** Lee el papel de un SVG ya serializado; `null` si el SVG no es válido. */
export function parseDrawingPaper(svg: string): ShapeBounds | null {
  if (!svg || typeof DOMParser === "undefined") return null;
  const parsed = new DOMParser().parseFromString(svg, "image/svg+xml");
  if (parsed.querySelector("parsererror")) return null;
  const root = parsed.documentElement;
  if (root.tagName.toLowerCase() !== "svg") return null;
  const box = (root.getAttribute("viewBox") ?? "").trim().split(/[\s,]+/).map(Number);
  if (box.length !== 4 || !box.every((value) => Number.isFinite(value))) return null;
  const [x, y, viewWidth, viewHeight] = box;
  if (viewWidth <= 0 || viewHeight <= 0) return null;
  // `width`/`height` llevan el papel real cuando difieren del viewBox; si no,
  // el papel es exactamente el viewBox (dibujo que nunca se redimensionó).
  const width = numberAttribute(root, "width", viewWidth);
  const height = numberAttribute(root, "height", viewHeight);
  return normalizePaper({ x, y, width, height });
}

/**
 * Rectángulo de selección con origen y esquina opuestos. Se normaliza a tamaño
 * positivo, para que arrastrar hacia arriba o hacia la izquierda funcione igual.
 */
export function rectFromTo(origin: Point, corner: Point): ShapeBounds {
  return {
    x: Math.min(origin.x, corner.x),
    y: Math.min(origin.y, corner.y),
    width: Math.abs(corner.x - origin.x),
    height: Math.abs(corner.y - origin.y),
  };
}

/**
 * ¿El rectángulo toca la figura? Es el criterio de las pizarras (Miro, Figma):
 * se selecciona lo que se roza, no solo lo que cabe entero dentro.
 */
export function rectOverlapsShape(rect: ShapeBounds, shape: DrawingShape): boolean {
  const box = drawingShapeBounds(shape);
  return (
    box.x < rect.x + rect.width &&
    box.x + box.width > rect.x &&
    box.y < rect.y + rect.height &&
    box.y + box.height > rect.y
  );
}

export function drawingShapeHits(shape: DrawingShape, point: Point): boolean {  if (shape.kind === "path") {
    if (shape.points.length < 2) {
      return distanceToSegment(point, shape.points[0] ?? { x: shape.x1, y: shape.y1 }, { x: shape.x1, y: shape.y1 }) <= shape.width + 8;
    }
    for (let index = 1; index < shape.points.length; index += 1) {
      if (distanceToSegment(point, shape.points[index - 1], shape.points[index]) <= shape.width + 8) {
        return true;
      }
    }
    return false;
  }
  if (shape.kind === "line" || shape.kind === "arrow") {
    return distanceToSegment(point, { x: shape.x1, y: shape.y1 }, { x: shape.x2, y: shape.y2 }) <= shape.width + 8;
  }
  if (shape.kind === "text") {
    const width = Math.max(48, shape.text.length * 13 + 18);
    return point.x >= shape.x1 - 10 && point.x <= shape.x1 + width && point.y >= shape.y1 - 24 && point.y <= shape.y1 + 12;
  }
  const box = drawingShapeBounds(shape);
  const padding = shape.width + 6;
  return (
    point.x >= box.x - padding &&
    point.x <= box.x + box.width + padding &&
    point.y >= box.y - padding &&
    point.y <= box.y + box.height + padding
  );
}

function escapeXml(value: string): string {
  return value
    .split("&").join("&amp;")
    .split("<").join("&lt;")
    .split(">").join("&gt;")
    .split('"').join("&quot;")
    .split("'").join("&apos;");
}

function shapeToSvg(shape: DrawingShape): string {
  const common = `fill="none" stroke="${shape.color}" stroke-width="${shape.width}" stroke-linecap="round" stroke-linejoin="round"`;
  switch (shape.kind) {
    case "rect": {
      const x = Math.min(shape.x1, shape.x2);
      const y = Math.min(shape.y1, shape.y2);
      return `<rect x="${x}" y="${y}" width="${Math.abs(shape.x2 - shape.x1)}" height="${Math.abs(shape.y2 - shape.y1)}" ${common} />`;
    }
    case "ellipse":
      return `<ellipse cx="${(shape.x1 + shape.x2) / 2}" cy="${(shape.y1 + shape.y2) / 2}" rx="${Math.abs(shape.x2 - shape.x1) / 2}" ry="${Math.abs(shape.y2 - shape.y1) / 2}" ${common} />`;
    case "line":
      return `<line x1="${shape.x1}" y1="${shape.y1}" x2="${shape.x2}" y2="${shape.y2}" ${common} />`;
    case "arrow":
      return `<line x1="${shape.x1}" y1="${shape.y1}" x2="${shape.x2}" y2="${shape.y2}" ${common} marker-end="url(#arrowhead-${shape.id})" />`;
    case "path":
      return `<polyline points="${shape.points.map((point) => `${point.x},${point.y}`).join(" ")}" ${common} />`;
    case "text":
      return `<text x="${shape.x1}" y="${shape.y1}" fill="${shape.color}" font-family="sans-serif" font-size="24">${escapeXml(shape.text)}</text>`;
    default:
      return "";
  }
}

export function drawingFromDataUrl(dataUrl: string): string {
  const base64 = dataUrl.split(",", 2)[1];
  if (!base64) return "";
  try {
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return "";
  }
}

export function drawingToDataUrl(svg: string): string {
  const bytes = new TextEncoder().encode(svg);
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return `data:image/svg+xml;base64,${btoa(binary)}`;
}

export function hasDrawingContent(svg: string): boolean {
  if (!svg || typeof DOMParser === "undefined") return false;
  try {
    return parseDrawingSvg(svg).some((shape) => shape.kind !== "path" || shape.points.length >= 2);
  } catch {
    return false;
  }
}

function numberForSvg(value: number): string {
  return Number.isFinite(value) ? String(Number(value.toFixed(3))) : "0";
}

export function serializeDrawing(
  shapes: DrawingShape[],
  drawingId = createDrawingId(),
  paper?: ShapeBounds,
): string {
  const safeDrawingId = /^[a-zA-Z0-9_-]{1,100}$/.test(drawingId) ? drawingId : createDrawingId();
  const view = drawingStage(shapes, paper);
  const body = shapes.map(shapeToSvg).join("");
  const markers = shapes
    .filter((shape) => shape.kind === "arrow")
    .map(
      (shape) =>
        `<marker id="arrowhead-${shape.id}" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="${shape.color}" /></marker>`,
    )
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${numberForSvg(view.width)}" height="${numberForSvg(view.height)}" viewBox="${numberForSvg(view.x)} ${numberForSvg(view.y)} ${numberForSvg(view.width)} ${numberForSvg(view.height)}" data-xenner-asset="safe" data-xenner-empty="${shapes.length === 0}" data-xenner-drawing-id="${safeDrawingId}"><defs>${markers}</defs>${body}</svg>`;
}

function numberAttribute(element: Element, name: string, fallback = 0): number {
  const value = Number.parseFloat(element.getAttribute(name) ?? "");
  return Number.isFinite(value) ? value : fallback;
}

function bounded(value: number, maximum = CANVAS_WIDTH): number {
  return Math.max(0, Math.min(maximum, value));
}

function safeColor(value: string | null, fallback: string): string {
  return value && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}

function parsePoints(value: string | null): Point[] {
  if (!value) return [];
  return value
    .trim()
    .split(/\s+/)
    .map((pair) => pair.split(",").map((part) => Number.parseFloat(part)))
    .filter((pair): pair is [number, number] =>
      pair.length >= 2 && Number.isFinite(pair[0]) && Number.isFinite(pair[1]),
    )
    .map(([x, y]) => ({ x: bounded(x), y: bounded(y, CANVAS_HEIGHT) }));
}

export function parseDrawingSvg(svg: string): DrawingShape[] {
  if (!svg || typeof DOMParser === "undefined") return [];
  const parsed = new DOMParser().parseFromString(svg, "image/svg+xml");
  if (parsed.querySelector("parsererror")) return [];
  const root = parsed.documentElement;
  if (
    root.tagName.toLowerCase() !== "svg" ||
    root.getAttribute("data-xenner-asset")?.toLowerCase() !== "safe"
  ) {
    return [];
  }

  const shapes: DrawingShape[] = [];
  root.querySelectorAll("rect, ellipse, line, polyline, text").forEach((element) => {
    const tag = element.tagName.toLowerCase();
    const stroke = safeColor(
      element.getAttribute(tag === "text" ? "fill" : "stroke"),
      DEFAULT_DRAWING_COLOR,
    );
    const width = Math.max(1, Math.min(16, numberAttribute(element, "stroke-width", 4)));
    const base: Omit<DrawingShape, "kind" | "x1" | "y1" | "x2" | "y2" | "points" | "text"> = {
      id: nextId(),
      color: stroke,
      width,
    };
    let shape: DrawingShape | null = null;

    if (tag === "rect") {
      const x = bounded(numberAttribute(element, "x"));
      const y = bounded(numberAttribute(element, "y"), CANVAS_HEIGHT);
      const rectWidth = Math.max(2, Math.abs(numberAttribute(element, "width", 2)));
      const rectHeight = Math.max(2, Math.abs(numberAttribute(element, "height", 2)));
      shape = {
        ...base,
        kind: "rect",
        x1: x,
        y1: y,
        x2: bounded(x + rectWidth),
        y2: bounded(y + rectHeight, CANVAS_HEIGHT),
        points: [],
        text: "",
      };
    } else if (tag === "ellipse") {
      const cx = bounded(numberAttribute(element, "cx"));
      const cy = bounded(numberAttribute(element, "cy"), CANVAS_HEIGHT);
      const rx = Math.max(1, Math.abs(numberAttribute(element, "rx", 1)));
      const ry = Math.max(1, Math.abs(numberAttribute(element, "ry", 1)));
      shape = {
        ...base,
        kind: "ellipse",
        x1: bounded(cx - rx),
        y1: bounded(cy - ry, CANVAS_HEIGHT),
        x2: bounded(cx + rx),
        y2: bounded(cy + ry, CANVAS_HEIGHT),
        points: [],
        text: "",
      };
    } else if (tag === "line") {
      const isArrow = element.getAttribute("marker-end")?.includes("arrowhead") ?? false;
      shape = {
        ...base,
        kind: isArrow ? "arrow" : "line",
        x1: bounded(numberAttribute(element, "x1")),
        y1: bounded(numberAttribute(element, "y1"), CANVAS_HEIGHT),
        x2: bounded(numberAttribute(element, "x2")),
        y2: bounded(numberAttribute(element, "y2"), CANVAS_HEIGHT),
        points: [],
        text: "",
      };
    } else if (tag === "polyline") {
      const points = parsePoints(element.getAttribute("points"));
      if (points.length >= 2) {
        shape = {
          ...base,
          kind: "path",
          x1: points[0].x,
          y1: points[0].y,
          x2: points[points.length - 1].x,
          y2: points[points.length - 1].y,
          points,
          text: "",
        };
      }
    } else if (tag === "text") {
      const text = element.textContent?.trim() ?? "";
      if (text) {
        shape = {
          ...base,
          kind: "text",
          x1: bounded(numberAttribute(element, "x")),
          y1: bounded(numberAttribute(element, "y"), CANVAS_HEIGHT),
          x2: bounded(numberAttribute(element, "x")),
          y2: bounded(numberAttribute(element, "y"), CANVAS_HEIGHT),
          points: [],
          text,
        };
      }
    }
    if (shape) shapes.push(shape);
  });
  return shapes;
}

export function createDrawingShape(
  kind: ShapeKind,
  point: Point,
  color: string,
  width: number,
): DrawingShape {
  return {
    id: nextId(),
    kind,
    x1: point.x,
    y1: point.y,
    x2: point.x,
    y2: point.y,
    points: [point],
    text: "",
    color,
    width,
  };
}
