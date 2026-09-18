// Aviso de que un duty no se pudo asignar porque la unidad ya tiene otro en esa ventana.
import { Link } from 'react-router';
import type { ConflictingDuty } from '../api/types';
import styles from '../styles/DutyConflictWarning.module.css';
import { formatLocalWindow } from '../utils/dateTime';

interface DutyConflictWarningProps {
  conflictingDuty: ConflictingDuty;
  currentRouteId: string;
}

/** Explica con qué duty choca la asignación y, si es de otra ruta, enlaza a ella. */
export function DutyConflictWarning({ conflictingDuty, currentRouteId }: DutyConflictWarningProps) {
  const isOnCurrentRoute = conflictingDuty.routeId === currentRouteId;
  const conflictWindow = formatLocalWindow(conflictingDuty.startAt, conflictingDuty.endAt);

  return (
    <div className={styles.dutyConflictWarning} role="alert">
      <p className={styles.title}>No se pudo asignar: la unidad está ocupada.</p>
      <p className={styles.detail}>
        La unidad <strong>{conflictingDuty.unitCode}</strong> ya tiene un duty el {conflictWindow}{' '}
        {isOnCurrentRoute ? (
          'en esta misma ruta.'
        ) : (
          <>
            en la ruta{' '}
            <Link to={`/routes/${conflictingDuty.routeId}`}>{conflictingDuty.routeName}</Link>.
          </>
        )}
      </p>
      <p className={styles.hint}>Elige otra unidad u otro horario.</p>
    </div>
  );
}
