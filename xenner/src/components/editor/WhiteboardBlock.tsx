import {
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  For,
  onCleanup,
  onMount,
  Show,
} from "solid-js";

import { DRAWING_TOOLS, isDrawingTool } from "../../data/drawing";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  createDrawingId,
  createDrawingShape,
  DEFAULT_DRAWING_COLOR,
  drawingShapeBounds,
  drawingShapeHits,
  drawingViewBox,
  MIN_PAPER_WIDTH,
  rectFromTo,
  rectOverlapsShape,
  normalizePaper,
  parseDrawingPaper,
  parseDrawingSvg,
  serializeDrawing,
} from "../../editor/drawing";
import styles from "../../styles/components/WhiteboardBlock.module.css";
import type { DrawingShape, DrawingTool, Point, ShapeBounds, ShapeKind } from "../../types/drawing";
import { Button } from "../ui/Button";
import {
  ArrowIcon,
  CircleIcon,
  CopyIcon,
  ExpandIcon,
  GridIcon,
  HandIcon,
  LineIcon,
  PencilIcon,
  SelectIcon,
  SquareIcon,
  TextIcon,
  TrashIcon,
} from "../ui/Icons";

export interface WhiteboardBlockProps {
  initialSvg?: string;
  initialTool?: DrawingTool;
  drawingId?: string;
  busy?: boolean;
  onSave(svg: string): void | boolean | Promise<void | boolean>;
  onCancel(): void;
  onChange?(svg: string): void;
  onDirtyChange?(dirty: boolean): void;
  onSavingChange?(saving: boolean): void;
}

interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Arrastre de una o varias figuras a la vez. */
interface DragState {
  ids: string[];
  originals: DrawingShape[];
  start: Point;
  before: DrawingSnapshot;
  moved: boolean;
}

interface PanState {
  clientX: number;
  clientY: number;
  view: ViewBox;
}

interface PaperDragState {
  startX: number;
  startY: number;
  anchor: ShapeBounds;
  before: DrawingSnapshot;
}

type ResizeHandle = "nw" | "ne" | "sw" | "se";

interface ResizeState {
  id: string;
  handle: ResizeHandle;
  start: Point;
  original: DrawingShape;
  before: DrawingSnapshot;
  moved: boolean;
}

interface TextEditState {
  id: string;
  value: string;
}

function ToolIcon(props: { tool: DrawingTool }) {
  if (props.tool === "select") return <SelectIcon />;
  if (props.tool === "hand") return <HandIcon />;
  if (props.tool === "pen") return <PencilIcon />;
  if (props.tool === "rect") return <SquareIcon />;
  if (props.tool === "ellipse") return <CircleIcon />;
  if (props.tool === "line") return <LineIcon />;
  if (props.tool === "arrow") return <ArrowIcon />;
  return <TextIcon />;
}

function clamp(value: number, minimum = 0, maximum = CANVAS_WIDTH): number {
  return Math.max(minimum, Math.min(maximum, value));
}

/** Normaliza el papel y devuelve a la vez su rectángulo visible. */
function paperWithView(paper: ShapeBounds): { paper: ShapeBounds; view: ViewBox } {
  const next = normalizePaper(paper);
  return { paper: next, view: { x: next.x, y: next.y, width: next.width, height: next.height } };
}

function isDegenerateDraft(shape: DrawingShape): boolean {
  if (shape.kind === "path") {
    return shape.points.length < 2 || shape.points.every((point) => point.x === shape.x1 && point.y === shape.y1);
  }
  return Math.abs(shape.x2 - shape.x1) < 1 && Math.abs(shape.y2 - shape.y1) < 1;
}

function cloneShapes(shapes: DrawingShape[]): DrawingShape[] {
  return shapes.map((shape) => ({
    ...shape,
    points: shape.points.map((point) => ({ ...point })),
  }));
}

/** Una entrada del historial: las figuras y el tamaño del papel. */
interface DrawingSnapshot {
  shapes: DrawingShape[];
  paper: ShapeBounds;
}


function defaultDrawingColor(): string {
  if (typeof document === "undefined") return DEFAULT_DRAWING_COLOR;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue("--skin-toolbar-accent")
    .trim();
  return /^#[0-9a-f]{6}$/i.test(value) ? value : DEFAULT_DRAWING_COLOR;
}

function moveShape(shape: DrawingShape, dx: number, dy: number): DrawingShape {
  const x = clamp(shape.x1 + dx);
  const y = clamp(shape.y1 + dy, 0, CANVAS_HEIGHT);
  const boundedDx = x - shape.x1;
  const boundedDy = y - shape.y1;
  return {
    ...shape,
    x1: x,
    y1: y,
    x2: clamp(shape.x2 + boundedDx),
    y2: clamp(shape.y2 + boundedDy, 0, CANVAS_HEIGHT),
    points: shape.points.map((point) => ({
      x: clamp(point.x + boundedDx),
      y: clamp(point.y + boundedDy, 0, CANVAS_HEIGHT),
    })),
  };
}

function resizeShape(shape: DrawingShape, handle: ResizeHandle, dx: number, dy: number): DrawingShape {
  if (shape.kind === "text") {
    return { ...shape, x1: clamp(shape.x1 + dx), y1: clamp(shape.y1 + dy, 0, CANVAS_HEIGHT) };
  }
  const west = handle.includes("w");
  const north = handle.includes("n");
  const oppositeX = west ? shape.x2 : shape.x1;
  const oppositeY = north ? shape.y2 : shape.y1;
  let nextX1 = west ? clamp(shape.x1 + dx) : shape.x1;
  let nextY1 = north ? clamp(shape.y1 + dy, 0, CANVAS_HEIGHT) : shape.y1;
  let nextX2 = west ? shape.x2 : clamp(shape.x2 + dx);
  let nextY2 = north ? shape.y2 : clamp(shape.y2 + dy, 0, CANVAS_HEIGHT);
  if (nextX2 - nextX1 < 2) {
    if (west) nextX1 = nextX2 - 2;
    else nextX2 = nextX1 + 2;
  }
  if (nextY2 - nextY1 < 2) {
    if (north) nextY1 = nextY2 - 2;
    else nextY2 = nextY1 + 2;
  }
  const scaleX = (value: number): number =>
    oppositeX + ((value - oppositeX) * Math.max(2, nextX2 - nextX1)) / Math.max(2, Math.abs(shape.x2 - shape.x1));
  const scaleY = (value: number): number =>
    oppositeY + ((value - oppositeY) * Math.max(2, nextY2 - nextY1)) / Math.max(2, Math.abs(shape.y2 - shape.y1));
  return {
    ...shape,
    x1: nextX1,
    y1: nextY1,
    x2: nextX2,
    y2: nextY2,
    points: shape.points.map((point) => ({ x: scaleX(point.x), y: scaleY(point.y) })),
  };
}

function duplicateShape(shape: DrawingShape): DrawingShape {
  const offset = 24;
  const point = {
    x: clamp(shape.x1 + offset),
    y: clamp(shape.y1 + offset, 0, CANVAS_HEIGHT),
  };
  const copy = createDrawingShape(shape.kind, point, shape.color, shape.width);
  copy.x2 = clamp(shape.x2 + offset);
  copy.y2 = clamp(shape.y2 + offset, 0, CANVAS_HEIGHT);
  copy.points = shape.points.map((item) => ({
    x: clamp(item.x + offset),
    y: clamp(item.y + offset, 0, CANVAS_HEIGHT),
  }));
  copy.text = shape.text;
  return copy;
}

export function WhiteboardBlock(props: WhiteboardBlockProps) {
  const initialShapes = parseDrawingSvg(props.initialSvg ?? "");
  // El papel sobrevive en el propio SVG: si la nota se guardó tras redimensionar,
  // el lienzo vuelve a abrirse con ese tamaño en lugar de ajustarse al contenido.
  const initialPaper = normalizePaper(
    parseDrawingPaper(props.initialSvg ?? "") ?? drawingViewBox(initialShapes),
  );
  const initialDrawingId = props.drawingId ?? createDrawingId();
  const [drawingId] = createSignal(initialDrawingId);
  const initialTool = isDrawingTool(props.initialTool) ? props.initialTool : "pen";
  const [tool, setTool] = createSignal<DrawingTool>(initialTool);
  const [color, setColor] = createSignal(initialShapes[0]?.color ?? defaultDrawingColor());
  const [width, setWidth] = createSignal(initialShapes[0]?.width ?? 4);
  const [shapes, setShapes] = createSignal<DrawingShape[]>(initialShapes);
  const [paper, setPaper] = createSignal<ShapeBounds>(initialPaper);
  const [selection, setSelection] = createSignal<string[]>([]);
  const [marquee, setMarquee] = createSignal<ShapeBounds | null>(null);
  const [draft, setDraft] = createSignal<DrawingShape | null>(null);
  const [drag, setDrag] = createSignal<DragState | null>(null);
  const [resize, setResize] = createSignal<ResizeState | null>(null);
  const [pan, setPan] = createSignal<PanState | null>(null);
  const [paperDrag, setPaperDrag] = createSignal<PaperDragState | null>(null);
  const [undoStack, setUndoStack] = createSignal<DrawingSnapshot[]>([]);
  const [redoStack, setRedoStack] = createSignal<DrawingSnapshot[]>([]);
  const [saving, setSaving] = createSignal(false);
  const [view, setView] = createSignal<ViewBox>({
    x: initialPaper.x,
    y: initialPaper.y,
    width: initialPaper.width,
    height: initialPaper.height,
  });
  const [gridVisible, setGridVisible] = createSignal(true);
  const [expanded, setExpanded] = createSignal(false);
  const [textEdit, setTextEdit] = createSignal<TextEditState | null>(null);
  const markerPrefix = `inline-arrowhead-${createUniqueId()}`;
  let block: HTMLElement | undefined;
  let canvas: SVGSVGElement | undefined;
  let canvasWrap: HTMLDivElement | undefined;
  let canvasStage: HTMLDivElement | undefined;
  let textInput: HTMLInputElement | undefined;
  let expandedCanvasObserver: ResizeObserver | null = null;
  let styleBefore: DrawingSnapshot | null = null;
  let textBefore: DrawingSnapshot | null = null;

  const selectedId = createMemo(() => selection()[selection().length - 1] ?? null);
  const selectedShape = createMemo(() => shapes().find((shape) => shape.id === selectedId()) ?? null);
  const selectedShapes = createMemo(() => {
    const ids = new Set(selection());
    return shapes().filter((shape) => ids.has(shape.id));
  });
  const hasSelection = createMemo(() => selection().length > 0);
  // Único caso con tiradores de tamaño: exactamente una figura elegida.
  const singleSelection = createMemo(() => (selection().length === 1 ? selectedShape() : null));
  const zoomPercent = createMemo(() => Math.round((paper().width / view().width) * 100));
  // Mientras se edita un texto, su <text> del SVG se oculta: el input queda
  // encima y, si no, el mismo texto se veía dos veces superpuesto.
  const editingTextId = createMemo(() => textEdit()?.id ?? null);

  function fitExpandedCanvas(): void {
    if (!expanded() || !canvasWrap || !canvasStage) return;
    const style = getComputedStyle(canvasWrap);
    const availableWidth = Math.max(
      1,
      canvasWrap.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
    );
    const availableHeight = Math.max(
      1,
      canvasWrap.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom),
    );
    const current = paper();
    const ratio = current.width / Math.max(1, current.height);
    const width = Math.max(1, Math.floor(Math.min(availableWidth, availableHeight * ratio)));
    canvasStage.style.width = `${width}px`;
    canvasStage.style.height = `${width / ratio}px`;
  }

  function resetExpandedCanvasSize(): void {
    if (!canvasStage) return;
    if (expanded()) {
      fitExpandedCanvas();
      return;
    }
    canvasStage.style.width = "";
    canvasStage.style.height = "";
  }

  onMount(() => {
    queueMicrotask(() => block?.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true }));
    if (typeof ResizeObserver !== "undefined" && canvasWrap) {
      expandedCanvasObserver = new ResizeObserver(() => {
        if (expanded()) fitExpandedCanvas();
      });
      expandedCanvasObserver.observe(canvasWrap);
    }
  });

  createEffect(() => {
    expanded();
    queueMicrotask(resetExpandedCanvasSize);
  });

  // El gesto de redimensionar el papel se escucha en el documento: el puntero
  // puede acabar fuera de la esquina cuando se llega al límite del lienzo.
  createEffect(() => {
    if (!paperDrag()) return;
    const move = (event: PointerEvent): void => {
      if (!paperDrag()) return;
      event.preventDefault();
      resizePaperTo(event.clientX, event.clientY);
    };
    const end = (): void => finishPaperResize();
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", end);
    document.addEventListener("pointercancel", end);
    onCleanup(() => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", end);
      document.removeEventListener("pointercancel", end);
    });
  });

  onCleanup(() => expandedCanvasObserver?.disconnect());

  function capturePointer(event: PointerEvent): void {
    try {
      canvas?.setPointerCapture(event.pointerId);
    } catch {
      // Some embedded WebViews can reject capture for a cancelled pointer;
      // the regular pointer handlers still finish the gesture safely.
    }
  }

  function releasePointer(event: PointerEvent): void {
    try {
      if (canvas?.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    } catch {
      // The capture may already have been released by the WebView.
    }
  }

  function ensureContentVisible(nextShapes: DrawingShape[]): void {
    const bounds = drawingViewBox(nextShapes);
    const current = view();
    const width = Math.max(current.width, bounds.width);
    const height = Math.max(current.height, bounds.height);
    const containsBounds =
      bounds.x >= current.x &&
      bounds.y >= current.y &&
      bounds.x + bounds.width <= current.x + current.width &&
      bounds.y + bounds.height <= current.y + current.height;
    if (width <= current.width && height <= current.height && containsBounds) return;
    const centerX = current.x + current.width / 2;
    const centerY = current.y + current.height / 2;
    setView({
      x: clamp(centerX - width / 2, 0, Math.max(0, CANVAS_WIDTH - width)),
      y: clamp(centerY - height / 2, 0, Math.max(0, CANVAS_HEIGHT - height)),
      width,
      height,
    });
  }

  function currentSvg(nextShapes = shapes()): string {
    return serializeDrawing(nextShapes, drawingId(), paper());
  }

  function snapshot(): DrawingSnapshot {
    return { shapes: cloneShapes(shapes()), paper: { ...paper() } };
  }

  function applySnapshot(next: DrawingSnapshot): void {
    setShapes(next.shapes);
    setPaper(next.paper);
  }

  function markDirty(next = shapes()): void {
    props.onDirtyChange?.(true);
    props.onChange?.(currentSvg(next));
  }

  function pointFromEvent(event: PointerEvent): Point {
    const rect = canvas!.getBoundingClientRect();
    const currentView = view();
    return {
      x: clamp(currentView.x + ((event.clientX - rect.left) / rect.width) * currentView.width),
      y: clamp(
        currentView.y + ((event.clientY - rect.top) / rect.height) * currentView.height,
        0,
        CANVAS_HEIGHT,
      ),
    };
  }

  function commit(next: DrawingShape[]): void {
    setUndoStack((previous) => [...previous, snapshot()]);
    setRedoStack([]);
    setShapes(next);
    ensureContentVisible(next);
    markDirty(next);
  }

  function onPointerDown(event: PointerEvent): void {
    if (saving() || event.button !== 0) return;
    // The canvas is a custom editor, not a native drag surface. Consuming
    // the pointer keeps ProseMirror and the browser from selecting/scrolling
    // the note while a figure is being drawn.
    event.preventDefault();
    event.stopPropagation();
    canvas?.focus({ preventScroll: true });
    const point = pointFromEvent(event);
    const currentTool = tool();
    const resizeHandle = event.target instanceof Element
      ? event.target.getAttribute("data-resize-handle")
      : null;
    const selected = selectedShape();
    if (currentTool === "select" && resizeHandle && selected && ["nw", "ne", "sw", "se"].includes(resizeHandle)) {
      setResize({
        id: selected.id,
        handle: resizeHandle as ResizeHandle,
        start: point,
        original: { ...selected, points: selected.points.map((item) => ({ ...item })) },
        before: snapshot(),
        moved: false,
      });
      capturePointer(event);
      return;
    }
    if (currentTool === "hand") {
      setPan({ clientX: event.clientX, clientY: event.clientY, view: view() });
      capturePointer(event);
      return;
    }
    if (currentTool === "select") {
      const hit = [...shapes()].reverse().find((shape) => drawingShapeHits(shape, point));
      if (!hit) {
        // Clic en vacío con la herramienta de selección: el rectángulo marca el
        // área, igual que en Paint. Lo que quede dentro se selecciona.
        if (!event.shiftKey) setSelection([]);
        setMarquee({ x: point.x, y: point.y, width: 0, height: 0 });
        capturePointer(event);
        return;
      }
      // Pulsar sobre una figura ya seleccionada arrastra el grupo entero.
      const group = selection().includes(hit.id) ? selectedShapes() : [hit];
      if (!selection().includes(hit.id)) setSelection([hit.id]);
      setDrag({
        ids: group.map((shape) => shape.id),
        originals: group.map((shape) => ({
          ...shape,
          points: shape.points.map((item) => ({ ...item })),
        })),
        start: point,
        before: snapshot(),
        moved: false,
      });
      capturePointer(event);
      return;
    }
    if (currentTool === "text") {
      const selected = selectedShape();
      if (selected?.kind === "text" && drawingShapeHits(selected, point)) {
        startTextEditor(selected);
        return;
      }
      const shape = createDrawingShape("text", point, color(), width());
      shape.text = "Texto";
      commit([...shapes(), shape]);
      setSelection([shape.id]);
      startTextEditor(shape);
      return;
    }
    const kind: ShapeKind = currentTool === "pen" ? "path" : currentTool;
    setDraft(createDrawingShape(kind, point, color(), width()));
    capturePointer(event);
  }

  function onPointerMove(event: PointerEvent): void {
    if (!pan() && !resize() && !drag() && !draft() && !marquee()) return;
    event.preventDefault();
    event.stopPropagation();
    const activePan = pan();
    if (activePan) {
      const rect = canvas!.getBoundingClientRect();
      const dx = ((event.clientX - activePan.clientX) / rect.width) * activePan.view.width;
      const dy = ((event.clientY - activePan.clientY) / rect.height) * activePan.view.height;
      setView({
        ...activePan.view,
        x: clamp(activePan.view.x - dx, 0, Math.max(0, CANVAS_WIDTH - activePan.view.width)),
        y: clamp(
          activePan.view.y - dy,
          0,
          Math.max(0, CANVAS_HEIGHT - activePan.view.height),
        ),
      });
      return;
    }
    const activeResize = resize();
    if (activeResize) {
      const point = pointFromEvent(event);
      const dx = point.x - activeResize.start.x;
      const dy = point.y - activeResize.start.y;
      if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
        setResize({ ...activeResize, moved: true });
        setShapes((previous) =>
          previous.map((shape) =>
            shape.id === activeResize.id
              ? resizeShape(activeResize.original, activeResize.handle, dx, dy)
              : shape,
          ),
        );
      }
      return;
    }
    const activeDrag = drag();
    if (activeDrag) {
      const point = pointFromEvent(event);
      const dx = point.x - activeDrag.start.x;
      const dy = point.y - activeDrag.start.y;
      if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
        setDrag({ ...activeDrag, moved: true });
        setShapes((previous) => {
          // Cada figura se mueve desde SU posición original, no desde la
          // actual: si no, arrastrar dos veces acumularía el desplazamiento.
          const originals = new Map(activeDrag.originals.map((shape) => [shape.id, shape]));
          return previous.map((shape) => {
            const original = originals.get(shape.id);
            return original ? moveShape(original, dx, dy) : shape;
          });
        });
      }
      return;
    }
    const activeMarquee = marquee();
    if (activeMarquee) {
      const point = pointFromEvent(event);
      setMarquee(rectFromTo(activeMarquee, point));
      return;
    }
    const activeDraft = draft();
    if (!activeDraft) return;
    const point = pointFromEvent(event);
    setDraft({
      ...activeDraft,
      x2: point.x,
      y2: point.y,
      points: activeDraft.kind === "path" ? [...activeDraft.points, point] : activeDraft.points,
    });
  }

  function onPointerCancel(event: PointerEvent): void {
    event.preventDefault();
    event.stopPropagation();
    setMarquee(null);
    const activeResize = resize();
    if (activeResize) {
      applySnapshot(activeResize.before);
      setResize(null);
    }
    const activeDrag = drag();
    if (activeDrag) {
      applySnapshot(activeDrag.before);
      setDrag(null);
    }
    if (pan()) setPan(null);
    if (draft()) setDraft(null);
    releasePointer(event);
  }

  /**
   * Cierra el rectángulo de selección. Se seleccionan las figuras que TOCAN el
   * área, como en un escritorio o en Miro, y se conservan las que ya estaban
   * elegidas si se empezó con Shift.
   */
  function applyMarquee(): void {
    const area = marquee();
    setMarquee(null);
    if (!area) return;
    const inside = shapes()
      .filter((shape) => rectOverlapsShape(area, shape))
      .map((shape) => shape.id);
    if (inside.length === 0) return;
    setSelection([...new Set([...selection(), ...inside])]);
  }

  function onPointerUp(event: PointerEvent): void {
    if (pan() || resize() || drag() || draft()) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (marquee()) {
      releasePointer(event);
      applyMarquee();
      return;
    }
    if (pan()) {
      releasePointer(event);
      setPan(null);
      return;
    }
    const activeResize = resize();
    if (activeResize) {
      releasePointer(event);
      if (activeResize.moved) {
        setUndoStack((previous) => [...previous, activeResize.before]);
        setRedoStack([]);
        ensureContentVisible(shapes());
        markDirty();
      }
      setResize(null);
      return;
    }
    const activeDrag = drag();
    if (activeDrag) {
      releasePointer(event);
      if (activeDrag.moved) {
        setUndoStack((previous) => [...previous, activeDrag.before]);
        setRedoStack([]);
        ensureContentVisible(shapes());
        markDirty();
      }
      setDrag(null);
      return;
    }
    const activeDraft = draft();
    if (!activeDraft) return;
    releasePointer(event);
    if (isDegenerateDraft(activeDraft)) {
      setDraft(null);
      return;
    }
    commit([...shapes(), activeDraft]);
    setSelection([activeDraft.id]);
    setDraft(null);
  }

  function deleteSelected(): void {
    const ids = new Set(selection());
    if (ids.size === 0) return;
    commit(shapes().filter((shape) => !ids.has(shape.id)));
    setSelection([]);
  }

  function duplicateSelected(): void {
    const selected = selectedShapes();
    if (selected.length === 0) return;
    const copies = selected.map(duplicateShape);
    commit([...shapes(), ...copies]);
    setSelection(copies.map((shape) => shape.id));
  }

  function undo(): void {
    const history = undoStack();
    const previous = history[history.length - 1];
    if (!previous) return;
    setRedoStack((redo) => [...redo, snapshot()]);
    setUndoStack(history.slice(0, -1));
    applySnapshot(previous);
    setSelection([]);
    markDirty();
  }

  function redo(): void {
    const history = redoStack();
    const next = history[history.length - 1];
    if (!next) return;
    setUndoStack((undoHistory) => [...undoHistory, snapshot()]);
    setRedoStack(history.slice(0, -1));
    applySnapshot(next);
    setSelection([]);
    markDirty();
  }

  function beginStyleChange(): void {
    if (!styleBefore) styleBefore = snapshot();
  }

  function updateSelectedStyle(nextColor: string, nextWidth: number): void {
    setColor(nextColor);
    setWidth(nextWidth);
    const ids = new Set(selection());
    if (ids.size === 0) return;
    beginStyleChange();
    const next = shapes().map((shape) =>
      ids.has(shape.id) ? { ...shape, color: nextColor, width: nextWidth } : shape,
    );
    setShapes(next);
    markDirty(next);
  }

  function finishStyleChange(): void {
    if (!styleBefore) return;
    const before = styleBefore;
    styleBefore = null;
    setUndoStack((previous) => [...previous, before]);
    setRedoStack([]);
  }

  function chooseTool(nextTool: DrawingTool): void {
    if (textEdit()) finishTextEditor();
    setMarquee(null);
    setTool(nextTool);
  }

  function startTextEditor(shape: DrawingShape): void {
    textBefore = snapshot();
    setTextEdit({ id: shape.id, value: shape.text });
    queueMicrotask(() => textInput?.focus({ preventScroll: true }));
  }

  function updateText(value: string): void {
    const edit = textEdit();
    if (!edit) return;
    setTextEdit({ ...edit, value });
    const next = shapes().map((shape) => (shape.id === edit.id ? { ...shape, text: value } : shape));
    setShapes(next);
    markDirty(next);
  }

  function finishTextEditor(): void {
    const edit = textEdit();
    if (!edit) return;
    if (textBefore) {
      const before = textBefore;
      textBefore = null;
      setUndoStack((previous) => [...previous, before]);
      setRedoStack([]);
    }
    setTextEdit(null);
    textInput = undefined;
    ensureContentVisible(shapes());
    if (edit.value.trim() === "") {
      const next = shapes().filter((shape) => shape.id !== edit.id);
      setShapes(next);
      setSelection([]);
      ensureContentVisible(next);
      markDirty(next);
    }
  }

  function cancelTextEditor(): void {
    const edit = textEdit();
    if (!edit) return;
    if (textBefore) {
      applySnapshot(textBefore);
      setSelection([]);
      markDirty();
      textBefore = null;
    }
    setTextEdit(null);
    textInput = undefined;
  }

  function onDoubleClick(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const point = pointFromEvent(event as unknown as PointerEvent);
    const hit = [...shapes()].reverse().find((shape) => drawingShapeHits(shape, point));
    if (hit?.kind === "text") {
      setSelection([hit.id]);
      startTextEditor(hit);
    }
  }

  function zoom(factor: number): void {
    const current = view();
    const base = paper();
    const minimumWidth = Math.max(MIN_PAPER_WIDTH / 2, base.width / 2);
    const maximumWidth = Math.min(CANVAS_WIDTH, Math.max(base.width * 2, CANVAS_WIDTH));
    let width = clamp(current.width / factor, minimumWidth, maximumWidth);
    let height = width * (base.height / base.width);
    if (height > CANVAS_HEIGHT) {
      height = CANVAS_HEIGHT;
      width = Math.min(CANVAS_WIDTH, height * (base.width / base.height));
    }
    const centerX = current.x + current.width / 2;
    const centerY = current.y + current.height / 2;
    setView({
      x: clamp(centerX - width / 2, 0, Math.max(0, CANVAS_WIDTH - width)),
      y: clamp(centerY - height / 2, 0, Math.max(0, CANVAS_HEIGHT - height)),
      width,
      height,
    });
  }

  function resetView(): void {
    setView(paperWithView(paper()).view);
  }

  // --- Redimensionado del papel -------------------------------------------
  // La esquina inferior derecha arrastra el borde del papel. El gesto vive
  // fuera del <svg> para que ProseMirror y las herramientas de dibujo no lo
  // interpreten como un trazo.
  function startPaperResize(event: PointerEvent): void {
    if (saving() || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    setPaperDrag({
      startX: event.clientX,
      startY: event.clientY,
      anchor: paper(),
      before: snapshot(),
    });
    const handle = event.currentTarget;
    try {
      if (handle instanceof Element) (handle as HTMLElement).setPointerCapture?.(event.pointerId);
    } catch {
      // Algunos WebView embebidos rechazan la captura; los handlers de
      // pointermove del documento cierran el gesto igualmente.
    }
  }

  function resizePaperTo(clientX: number, clientY: number): void {
    const active = paperDrag();
    if (!active || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const currentView = view();
    const dx = ((clientX - active.startX) / rect.width) * currentView.width;
    const dy = ((clientY - active.startY) / rect.height) * currentView.height;
    const next = paperWithView({
      x: active.anchor.x,
      y: active.anchor.y,
      width: active.anchor.width + dx,
      height: active.anchor.height + dy,
    });
    setPaper(next.paper);
    setView(next.view);
    if (expanded()) fitExpandedCanvas();
  }

  /** Alternativa de teclado al arrastre de la esquina. */
  function nudgePaper(event: KeyboardEvent): void {
    const step = event.shiftKey ? 80 : 20;
    const horizontal = event.key === "ArrowRight" ? step : event.key === "ArrowLeft" ? -step : 0;
    const vertical = event.key === "ArrowDown" ? step : event.key === "ArrowUp" ? -step : 0;
    if (horizontal === 0 && vertical === 0) return;
    event.preventDefault();
    event.stopPropagation();
    const current = paper();
    const before = snapshot();
    const next = paperWithView({
      x: current.x,
      y: current.y,
      width: current.width + horizontal,
      height: current.height + vertical,
    });
    setPaper(next.paper);
    setView(next.view);
    setUndoStack((previous) => [...previous, before]);
    setRedoStack([]);
    markDirty();
  }

  function finishPaperResize(): void {
    const active = paperDrag();
    if (!active) return;
    setPaperDrag(null);
    const next = paper();
    if (next.width === active.anchor.width && next.height === active.anchor.height) return;
    setUndoStack((previous) => [...previous, active.before]);
    setRedoStack([]);
    markDirty();
  }

  function moveToolFocus(event: KeyboardEvent, container: HTMLElement): void {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const controls = [...container.querySelectorAll<HTMLButtonElement>("button:not(:disabled)")];
    if (!controls.length) return;
    const current = controls.indexOf(document.activeElement as HTMLButtonElement);
    let next = current;
    if (event.key === "Home") next = 0;
    else if (event.key === "End") next = controls.length - 1;
    else if (event.key === "ArrowRight") next = (Math.max(current, 0) + 1) % controls.length;
    else next = (Math.max(current, 0) - 1 + controls.length) % controls.length;
    event.preventDefault();
    event.stopPropagation();
    controls[next]?.focus({ preventScroll: true });
  }

  function nudgeSelected(event: KeyboardEvent): boolean {
    if (!hasSelection() || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
      return false;
    }
    const amount = event.shiftKey ? 10 : 1;
    const dx = event.key === "ArrowLeft" ? -amount : event.key === "ArrowRight" ? amount : 0;
    const dy = event.key === "ArrowUp" ? -amount : event.key === "ArrowDown" ? amount : 0;
    const ids = new Set(selection());
    commit(shapes().map((shape) => (ids.has(shape.id) ? moveShape(shape, dx, dy) : shape)));
    return true;
  }

  async function save(): Promise<void> {
    if (saving()) return;
    setSaving(true);
    props.onSavingChange?.(true);
    try {
      await props.onSave(currentSvg());
    } finally {
      setSaving(false);
      props.onSavingChange?.(false);
    }
  }

  return (
    <section
      ref={(element) => (block = element)}
      class={`${styles.block} ${expanded() ? styles.expanded : ""}`}
      aria-label="Editor de pizarra"
      aria-busy={saving()}
      onKeyDown={(event) => {
        const target = event.target;
        if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
          if (event.key === "Escape" && textEdit()) {
            event.preventDefault();
            cancelTextEditor();
          }
          return;
        }
        if (event.key === "Escape" && marquee()) {
          event.preventDefault();
          setMarquee(null);
          return;
        }
        if (event.key === "Escape" && expanded() && !textEdit()) {
          event.preventDefault();
          setExpanded(false);
          return;
        }
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
          event.preventDefault();
          event.shiftKey ? redo() : undo();
        } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "d") {
          event.preventDefault();
          duplicateSelected();
        } else if (nudgeSelected(event)) {
          event.preventDefault();
        } else if (event.key === "Delete" || event.key === "Backspace") {
          event.preventDefault();
          deleteSelected();
        } else if (event.key === "Escape") {
          if (textEdit()) cancelTextEditor();
          else if (!saving()) props.onCancel();
        } else if (event.key === "+" || event.key === "=") {
          event.preventDefault();
          zoom(1.15);
        } else if (event.key === "-") {
          event.preventDefault();
          zoom(0.87);
        }
      }}
    >
      <div
        class={styles.toolbar}
        role="toolbar"
        aria-orientation="horizontal"
        aria-label="Herramientas de pizarra"
        onKeyDown={(event) => moveToolFocus(event, event.currentTarget)}
      >
        <div class={styles.toolGroup} role="group" aria-label="Herramientas">
          <For each={DRAWING_TOOLS}>
            {(item) => (
              <button
                type="button"
                class={tool() === item.id ? styles.active : styles.toolButton}
                aria-label={item.label}
                aria-pressed={tool() === item.id}
                aria-keyshortcuts={item.id === "select" ? "Escape" : undefined}
                title={item.label}
                onClick={() => chooseTool(item.id)}
              >
                <ToolIcon tool={item.id} />
              </button>
            )}
          </For>
        </div>
        <div class={styles.styleControls}>
          <label class={styles.color}>
            <span>Color</span>
            <input
              type="color"
              value={color()}
              aria-label="Color de la herramienta"
              onInput={(event) => updateSelectedStyle(event.currentTarget.value, width())}
              onChange={finishStyleChange}
            />
          </label>
          <label class={styles.widthControl}>
            <span>Grosor</span>
            <input
              type="range"
              min="1"
              max="16"
              value={width()}
              aria-label="Grosor de la herramienta"
              onInput={(event) => updateSelectedStyle(color(), Number(event.currentTarget.value))}
              onChange={finishStyleChange}
            />
          </label>
        </div>
        <div class={styles.canvasControls} role="group" aria-label="Controles del lienzo">
          <button type="button" onClick={() => zoom(0.87)} aria-label="Alejar" title="Alejar">−</button>
          <button type="button" class={styles.zoomLabel} onClick={resetView} title="Restablecer zoom">
            {zoomPercent()}%
          </button>
          <button type="button" onClick={() => zoom(1.15)} aria-label="Acercar" title="Acercar">+</button>
          <button
            type="button"
            class={gridVisible() ? styles.activeControl : undefined}
            aria-label="Mostrar u ocultar cuadrícula"
            aria-pressed={gridVisible()}
            title="Cuadrícula"
            onClick={() => setGridVisible((value) => !value)}
          >
            <GridIcon />
          </button>
        </div>
        <div class={styles.toolbarActions}>
          <button type="button" disabled={undoStack().length === 0} onClick={undo} title="Deshacer (Ctrl+Z)">↶</button>
          <button type="button" disabled={redoStack().length === 0} onClick={redo} title="Rehacer (Ctrl+Shift+Z)">↷</button>
          <button type="button" disabled={!hasSelection()} onClick={duplicateSelected} aria-label="Duplicar figura" title="Duplicar (Ctrl+D)">
            <CopyIcon />
          </button>
          <button
            type="button"
            class={styles.deleteButton}
            disabled={!hasSelection()}
            onClick={deleteSelected}
            aria-label="Eliminar figura"
            title="Eliminar"
          >
            <TrashIcon />
          </button>
          <button
            type="button"
            class={expanded() ? styles.activeControl : undefined}
            aria-label={expanded() ? "Cerrar lienzo grande" : "Abrir lienzo grande"}
            aria-pressed={expanded()}
            title="Abrir en grande"
            onClick={() => setExpanded((value) => !value)}
          >
            <ExpandIcon />
          </button>
          <Button onClick={props.onCancel} disabled={saving()}>Cerrar</Button>
          <Button variant="primary" disabled={saving() || props.busy} onClick={() => void save()}>
            {saving() || props.busy ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </div>
      <div
        ref={(element) => (canvasWrap = element)}
        class={`${styles.canvasWrap} ${gridVisible() ? styles.grid : ""}`}
        onWheel={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        <div
          ref={(element) => (canvasStage = element)}
          class={styles.canvasStage}
          style={`--canvas-editor-width: ${paper().width}px; --canvas-editor-ratio: ${paper().width} / ${paper().height};`}
        >
          <svg
            ref={(element) => (canvas = element)}
            class={styles.canvas}
            viewBox={`${view().x} ${view().y} ${view().width} ${view().height}`}
            preserveAspectRatio="none"
            style={`width: 100%; height: 100%; cursor:${tool() === "hand" ? (pan() ? "grabbing" : "grab") : tool() === "select" ? "default" : "crosshair"};`}
          role="application"
          aria-label="Lienzo de la pizarra"
          tabindex="0"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onDblClick={onDoubleClick}
          onWheel={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (!event.ctrlKey && !event.metaKey) return;
            zoom(event.deltaY < 0 ? 1.1 : 0.9);
          }}
          onContextMenu={(event) => event.preventDefault()}
        >
          <defs>
            <For each={shapes().filter((shape) => shape.kind === "arrow")}>
              {(shape) => (
                <marker
                  id={`${markerPrefix}-${shape.id}`}
                  markerWidth="10"
                  markerHeight="7"
                  refX="9"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon points="0 0, 10 3.5, 0 7" fill={shape.color} />
                </marker>
              )}
            </For>
          </defs>
          <For each={shapes()}>
            {(shape) => (
              <>
                {shape.kind === "rect" && <rect x={Math.min(shape.x1, shape.x2)} y={Math.min(shape.y1, shape.y2)} width={Math.abs(shape.x2 - shape.x1)} height={Math.abs(shape.y2 - shape.y1)} fill="none" stroke={shape.color} stroke-width={shape.width} />}
                {shape.kind === "ellipse" && <ellipse cx={(shape.x1 + shape.x2) / 2} cy={(shape.y1 + shape.y2) / 2} rx={Math.abs(shape.x2 - shape.x1) / 2} ry={Math.abs(shape.y2 - shape.y1) / 2} fill="none" stroke={shape.color} stroke-width={shape.width} />}
                {shape.kind === "line" && <line x1={shape.x1} y1={shape.y1} x2={shape.x2} y2={shape.y2} stroke={shape.color} stroke-width={shape.width} stroke-linecap="round" />}
                {shape.kind === "arrow" && <line x1={shape.x1} y1={shape.y1} x2={shape.x2} y2={shape.y2} stroke={shape.color} stroke-width={shape.width} stroke-linecap="round" marker-end={`url(#${markerPrefix}-${shape.id})`} />}
                {shape.kind === "path" && <polyline points={shape.points.map((point) => `${point.x},${point.y}`).join(" ")} fill="none" stroke={shape.color} stroke-width={shape.width} stroke-linecap="round" stroke-linejoin="round" />}
                {shape.kind === "text" && shape.id !== editingTextId() && <text x={shape.x1} y={shape.y1} fill={shape.color} font-family="sans-serif" font-size="24">{shape.text}</text>}
              </>
            )}
          </For>
          <Show when={draft()}>
            {(shape) => (
              <>
                {shape().kind === "rect" && <rect x={Math.min(shape().x1, shape().x2)} y={Math.min(shape().y1, shape().y2)} width={Math.abs(shape().x2 - shape().x1)} height={Math.abs(shape().y2 - shape().y1)} fill="none" stroke={shape().color} stroke-width={shape().width} stroke-dasharray="8 6" />}
                {shape().kind === "ellipse" && <ellipse cx={(shape().x1 + shape().x2) / 2} cy={(shape().y1 + shape().y2) / 2} rx={Math.abs(shape().x2 - shape().x1) / 2} ry={Math.abs(shape().y2 - shape().y1) / 2} fill="none" stroke={shape().color} stroke-width={shape().width} stroke-dasharray="8 6" />}
                {shape().kind === "line" && <line x1={shape().x1} y1={shape().y1} x2={shape().x2} y2={shape().y2} stroke={shape().color} stroke-width={shape().width} stroke-dasharray="8 6" />}
                {shape().kind === "arrow" && <line x1={shape().x1} y1={shape().y1} x2={shape().x2} y2={shape().y2} stroke={shape().color} stroke-width={shape().width} stroke-dasharray="8 6" />}
                {shape().kind === "path" && <polyline points={shape().points.map((point) => `${point.x},${point.y}`).join(" ")} fill="none" stroke={shape().color} stroke-width={shape().width} stroke-dasharray="8 6" />}
              </>
            )}
          </Show>
          {/* Cada figura elegida se resalta por separado, para que un grupo se
              lea como varias piezas y no como una sola silueta. */}
          <For each={selectedShapes()}>
            {(shape) => {
              const box = drawingShapeBounds(shape);
              return (
                <rect
                  class={styles.selectionOutline}
                  x={box.x - 8}
                  y={box.y - 8}
                  width={box.width + 16}
                  height={box.height + 16}
                  stroke={shape.color}
                  pointer-events="none"
                />
              );
            }}
          </For>
          {/* Los tiradores de tamaño solo con una única figura: estirar un grupo
              exigiría decidir qué se mantiene fijo, y no está definido. */}
          <Show when={singleSelection()}>
            {(shape) => {
              const handles = () => {
                const current = drawingShapeBounds(shape());
                return [
                  { id: "nw" as const, x: current.x - 12, y: current.y - 12 },
                  { id: "ne" as const, x: current.x + current.width + 4, y: current.y - 12 },
                  { id: "sw" as const, x: current.x - 12, y: current.y + current.height + 4 },
                  { id: "se" as const, x: current.x + current.width + 4, y: current.y + current.height + 4 },
                ];
              };
              return (
                <>
                  <For each={handles()}>
                    {(handle) => (
                      <rect
                        data-resize-handle={handle.id}
                        x={handle.x}
                        y={handle.y}
                        width="8"
                        height="8"
                        rx="2"
                        fill={shape().color}
                        stroke="var(--skin-note-background)"
                        stroke-width="1"
                        pointer-events="all"
                      />
                    )}
                  </For>
                </>
              );
            }}
          </Show>
          <Show when={marquee()}>
            {(area) => (
              <rect
                class={styles.marquee}
                x={area().x}
                y={area().y}
                width={area().width}
                height={area().height}
                pointer-events="none"
              />
            )}
          </Show>
          </svg>
          <Show when={textEdit()}>
          {(edit) => {
            const shape = () => shapes().find((candidate) => candidate.id === edit().id);
            const position = () => {
              const current = shape();
              const currentView = view();
              if (!current) return { left: "50%", top: "50%" };
              return {
                left: `${((current.x1 - currentView.x) / currentView.width) * 100}%`,
                top: `${((current.y1 - currentView.y) / currentView.height) * 100}%`,
              };
            };
            return (
              <input
                ref={(element) => (textInput = element)}
                class={styles.textEditor}
                style={`left:${position().left};top:${position().top};color:${shape()?.color ?? "currentColor"};`}
                value={edit().value}
                aria-label="Editar texto del dibujo"
                onInput={(event) => updateText(event.currentTarget.value)}
                onBlur={finishTextEditor}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    finishTextEditor();
                  } else if (event.key === "Escape") {
                    event.preventDefault();
                    cancelTextEditor();
                  }
                }}
              />
            );
          }}
          </Show>
          <Show when={!textEdit()}>
            <div
              class={`${styles.paperHandle} ${paperDrag() ? styles.paperHandleActive : ""}`}
              role="button"
              tabIndex={saving() ? -1 : 0}
              aria-label="Redimensionar el papel"
              title="Arrastra o usa las flechas para cambiar el tamaño del papel"
              onPointerDown={startPaperResize}
              onKeyDown={nudgePaper}
            >
              <span aria-hidden="true" />
            </div>
          </Show>
        </div>
        <Show when={saving()}>
          <span class="sr-only" role="status">Guardando pizarra…</span>
        </Show>
      </div>
    </section>
  );
}
