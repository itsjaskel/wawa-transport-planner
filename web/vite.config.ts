import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const DEV_SERVER_PORT = 5173;
// Dentro de un contenedor hay que escuchar en todas las interfaces: por defecto
// Vite solo atiende en localhost y el host no podría abrir la web.
const ALL_NETWORK_INTERFACES = '0.0.0.0';

export default defineConfig({
  plugins: [react()],
  server: {
    host: ALL_NETWORK_INTERFACES,
    port: DEV_SERVER_PORT,
    watch: {
      // Los eventos del sistema de archivos no cruzan el limite entre Windows o macOS
      // y el contenedor Linux: sin sondeo periódico la recarga en caliente no llega.
      usePolling: true,
      interval: 300,
    },
  },
});
