import { defineConfig } from 'vite';

// GitHub Pages serves the site from /ashraf-alqaisse-portfolio/
export default defineConfig({
  base: '/ashraf-alqaisse-portfolio/',
  // three.js lives in its own lazy-loaded chunk (~140 kB gzip), loaded after first paint
  build: { chunkSizeWarningLimit: 700 },
});
