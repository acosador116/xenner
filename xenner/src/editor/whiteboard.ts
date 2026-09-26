export const WHITEBOARD_CAPTION = "xenner:pizarra";

export interface DrawingPreviewVisibility {
  /** El lienzo ya está montado. */
  editing: boolean;
  /** El lienzo se está abriendo (guarda asíncrona de otra pizarra). */
  starting: boolean;
  /** El SVG tiene al menos una figura. */
  hasContent: boolean;
}

/**
 * Si el nodo debe mostrar la imagen del dibujo o dejarla paso al lienzo.
 *
 * El editor se incrusta en el MISMO nodo que la vista previa, de modo que
 * mostrarlas a la vez pone el lienzo DEBAJO del dibujo en vez de en su lugar.
 * Regla: la imagen solo se ve con el editor cerrado y con algo que enseñar; un
 * borrador recién creado no debe dejar un tablero en blanco de 320x200.
 */
export function shouldShowDrawingPreview(state: DrawingPreviewVisibility): boolean {
  return !state.editing && !state.starting && state.hasContent;
}

interface MarkdownAstNode {
  type: string;
  url?: string;
  title?: string | null;
  children?: MarkdownAstNode[];
}

export function isWhiteboardCaption(value: unknown): boolean {
  return value === WHITEBOARD_CAPTION;
}

export function isWhiteboardSource(value: unknown): boolean {
  return (
    typeof value === "string" &&
    /^data:image\/svg\+xml;base64,[A-Za-z0-9+/]*={0,2}$/.test(value)
  );
}

function isMarkedWhiteboardImage(node: MarkdownAstNode): boolean {
  return (
    (node.type === "image" || node.type === "image-block") &&
    isWhiteboardCaption(node.title) &&
    isWhiteboardSource(node.url)
  );
}

export function transformWhiteboardAst(value: unknown): void {
  if (!value || typeof value !== "object") return;
  const node = value as MarkdownAstNode;

  if (
    node.type === "paragraph" &&
    node.children?.length === 1 &&
    node.children[0] &&
    isMarkedWhiteboardImage(node.children[0])
  ) {
    node.type = "whiteboard";
    node.url = node.children[0].url;
    delete node.children;
    return;
  }

  if (node.type === "image-block" && isMarkedWhiteboardImage(node)) {
    node.type = "whiteboard";
    return;
  }

  for (const child of node.children ?? []) transformWhiteboardAst(child);
}
