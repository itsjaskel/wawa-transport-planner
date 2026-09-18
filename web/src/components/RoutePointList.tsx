// Lista numerada de los puntos de una ruta, con el mismo número que su marcador en el mapa.
import type { RoutePoint } from '../api/types';
import styles from '../styles/RoutePointList.module.css';

// Decimales al mostrar coordenadas: suficientes para ubicar el punto sin llenar la pantalla.
const DISPLAYED_COORDINATE_DECIMALS = 5;

/** Escribe latitud y longitud de un punto, siempre en ese orden. */
function formatCoordinates(point: RoutePoint): string {
  const lat = point.lat.toFixed(DISPLAYED_COORDINATE_DECIMALS);
  const lng = point.lng.toFixed(DISPLAYED_COORDINATE_DECIMALS);
  return `${lat}, ${lng}`;
}

/** Muestra los puntos de la ruta en orden, con su nombre si lo tienen y sus coordenadas. */
export function RoutePointList({ points }: { points: RoutePoint[] }) {
  return (
    <ol className={styles.routePointList}>
      {points.map((point, pointIndex) => (
        <li key={`${pointIndex}-${point.lat}-${point.lng}`} className={styles.pointItem}>
          <span className={styles.pointNumber} aria-hidden="true">
            {pointIndex + 1}
          </span>
          <span className={styles.pointText}>
            <span className={styles.pointName}>{point.name ?? `Punto ${pointIndex + 1}`}</span>
            <span className={styles.pointCoordinates}>{formatCoordinates(point)}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
