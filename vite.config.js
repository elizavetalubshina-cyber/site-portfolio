import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        // GitHub Pages serves dist/404.html for any address it cannot
        // match, so the file only has to exist at the root of the build.
        notFound: resolve(__dirname, '404.html'),
        vsSubtitles: resolve(__dirname, 'cases/vs-subtitles.html'),
        vsEcosystem: resolve(__dirname, 'cases/vs-ecosystem.html'),
        satellite: resolve(__dirname, 'cases/satellite.html'),
        tracktice: resolve(__dirname, 'cases/tracktice.html'),
        designSystem: resolve(__dirname, 'cases/design-system.html'),
      },
    },
  },
});
