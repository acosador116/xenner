// @ts-check
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

const site = process.env.SITE_URL;

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
