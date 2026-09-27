# xenner — sitio público

Landing estática de producto construida con Astro. El sitio no sustituye a la app
de escritorio: explica qué hace Xenner, cómo guarda tus notas y en qué estado
está.

## Comandos

```bash
pnpm install
pnpm dev
pnpm check
pnpm build
pnpm preview
```

La salida estática se genera en `dist/`.

## URL y SEO

Copia `.env.example` a `.env` y configura el dominio final:

```bash
SITE_URL=https://tu-dominio.example
```

- Si `SITE_URL` está definida, Astro genera el sitemap y `robots.txt` enlaza al
  `sitemap-index.xml`.
- Los canonical y metadatos sociales respetan ese mismo dominio.
- **Sin `SITE_URL` no hay canonical, ni sitemap, ni línea `Sitemap` en
  `robots.txt`.** Es el ajuste más importante del despliegue; por eso el build
  avisa por consola cuando falta.
- La imagen social se genera desde `public/og-xenner.svg`:

```bash
pnpm assets:og
```

### Cómo está montado el SEO

Una página por intención de búsqueda, en `src/pages/`, con la lista en
`src/data/guide.ts`. Cada una declara su `title` y su `description`: son
distintas a propósito, porque compiten por búsquedas distintas y Google solo
puede positionar una por término.

- **Títulos de 50-60 caracteres y descripciones de 140-160.** Medido con el
  script de `pnpm build`; es el rango en el que Google no recorta.
- **Un solo `<h1>` por página**, con la palabra que se busca. La portada lo
  lleva en el título grande; las páginas de la guía, en su `heading`.
- **Enlaces internos**: la cabecera, el pie, la portada y el 404 apuntan a las
  páginas de la guía.
- **Sin `meta keywords`.** Google no las usa: "The meta-keyword tag is not used
  by Google Search, and it has no effect on indexing and ranking at all"
  ([documentación][special-tags]). Las palabras van en el título, en el texto y
  en los datos estructurados.
- **Datos estructurados** en `BaseLayout.astro`: `WebSite`, `WebPage` y
  `SoftwareApplication`. Ojo: para que Google muestre el resultado enriquecido
  de una app **exige una valoración o reseña** ([documentación][software-app])
  y Xenner no tiene ninguna. Se deja el marcado, que es válido, pero no se
  inventan reseñas: hacerlo sería una infracción que puede acabar en acción
  manual.
- **La etiqueta de verificación** de Search Console está en `BaseLayout.astro`:
  es una etiqueta `google-site-verification` en la página de nivel superior. Se
  puede cambiar sin tocar el código con `PUBLIC_GOOGLE_SITE_VERIFICATION`.
- **Sin JavaScript para el SEO.** No hay islas hidratadas: el texto llega en el
  HTML. La animación de entrada solo se oculta si hay un script que la revierta
  (`.js .reveal` en `global.css`).

[special-tags]: https://developers.google.com/search/docs/crawling-indexing/special-tags
[software-app]: https://developers.google.com/search/docs/appearance/structured-data/software-app

### Después de publicar

1. Comprobar el dominio en Search Console con la etiqueta del `head`.
2. Enviar el sitemap: <https://tu-dominio.example/sitemap-index.xml>.
3. Pedir la indexación de la portada con la **URL Inspection**.
4. Tarda días. Google avisa por correo cuando la propiedad esté verificada.

## Arquitectura

- `src/pages/index.astro`: portada.
- `src/pages/{editor-de-notas,notas-markdown,skins,pizarra,alternativa-notion,instalar}.astro`:
  una página por búsqueda, con el texto en el propio archivo.
- `src/data/guide.ts`: títulos, resúmenes y rutas de esas páginas. La navegación
  se genera desde aquí, así que añadir una página es añadir una entrada.
- `src/layouts/GuideLayout.astro`: cabecera, breadcrumbs, artículo, enlaces a las
  demás páginas y pie.
- `src/config.ts`: nombre del sitio y URL del repositorio.
- `src/components/AppWindow.astro`: la maqueta de la ventana de la app.
- `src/components/appwindow.css`: sus tokens y el interruptor claro/oscuro.
- `src/layouts/BaseLayout.astro`: metadatos, canonical, Open Graph, JSON-LD y la
  etiqueta de verificación.
- `src/styles/global.css`: tokens del sitio, estilos base y la prosa de la guía.
- `public/`: favicon, manifest e imagen social.

## Decisiones

- **Sin framework de interfaz.** No hay islas hidratadas ni JavaScript de
  terceros: el sitio se renderiza entero como HTML y CSS. La maqueta de la app
  y su interruptor claro/oscuro son CSS puro (un checkbox que conmuta tokens).
  Por eso no hay dependencia de React ni integración que lo registre.
- **La maqueta usa los mismos colores que la app.** La paleta base clara vive
  en `xenner/src/styles/global.css`; si cambia ahí, hay que actualizarla en
  `appwindow.css`. Los contrastes están calculados: el gris apagado de la app
  (`#787774`, 4.48:1 sobre blanco) queda por debajo de AA, así que la maqueta
  lo oscurece a `#726f64` (5.03:1).
- **La web es siempre clara.** Se declara `color-scheme: light` y un único
  `theme-color` claro; anunciar soporte de oscuro hacía que la barra del
  navegador se pusiera oscura sobre una página de papel.
- **El contenido describe lo que la app hace hoy.** Si cambia una función,
  cambia la web en el mismo commit.
