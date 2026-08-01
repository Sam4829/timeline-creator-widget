import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import path from 'path';

export default defineConfig({
  plugins: [preact()],
  resolve: {
    alias: {
      '@create-figma-plugin/utilities': path.resolve(__dirname, 'src/dev/utilitiesMock.ts')
    }
  }
});
