// Tabla de los duties de una ruta: unidad, inicio, fin, duración y la acción de eliminar.
import { useState } from 'react';
import type { RouteDuty } from '../api/types';
import { useDeleteDuty } from '../hooks/useDeleteDuty';
import styles from '../styles/DutyList.module.css';
import { formatDuration, formatLocalDateTime, formatUtcOffset } from '../utils/dateTime';
import { Button } from './Button';
import { ConfirmDialog } from './ConfirmDialog';

interface DutyListProps {
  routeId: string;
  duties: RouteDuty[];
  onDutyDeleted: (successMessage: string) => void;
}

/** Celda con una fecha en hora local y su desfase UTC debajo. */
function LocalDateTimeCell({ isoDate }: { isoDate: string }) {
  return (
    <td>
      {formatLocalDateTime(isoDate)}
      <span className={styles.offset}>{formatUtcOffset(new Date(isoDate))}</span>
    </td>
  );
}

/** Lista los duties de la ruta y permite eliminar cada uno, pidiendo confirmación antes. */
export function DutyList({ routeId, duties, onDutyDeleted }: DutyListProps) {
  const [dutyPendingDeletion, setDutyPendingDeletion] = useState<RouteDuty | null>(null);
  const deleteDuty = useDeleteDuty(routeId);

  /** Cierra el diálogo sin borrar y olvida cualquier error del intento anterior. */
  function cancelDeletion() {
    setDutyPendingDeletion(null);
    deleteDuty.reset();
  }

  /** Borra el duty elegido y, si sale bien, cierra el diálogo y avisa a la pantalla. */
  function confirmDeletion() {
    if (!dutyPendingDeletion) {
      return;
    }
    const deletedUnitCode = dutyPendingDeletion.unit.code;
    deleteDuty.mutate(dutyPendingDeletion.id, {
      onSuccess: () => {
        setDutyPendingDeletion(null);
        onDutyDeleted(`Duty de ${deletedUnitCode} eliminado.`);
      },
    });
  }

  let deletionDescription = '';
  if (dutyPendingDeletion) {
    deletionDescription =
      `Se eliminará el duty de ${dutyPendingDeletion.unit.code} que empieza el ` +
      `${formatLocalDateTime(dutyPendingDeletion.startAt)}. Esta acción no se puede deshacer.`;
  }

  return (
    <>
      {deleteDuty.isError && (
        <p className={styles.deleteError} role="alert">
          No se pudo eliminar el duty: {deleteDuty.error.message}
        </p>
      )}

      {/* La tabla puede ser más ancha que un móvil: se desplaza dentro de su caja, no la página. */}
      <div className={styles.tableScroller}>
        <table className={styles.dutyTable}>
          <thead>
            <tr>
              <th scope="col">Unidad</th>
              <th scope="col">Inicio</th>
              <th scope="col">Fin</th>
              <th scope="col">Duración</th>
              <th scope="col">
                <span className={styles.visuallyHidden}>Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {duties.map((duty) => (
              <tr key={duty.id}>
                <td>
                  <span className={styles.unitCode}>{duty.unit.code}</span>
                  <span className={styles.unitName}>{duty.unit.name}</span>
                </td>
                <LocalDateTimeCell isoDate={duty.startAt} />
                <LocalDateTimeCell isoDate={duty.endAt} />
                <td>{formatDuration(duty.startAt, duty.endAt)}</td>
                <td className={styles.actionsCell}>
                  <Button variant="danger" onClick={() => setDutyPendingDeletion(duty)}>
                    Eliminar
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        isOpen={dutyPendingDeletion !== null}
        title="¿Eliminar este duty?"
        description={deletionDescription}
        confirmLabel="Eliminar duty"
        isConfirming={deleteDuty.isPending}
        onConfirm={confirmDeletion}
        onCancel={cancelDeletion}
      />
    </>
  );
}
