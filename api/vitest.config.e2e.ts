import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // Los tests de integracion comparten una base real: si corriesen en paralelo
    // se pisarian los datos entre archivos.
    fileParallelism: false,
  },
});
