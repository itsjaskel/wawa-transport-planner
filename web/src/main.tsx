// Punto de entrada del frontend: monta React con TanStack Query y el enrutador, y carga los
// estilos globales (base y Leaflet).
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router/dom';
import 'leaflet/dist/leaflet.css';
import { ApiError } from './api/client';
import { router } from './router';
import './styles/base.css';
import './styles/leaflet-overrides.css';

const MAX_QUERY_RETRIES = 1;
const FIRST_SERVER_ERROR_STATUS = 500;

/** Decide si reintentar una lectura fallida: sí ante fallos de red o del servidor, nunca ante un 4xx. */
function shouldRetryQuery(failureCount: number, error: Error): boolean {
  // Un 404 o un 400 no se arreglan reintentando: solo harían esperar más al usuario.
  const isClientError = error instanceof ApiError && error.statusCode < FIRST_SERVER_ERROR_STATUS;
  if (isClientError) {
    return false;
  }
  return failureCount < MAX_QUERY_RETRIES;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: shouldRetryQuery },
  },
});

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('No se encontró el elemento #root en index.html.');
}

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
