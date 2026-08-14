import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        vsSubtitles: resolve(__dirname, 'cases/vs-subtitles.html'),
        vsEcosystem: resolve(__dirname, 'cases/vs-ecosystem.html'),
        satellite: resolve(__dirname, 'cases/satellite.html'),
        tracktice: resolve(__dirname, 'cases/tracktice.html'),
        designSystem: resolve(__dirname, 'cases/design-system.html'),
      },
    },
  },
});
