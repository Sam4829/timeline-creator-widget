import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import path from 'path';

export default defineConfig({
  plugins: [
    preact(),
    {
      name: 'fix-inline-css-import',
      resolveId(id) {
        if (id.startsWith('!')) {
          return path.resolve(__dirname, 'src', id.slice(3)); // '!./ui.css' -> 'src/ui.css'
        }
      }
    }
  ],
  resolve: {
    alias: {
      '@create-figma-plugin/utilities': path.resolve(__dirname, 'src/dev/utilitiesMock.ts')
    }
  }
});
