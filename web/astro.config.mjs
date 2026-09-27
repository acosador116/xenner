// @ts-check
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

const site = process.env.SITE_URL;

/* Sin SITE_URL la web funciona igual, pero se queda sin canonical, sin sitemap
   y sin sitemap en robots.txt: justo las tres cosas que Google necesita para
   saber qué URL es la buena. Aviso en el build, que es donde se entera quien
   despliega. */
if (!site) {
  console.warn(
    '\n[xenner] SITE_URL no está definida: no se generarán canonical, sitemap ' +
      'ni la línea Sitemap de robots.txt.\n[xenner] Copia .env.example a .env y ' +
      'pon SITE_URL=https://tu-dominio.example\n',
  );
}

export default defineConfig({
  site,
  output: 'static',
  // Sin isla hidratada: la página es HTML y CSS. La maqueta de la app y el
  // interruptor claro/oscuro son CSS puro, así que no hace falta React.
  integrations: site ? [sitemap()] : [],
  build: {
    inlineStylesheets: 'auto',
  },
  vite: {
    build: {
      cssMinify: 'lightningcss',
    },
  },
});
