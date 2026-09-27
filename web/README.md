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
- La imagen social se genera desde `public/og-xenner.svg`:

```bash
pnpm assets:og
```

## Arquitectura

- `src/pages/index.astro`: contenido y composición de la landing.
- `src/components/AppWindow.astro`: la maqueta de la ventana de la app.
- `src/components/appwindow.css`: sus tokens y el interruptor claro/oscuro.
- `src/layouts/BaseLayout.astro`: metadatos, canonical, Open Graph y JSON-LD.
- `src/styles/global.css`: tokens del sitio y estilos base.
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
