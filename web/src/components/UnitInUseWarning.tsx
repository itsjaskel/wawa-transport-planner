// Aviso de que una unidad no se puede borrar porque tiene duties, con enlaces a las rutas donde están.
import { Link } from 'react-router';
import type { UnitDutyRoute } from '../api/types';
import styles from '../styles/UnitInUseWarning.module.css';

interface UnitInUseWarningProps {
  message: string;
  unitDutyRoutes: UnitDutyRoute[];
}

/** Escribe cuántos duties hay en una ruta, en singular o plural. */
function formatDutyCount(dutyCount: number): string {
  if (dutyCount === 1) {
    return '1 duty';
  }
  return `${dutyCount} duties`;
}

/** Explica por qué no se pudo borrar la unidad y lleva a las rutas donde tiene duties. */
export function UnitInUseWarning({ message, unitDutyRoutes }: UnitInUseWarningProps) {
  return (
    <div className={styles.unitInUseWarning} role="alert">
      <p className={styles.title}>{message}</p>
      {unitDutyRoutes.length > 0 && (
        <>
          <p className={styles.hint}>Sus duties están en:</p>
          <ul className={styles.routeList}>
            {unitDutyRoutes.map((unitDutyRoute) => (
              <li key={unitDutyRoute.id}>
                <Link to={`/routes/${unitDutyRoute.id}`}>{unitDutyRoute.name}</Link> (
                {formatDutyCount(unitDutyRoute.dutyCount)})
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
