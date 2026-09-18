// Pantalla del listado de rutas: nombre, cantidad de puntos y última actualización.
import { Link } from 'react-router';
import type { RouteSummary } from '../api/types';
import { ButtonLink } from '../components/Button';
import { StatusMessage } from '../components/StatusMessage';
import { useRoutes } from '../hooks/useRoutes';
import styles from '../styles/RoutesPage.module.css';
import { formatLocalDateTime } from '../utils/dateTime';

/** Escribe la cantidad de puntos con su palabra en singular o plural. */
function formatPointCount(pointCount: number): string {
  if (pointCount === 1) {
    return '1 punto';
  }
  return `${pointCount} puntos`;
}

/** Tarjeta de una ruta del listado, que lleva a su detalle. */
function RouteSummaryCard({ routeSummary }: { routeSummary: RouteSummary }) {
  return (
    <li className={styles.routeCard}>
      <Link to={`/routes/${routeSummary.id}`} className={styles.routeLink}>
        {routeSummary.name}
      </Link>
      <span className={styles.routeMeta}>{formatPointCount(routeSummary.pointCount)}</span>
      <span className={styles.routeMeta}>
        Actualizada el {formatLocalDateTime(routeSummary.updatedAt)}
      </span>
    </li>
  );
}

/** Contenido del listado según el estado de la consulta: cargando, error, vacío o la lista. */
function RoutesList() {
  const { data: routeSummaries, isPending, isError, error } = useRoutes();

  if (isPending) {
    return <StatusMessage kind="loading" title="Cargando rutas…" />;
  }

  if (isError) {
    return (
      <StatusMessage kind="error" title="No se pudieron cargar las rutas.">
        {error.message}
      </StatusMessage>
    );
  }

  if (routeSummaries.length === 0) {
    return (
      <StatusMessage kind="empty" title="Todavía no hay rutas.">
        Crea la primera con el botón «Nueva ruta»: podrás marcar sus puntos en el mapa.
      </StatusMessage>
    );
  }

  return (
    <ul className={styles.routeList}>
      {routeSummaries.map((routeSummary) => (
        <RouteSummaryCard key={routeSummary.id} routeSummary={routeSummary} />
      ))}
    </ul>
  );
}

/** Pantalla principal: listado de rutas con el acceso a crear una nueva. */
export function RoutesPage() {
  return (
    <section>
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Rutas</h1>
        <ButtonLink to="/routes/new">Nueva ruta</ButtonLink>
      </header>
      <RoutesList />
    </section>
  );
}
