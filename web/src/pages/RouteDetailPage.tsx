// Pantalla de detalle de una ruta: mapa y puntos, sus duties y el formulario para asignar uno nuevo.
import { useCallback, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import { ApiError } from '../api/client';
import type { Route } from '../api/types';
import { ButtonLink } from '../components/Button';
import { DutyForm } from '../components/DutyForm';
import { DutyList } from '../components/DutyList';
import { RouteMap } from '../components/RouteMap';
import { RoutePointList } from '../components/RoutePointList';
import { StatusMessage } from '../components/StatusMessage';
import { SuccessNotice } from '../components/SuccessNotice';
import { useRoute } from '../hooks/useRoute';
import { useRouteDuties } from '../hooks/useRouteDuties';
import styles from '../styles/RouteDetailPage.module.css';

const HTTP_STATUS_NOT_FOUND = 404;

/** Estado que otras pantallas dejan al navegar aquí, por ejemplo tras guardar la ruta. */
interface RouteDetailLocationState {
  successMessage?: string;
}

/** Duties de la ruta según el estado de la consulta: cargando, error, vacío o la tabla. */
function RouteDutiesSection({
  routeId,
  onDutyDeleted,
}: {
  routeId: string;
  onDutyDeleted: (successMessage: string) => void;
}) {
  const { data: duties, isPending, isError, error } = useRouteDuties(routeId);

  if (isPending) {
    return <StatusMessage kind="loading" title="Cargando duties…" />;
  }
  if (isError) {
    return (
      <StatusMessage kind="error" title="No se pudieron cargar los duties.">
        {error.message}
      </StatusMessage>
    );
  }
  if (duties.length === 0) {
    return (
      <StatusMessage kind="empty" title="Esta ruta todavía no tiene duties.">
        Asigna el primero con el formulario de arriba.
      </StatusMessage>
    );
  }
  return <DutyList routeId={routeId} duties={duties} onDutyDeleted={onDutyDeleted} />;
}

/** Contenido de la ruta ya cargada: cabecera, mapa, puntos y duties. */
function RouteDetail({
  route,
  initialSuccessMessage,
}: {
  route: Route;
  initialSuccessMessage: string | null;
}) {
  const [successMessage, setSuccessMessage] = useState<string | null>(initialSuccessMessage);
  const dismissSuccessMessage = useCallback(() => setSuccessMessage(null), []);

  return (
    <>
      <header className={styles.pageHeader}>
        <div>
          <Link to="/routes" className={styles.backLink}>
            ← Rutas
          </Link>
          <h1 className={styles.pageTitle}>{route.name}</h1>
        </div>
        <ButtonLink to={`/routes/${route.id}/edit`} variant="secondary">
          Editar ruta
        </ButtonLink>
      </header>

      <SuccessNotice message={successMessage} onDismiss={dismissSuccessMessage} />

      <div className={styles.mapLayout}>
        <div className={styles.mapColumn}>
          <RouteMap points={route.points} />
        </div>
        <section className={styles.pointsColumn} aria-labelledby="route-points-title">
          <h2 id="route-points-title" className={styles.sectionTitle}>
            Puntos ({route.points.length})
          </h2>
          <RoutePointList points={route.points} />
        </section>
      </div>

      <section className={styles.dutiesSection} aria-labelledby="route-duties-title">
        <h2 id="route-duties-title" className={styles.sectionTitle}>
          Duties
        </h2>
        <div className={styles.dutyFormCard}>
          <h3 className={styles.cardTitle}>Asignar un duty</h3>
          <DutyForm routeId={route.id} onDutyCreated={setSuccessMessage} />
        </div>
        <RouteDutiesSection routeId={route.id} onDutyDeleted={setSuccessMessage} />
      </section>
    </>
  );
}

/** Pantalla de detalle: carga la ruta de la dirección y muestra su contenido o por qué no se pudo. */
export function RouteDetailPage() {
  const { routeId } = useParams<{ routeId: string }>();
  const location = useLocation();
  const { data: route, isPending, isError, error } = useRoute(routeId);
  const locationState = location.state as RouteDetailLocationState | null;

  if (isPending) {
    return <StatusMessage kind="loading" title="Cargando la ruta…" />;
  }

  if (isError) {
    const isMissingRoute = error instanceof ApiError && error.statusCode === HTTP_STATUS_NOT_FOUND;
    const errorTitle = isMissingRoute ? 'Esta ruta no existe.' : 'No se pudo cargar la ruta.';
    return (
      <StatusMessage kind="error" title={errorTitle}>
        <Link to="/routes">Volver al listado de rutas</Link>
      </StatusMessage>
    );
  }

  return (
    <RouteDetail
      key={route.id}
      route={route}
      initialSuccessMessage={locationState?.successMessage ?? null}
    />
  );
}
