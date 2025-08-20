// Vite configuration for MoebiusXBIN web version
import { defineConfig } from 'vite';
import legacy from '@vitejs/plugin-legacy';

export default defineConfig({
  root: 'app/web',
  plugins: [
    legacy({
      targets: ['defaults', 'not IE 11']
    })
  ],
  build: {
    outDir: '../../dist/web',
    rollupOptions: {
      input: {
        main: 'app/web/index.html'
      }
    },
    sourcemap: true,
    minify: 'terser'
  },
  server: {
    port: 3000,
    host: true,
    open: false
  },
  preview: {
    port: 4173,
    host: true
  },
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development')
  },
  resolve: {
    alias: {
      '@': '/app/web'
    }
  }
});