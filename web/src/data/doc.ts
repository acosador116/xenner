/**
 * El índice de la documentación.
 *
 * Es la fuente de verdad de las dos barras laterales y del bloque «en esta
 * página» del cuerpo. No se escribe a mano para no tener tres copias que se
 * desincronicen: `doc.test.ts` compara esto contra los encabezados que salen
 * realmente en la página, en las dos direcciones, así que un `<h2>` nuevo sin
 * su entrada aquí rompe la compilación.
 *
 * Los identificadores de los archivos de componente (`componente-note`…) los
 * genera `doc.astro` al pintar la referencia, y salen de `data/skins.ts`. Si
 * añades un componente allí, añádelo también aquí.
 */

export interface DocNode {
  /** El `id` del encabezado, sin la almohadilla. */
  id: string;
  /** El texto del encabezado. */
  label: string;
  /** Los `<h3>` de dentro de esta sección, en orden. */
  subs?: { id: string; label: string }[];
}

/**
 * Ordenado a mano, no alfabético.
 *
 * A diferencia de Astro Starlight, que ordena sus barras alfabéticamente, aquí
 * el orden importa: la página es una secuencia. De «qué es esto» a «hazlo en
 * cinco minutos» a «las claves» a «las imágenes» a «CSS» a «una entera desde
 * cero» a «si no funciona». Quien llega por el ejemplo y salte a CSS tiene que
 * poder asumir que hay siete cosas antes.
 */
export const DOC_TREE: readonly DocNode[] = [
  { id: 'que-es', label: 'Qué es una skin' },
  {
    id: 'cinco-minutos',
    label: 'La primera, en cinco minutos',
    subs: [
      { id: 'abre-la-carpeta-de-skins', label: 'Abre la carpeta de skins' },
      { id: 'duplica-una', label: 'Duplica una' },
      { id: 'cambia-un-color', label: 'Cambia un color' },
      { id: 'eligela', label: 'Elígela' },
    ],
  },
  { id: 'archivos', label: 'De qué archivos está hecha' },
  { id: 'formato', label: 'El formato, que son tres reglas' },
  { id: 'colores', label: 'Los colores' },
  {
    id: 'claves',
    label: 'Todas las claves',
    subs: [
      { id: 'como-se-escribe', label: 'Cómo se escribe' },
      { id: 'las-ocho-que-valen-en-todas-partes', label: 'Las ocho que valen en todas partes' },
      { id: 'las-claves-de-cada-archivo', label: 'Las claves de cada archivo' },
      { id: 'componente-background', label: 'background.txt — El fondo' },
      { id: 'componente-sidebar', label: 'sidebar.txt — La lista de notas' },
      { id: 'componente-note', label: 'note.txt — La nota' },
      { id: 'componente-button', label: 'button.txt — Los botones' },
      { id: 'componente-input', label: 'input.txt — Los campos de escritura' },
      { id: 'componente-toolbar', label: 'toolbar.txt — La barra del editor' },
      { id: 'el-manifiesto', label: 'El manifiesto' },
    ],
  },
  {
    id: 'imagenes',
    label: 'Imágenes, iconos y tipografías',
    subs: [
      { id: 'nombrar-un-archivo', label: 'Nombrar un archivo' },
      { id: 'un-fondo-de-foto', label: 'Un fondo de foto' },
      { id: 'iconos-propios-y-por-que-un-svg-solo', label: 'Iconos propios, y por qué un SVG solo' },
      { id: 'un-marco-alrededor-de-las-notas', label: 'Un marco alrededor de las notas' },
      { id: 'tipografias', label: 'Tipografías' },
    ],
  },
  {
    id: 'css',
    label: 'Cambiarlo todo con CSS',
    subs: [
      { id: 'empezar', label: 'Empezar' },
      { id: 'a-que-se-puede-agarrar-data-x', label: 'A qué se puede agarrar: data-x' },
      { id: 'y-dentro-del-texto-de-la-nota', label: 'Y dentro del texto de la nota' },
      { id: 'un-color-para-de-dia-y-otro-para-de-noche', label: 'Un color para de día y otro para de noche' },
      { id: 'anadir-cosas-que-no-estaban', label: 'Añadir cosas que no estaban' },
      { id: 'cosas-que-tambien-funcionan', label: 'Cosas que también funcionan' },
    ],
  },
  {
    id: 'ejemplo',
    label: 'Una skin desde cero',
    subs: [
      { id: 'la-carpeta-y-el-manifiesto', label: '1. La carpeta y el manifiesto' },
      { id: 'elegir-los-colores-antes-de-escribir-nada', label: '2. Elegir los colores antes de escribir nada' },
      { id: 'los-seis-archivos', label: '3. Los seis archivos' },
      { id: 'activarla-y-mirarla', label: '4. Activarla y mirarla' },
      { id: 'la-variante-de-noche', label: '5. La variante de noche' },
      { id: 'un-detalle-la-tipografia-de-la-nota', label: '6. Un detalle: la tipografía de la nota' },
    ],
  },
  {
    id: 'problemas',
    label: 'Si no funciona',
    subs: [
      { id: 'la-skin-no-aparece-en-la-lista', label: 'La skin no aparece en la lista' },
      { id: 'cambie-un-color-y-no-pasa-nada', label: 'Cambié un color y no pasa nada' },
      { id: 'una-imagen-no-se-ve', label: 'Una imagen no se ve' },
      { id: 'el-texto-no-se-lee', label: 'El texto no se lee' },
      { id: 'se-aplica-a-medias', label: 'Se aplica a medias' },
      { id: 'la-ventana-se-ve-rara-o-se-descuadra', label: 'La ventana se ve rara o se descuadra' },
      { id: 'el-texto-de-la-nota-no-cambia-de-aspecto', label: 'El texto de la nota no cambia de aspecto' },
      { id: 'y-si-nada-de-esto-es', label: 'Y si nada de esto es' },
    ],
  },
  {
    id: 'limites',
    label: 'Lo que no se puede',
    subs: [
      { id: 'para-compartirla', label: 'Para compartirla' },
      { id: 'skins-de-ejemplo-para-copiar', label: 'Skins de ejemplo para copiar' },
    ],
  },
];
