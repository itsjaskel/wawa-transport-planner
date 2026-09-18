// Mapa de pantallas de la aplicación: qué pantalla corresponde a cada dirección.
import { createBrowserRouter, Navigate } from 'react-router';
import App from './App';
import { NotFoundPage } from './pages/NotFoundPage';
import { RouteDetailPage } from './pages/RouteDetailPage';
import { RouteFormPage } from './pages/RouteFormPage';
import { RoutesPage } from './pages/RoutesPage';
import { UnitsPage } from './pages/UnitsPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      // La pantalla de inicio es el listado de rutas.
      { index: true, element: <Navigate to="/routes" replace /> },
      { path: 'routes', element: <RoutesPage /> },
      { path: 'routes/new', element: <RouteFormPage /> },
      { path: 'routes/:routeId', element: <RouteDetailPage /> },
      { path: 'routes/:routeId/edit', element: <RouteFormPage /> },
      { path: 'units', element: <UnitsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
