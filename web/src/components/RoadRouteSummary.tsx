// Resumen del recorrido por calles bajo el mapa: distancia y tiempo estimados, o por qué se muestra
// la línea recta.
import styles from '../styles/RoadRouteSummary.module.css';
import { formatDistance, formatTravelTime } from '../utils/measurements';
import type { RoadRoute } from '../api/roadRouting';

interface RoadRouteSummaryProps {
  roadRoute: RoadRoute | undefined;
  isCalculating: boolean;
  hasFailed: boolean;
}

/** Muestra la distancia y el tiempo del recorrido por calles, o avisa de que se usa la línea recta. */
export function RoadRouteSummary({ roadRoute, isCalculating, hasFailed }: RoadRouteSummaryProps) {
  if (isCalculating) {
    return <p className={styles.roadRouteSummary}>Calculando el recorrido por calles…</p>;
  }

  if (hasFailed || !roadRoute) {
    return (
      <p className={`${styles.roadRouteSummary} ${styles.fallback}`}>
        No se pudo calcular el recorrido por calles: el mapa une los puntos en línea recta.
      </p>
    );
  }

  return (
    <p className={styles.roadRouteSummary}>
      Recorrido por calles: <strong>{formatDistance(roadRoute.distanceMeters)}</strong> ·{' '}
      <strong>{formatTravelTime(roadRoute.durationSeconds)}</strong> en coche, aproximadamente.{' '}
      <span className={styles.source}>
        Trazado con{' '}
        <a href="https://project-osrm.org/" target="_blank" rel="noreferrer">
          OSRM
        </a>
        .
      </span>
    </p>
  );
}
