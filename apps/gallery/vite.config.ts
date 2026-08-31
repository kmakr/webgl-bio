import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { imagetools } from 'vite-imagetools';

export default defineConfig({
  plugins: [
    react(),
    // The regex include (rather than the default glob) also matches uppercase .JPG.
    imagetools({ include: /\.(jpe?g|png|webp|avif|tiff|gif)(\?.*)?$/i }),
  ],
  server: {
    port: Number(process.env.PORT) || 5199,
  },
});
