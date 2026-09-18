// Tabla de unidades con la edición del nombre en la propia fila y el borrado con confirmación.
import { useState, type FormEvent } from 'react';
import { ApiError } from '../api/client';
import type { Unit } from '../api/types';
import { useDeleteUnit } from '../hooks/useDeleteUnit';
import { useUpdateUnit } from '../hooks/useUpdateUnit';
import styles from '../styles/UnitsTable.module.css';
import { groupFieldMessages } from '../utils/invalidFields';
import { Button } from './Button';
import { ConfirmDialog } from './ConfirmDialog';
import { FieldErrors } from './FieldErrors';
import { UnitInUseWarning } from './UnitInUseWarning';

interface UnitsTableProps {
  units: Unit[];
  onUnitChanged: (successMessage: string) => void;
}

interface UnitRowProps {
  unit: Unit;
  onRequestDeletion: (unit: Unit) => void;
  onUnitChanged: (successMessage: string) => void;
}

/** Fila de una unidad: muestra código y nombre, y permite editar el nombre en el sitio. */
function UnitRow({ unit, onRequestDeletion, onUnitChanged }: UnitRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState(unit.name);
  const updateUnit = useUpdateUnit();
  const nameMessages = groupFieldMessages(updateUnit.error).name;
  const nameInputId = `unit-name-${unit.id}`;

  /** Abre la edición con el nombre actual. */
  function startEditing() {
    setNameDraft(unit.name);
    updateUnit.reset();
    setIsEditing(true);
  }

  /** Guarda el nombre nuevo; al terminar bien cierra la edición y avisa a la pantalla. */
  function saveName(submitEvent: FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault();
    updateUnit.mutate(
      { unitId: unit.id, name: nameDraft },
      {
        onSuccess: (updatedUnit) => {
          setIsEditing(false);
          onUnitChanged(`Nombre de ${updatedUnit.code} actualizado.`);
        },
      },
    );
  }

  if (isEditing) {
    return (
      <tr>
        <td className={styles.unitCode}>{unit.code}</td>
        <td colSpan={2}>
          <form className={styles.editForm} onSubmit={saveName} noValidate>
            <div className={styles.editField}>
              <label htmlFor={nameInputId} className={styles.visuallyHidden}>
                Nombre de {unit.code}
              </label>
              <input
                id={nameInputId}
                value={nameDraft}
                onChange={(changeEvent) => setNameDraft(changeEvent.target.value)}
                aria-invalid={nameMessages !== undefined}
                aria-describedby={`${nameInputId}-errors`}
                autoFocus
              />
              <FieldErrors id={`${nameInputId}-errors`} messages={nameMessages} />
              {updateUnit.isError && nameMessages === undefined && (
                <p className={styles.rowError}>{updateUnit.error.message}</p>
              )}
            </div>
            <div className={styles.actions}>
              <Button type="submit" disabled={updateUnit.isPending}>
                {updateUnit.isPending ? 'Guardando…' : 'Guardar'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => setIsEditing(false)}
                disabled={updateUnit.isPending}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td className={styles.unitCode}>{unit.code}</td>
      <td>{unit.name}</td>
      <td>
        <div className={styles.actions}>
          <Button variant="secondary" onClick={startEditing}>
            Editar
          </Button>
          <Button variant="danger" onClick={() => onRequestDeletion(unit)}>
            Eliminar
          </Button>
        </div>
      </td>
    </tr>
  );
}

/** Lista las unidades; permite editar su nombre y borrarlas si no tienen duties. */
export function UnitsTable({ units, onUnitChanged }: UnitsTableProps) {
  const [unitPendingDeletion, setUnitPendingDeletion] = useState<Unit | null>(null);
  const deleteUnit = useDeleteUnit();

  const deletionError = deleteUnit.error;
  const unitDutyRoutes =
    deletionError instanceof ApiError ? deletionError.readUnitDutyRoutes() : null;

  /** Abre la confirmación de borrado y olvida el resultado del intento anterior. */
  function requestDeletion(unit: Unit) {
    deleteUnit.reset();
    setUnitPendingDeletion(unit);
  }

  /** Borra la unidad elegida; tanto si sale bien como si no, cierra el diálogo y muestra el resultado. */
  function confirmDeletion() {
    if (!unitPendingDeletion) {
      return;
    }
    const deletedUnitCode = unitPendingDeletion.code;
    deleteUnit.mutate(unitPendingDeletion.id, {
      onSuccess: () => onUnitChanged(`Unidad ${deletedUnitCode} eliminada.`),
      // El motivo del error (por ejemplo, que tenga duties) se muestra sobre la tabla.
      onSettled: () => setUnitPendingDeletion(null),
    });
  }

  return (
    <>
      {unitDutyRoutes !== null && deletionError && (
        <UnitInUseWarning message={deletionError.message} unitDutyRoutes={unitDutyRoutes} />
      )}
      {deletionError && unitDutyRoutes === null && (
        <p className={styles.rowError} role="alert">
          No se pudo eliminar la unidad: {deletionError.message}
        </p>
      )}

      {/* La tabla puede ser más ancha que un móvil: se desplaza dentro de su caja, no la página. */}
      <div className={styles.tableScroller}>
        <table className={styles.unitsTable}>
          <thead>
            <tr>
              <th scope="col">Código</th>
              <th scope="col">Nombre</th>
              <th scope="col">
                <span className={styles.visuallyHidden}>Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {units.map((unit) => (
              <UnitRow
                key={unit.id}
                unit={unit}
                onRequestDeletion={requestDeletion}
                onUnitChanged={onUnitChanged}
              />
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        isOpen={unitPendingDeletion !== null}
        title="¿Eliminar esta unidad?"
        description={`Se eliminará ${unitPendingDeletion?.code ?? ''}. Solo es posible si no tiene duties asignados.`}
        confirmLabel="Eliminar unidad"
        isConfirming={deleteUnit.isPending}
        onConfirm={confirmDeletion}
        onCancel={() => setUnitPendingDeletion(null)}
      />
    </>
  );
}
