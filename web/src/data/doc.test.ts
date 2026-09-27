import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { DOC_TREE } from './doc.ts';

/**
 * El índice y la página no pueden desincronizarse.
 *
 * `DOC_TREE` pinta las dos barras laterales y la barra del móvil. Si la página
 * gana un apartado y el índice no, ese apartado queda inalcanzable desde la
 * navegación: se llega escribiendo la URL a mano. Y al revés: un enlace del
 * índice que no lleva a ningún sitio es peor, porque la gente lo pulsa.
 *
 * Se comprueba en las dos direcciones, y el texto también, porque un `label`
 * desfasado hace que el enlace y el título digan cosas distintas.
 *
 * El índice se lee del código fuente y no de `dist/`, para que el test no
 * necesite una compilación previa y se pueda ejecutar suelto.
 */
const PAGINA = fileURLToPath(new URL('../pages/doc.astro', import.meta.url));
const DOCS_LAYOUT = fileURLToPath(new URL('../layouts/DocsLayout.astro', import.meta.url));

test('el índice tiene lo mismo que los encabezados de la página', () => {
  const fuente = readFileSync(PAGINA, 'utf-8');

  // Los encabezados reales, en orden, quitando lo que se pinta desde
  // `data/skins.ts` (los `componente-*`, que solo existen en el HTML final) y
  // lo que pertenece al layout.
  const ids: { nivel: 2 | 3; id: string; texto: string }[] = [];
  for (const coincidencia of fuente.matchAll(
    /<h([23]) id="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>/g,
  )) {
    const id = coincidencia[2];
    if (id === 'drawer-title' || id === 'otras-title' || id === 'toc-title') continue;
    const texto = coincidencia[3]
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      // `section()` concatena expresiones; solo se comparan los literales.
      .replace(/' \+ [^+]* \+ '/g, '')
      .trim();
    ids.push({ nivel: Number(coincidencia[1]) as 2 | 3, id, texto });
  }

  assert.ok(ids.length > 0, 'no se ha encontrado ningún encabezado en doc.astro');

  // 1. Todo <h2> de la página está en el índice, y en el mismo orden.
  const h2DeLaPagina = ids.filter((h) => h.nivel === 2).map((h) => h.id);
  const h2DelIndice = DOC_TREE.map((n) => n.id);
  assert.deepEqual(
    h2DelIndice,
    h2DeLaPagina,
    'los <h2> de la página y las secciones del índice no coinciden, o no están en el mismo orden',
  );

  // 2. Los <h3> de cada sección de la página están en el índice de esa misma
  //    sección. Se agrupan por el <h2> que los precede, que es como está
  //    escrita la página.
  const subsPorSeccion = new Map<string, string[]>();
  let seccion: string | null = null;
  for (const h of ids) {
    if (h.nivel === 2) {
      seccion = h.id;
      subsPorSeccion.set(h.id, []);
      continue;
    }
    // Los `componente-*` los pinta `section()` desde `data/skins.ts` y no están
    // escritos aquí como encabezados literales.
    if (seccion && !h.id.startsWith('componente-')) subsPorSeccion.get(seccion)?.push(h.id);
  }

  for (const nodo of DOC_TREE) {
    const enLaPagina = subsPorSeccion.get(nodo.id) ?? [];
    const enElIndice = (nodo.subs ?? []).map((s) => s.id);
    for (const h3 of enLaPagina) {
      assert.ok(
        enElIndice.includes(h3),
        `el apartado «${h3}» no está en el índice de «${nodo.id}»`,
      );
    }
  }

  // 3. Y al revés: ningún enlace del índice apunta a la nada.
  const existentes = new Set(ids.map((h) => h.id));
  for (const nodo of DOC_TREE) {
    assert.ok(existentes.has(nodo.id), `«${nodo.id}» no tiene encabezado en la página`);
    for (const sub of nodo.subs ?? []) {
      assert.ok(
        existentes.has(sub.id) || sub.id.startsWith('componente-'),
        `«${sub.id}» no tiene encabezado en la página`,
      );
    }
  }
});

test('los identificadores del índice son únicos', () => {
  const vistos = new Set<string>();
  const repetidos: string[] = [];
  for (const nodo of DOC_TREE) {
    for (const id of [nodo.id, ...(nodo.subs ?? []).map((s) => s.id)]) {
      if (vistos.has(id)) repetidos.push(id);
      vistos.add(id);
    }
  }
  assert.deepEqual(repetidos, [], 'hay identificadores repetidos en el índice');
});

test('cada apartado del índice lleva el texto del encabezado', () => {
  const fuente = readFileSync(PAGINA, 'utf-8');
  for (const nodo of DOC_TREE) {
    const patron = new RegExp(`<h2 id="${nodo.id}"[^>]*>([\\s\\S]*?)</h2>`);
    const encontrado = patron.exec(fuente);
    assert.ok(encontrado, `no se encuentra el <h2> de «${nodo.id}»`);
    const texto = encontrado[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    assert.equal(
      texto,
      nodo.label,
      `el índice dice «${nodo.label}» y el encabezado dice «${texto}»`,
    );
  }
});

test('DOC_TREE está ordenado como se lee, no alfabéticamente', () => {
  // La página es una secuencia y el índice tiene que respectarlo. Esta
  // comprobación existe para que nadie lo vuelva a ordenar con un `sort()`
  // creyendo que es un detalle de estilo.
  const primero = DOC_TREE[0];
  assert.equal(primero.id, 'que-es', 'el índice debería empezar por «Qué es una skin»');

  const alfabetico = [...DOC_TREE].map((n) => n.label).sort();
  const real = DOC_TREE.map((n) => n.label);
  assert.notDeepEqual(
    real,
    alfabetico,
    'el índice ha quedado ordenado alfabéticamente; la página es una secuencia',
  );
});

test('el ejemplo viene después de los temas que necesita', () => {
  // La sección «Una skin desde cero» presupone que ya se han explicado el
  // formato, los colores, las claves, las imágenes y el CSS. Si alguien la
  // mueve, quien la lea se pierde.
  const orden = DOC_TREE.map((n) => n.id);
  const antes = ['formato', 'colores', 'claves', 'imagenes', 'css'];
  const posEjemplo = orden.indexOf('ejemplo');
  for (const id of antes) {
    assert.ok(
      orden.indexOf(id) < posEjemplo,
      `«${id}» debería explicarse antes que «ejemplo»`,
    );
  }
});

test('el resaltado tiene los ganchos que necesita, y no se rompe en silencio', () => {
  const layout = readFileSync(DOCS_LAYOUT, 'utf-8');

  /*
    El script del resaltado no lanza error si le falta un `data-*`: simplemente
    no hace nada y la página queda con un índice que no se mueve. Eso no se ve
    en una compilación ni en la consola, así que se comprueba aquí. Si alguien
    renombra un atributo, este test es lo que lo dice.
  */
  for (const gancho of [
    'data-doc-main',
    'data-doc-index',
    'data-doc-rail',
    'data-here-bar',
    'data-here-num',
    'data-here-label',
  ]) {
    assert.ok(
      layout.includes(gancho),
      `falta «${gancho}» en el layout: el resaltado se quedaría parado sin avisar`,
    );
  }

  // Los tres índices tienen que llevar `data-doc-index`, o quedaría un
  // índice —el del cajón— que no se enciende nunca. Se cuentan solo los
  // `<nav>`, porque el script vuelve a mencionar el atributo al consultarlo.
  const indices = layout.match(/<nav[^>]*\sdata-doc-index/g) ?? [];
  assert.equal(
    indices.length,
    3,
    `se esperaban 3 índices (izquierda, derecha y cajón) y hay ${indices.length}`,
  );
});

test('el cajón de móvil está en el markup, no solo en el script', () => {
  const layout = readFileSync(DOCS_LAYOUT, 'utf-8');
  // Si el botón para abrirlo desaparece, el cajón queda inalcanzable en móvil
  // y solo se ve hurting en un móvil de verdad.
  for (const trozo of [
    'data-drawer-open',
    'data-drawer',
    'aria-modal',
    'data-drawer-close',
  ]) {
    assert.ok(layout.includes(trozo), `el cajón necesita «${trozo}»`);
  }
  assert.ok(
    layout.includes('aria-controls="doc-drawer"'),
    'el botón tiene que decir qué cajón abre, con aria-controls',
  );
  assert.ok(
    layout.includes('aria-expanded="false"'),
    'el botón tiene que arrancar con aria-expanded="false"',
  );
});
