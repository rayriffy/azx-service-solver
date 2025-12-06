import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import wasm from 'vite-plugin-wasm'

// https://vite.dev/config/
export default defineConfig({
  base: '/azx-service-solver/',
  plugins: [
    react(),
    tailwindcss(),
    wasm()
  ],
  worker: {
    format: 'es',
    plugins: () => [wasm()]
  },
  optimizeDeps: {
    exclude: ['azx_solver']
  }
})
