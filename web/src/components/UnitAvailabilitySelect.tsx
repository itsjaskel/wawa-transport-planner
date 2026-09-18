// Selector de unidad que, cuando hay una ventana elegida, indica qué unidades están libres y cuáles
// ocupadas (y dónde). Es una ayuda para planificar: la garantía la da la api al guardar.
import type { Unit, UnitAvailability } from '../api/types';
import styles from '../styles/UnitAvailabilitySelect.module.css';
import { formatLocalTime } from '../utils/dateTime';
import { FieldErrors } from './FieldErrors';

interface UnitAvailabilitySelectProps {
  /** Id del campo; distinto en cada formulario para que no choquen si hay dos en pantalla. */
  fieldId: string;
  units: Unit[] | undefined;
  isLoadingUnits: boolean;
  availability: UnitAvailability[] | undefined;
  isCheckingAvailability: boolean;
  hasWindow: boolean;
  selectedUnitId: string;
  errorMessages: string[] | undefined;
  onSelectUnit: (unitId: string) => void;
}

/** Texto de una opción: la unidad y, si se conoce, si está libre u ocupada y dónde. */
function buildOptionLabel(unit: Unit, unitAvailability: UnitAvailability | undefined): string {
  const unitLabel = `${unit.code} · ${unit.name}`;
  if (!unitAvailability) {
    return unitLabel;
  }
  if (unitAvailability.isAvailable) {
    return `${unitLabel} — libre`;
  }

  const occupyingDuty = unitAvailability.occupyingDuty;
  if (!occupyingDuty) {
    return `${unitLabel} — ocupada`;
  }
  const occupiedHours = `${formatLocalTime(occupyingDuty.startAt)}–${formatLocalTime(occupyingDuty.endAt)}`;
  return `${unitLabel} — ocupada: ${occupyingDuty.routeName}, ${occupiedHours}`;
}

/** Elige la unidad del duty marcando, para la ventana elegida, cuáles están libres. */
export function UnitAvailabilitySelect({
  fieldId,
  units,
  isLoadingUnits,
  availability,
  isCheckingAvailability,
  hasWindow,
  selectedUnitId,
  errorMessages,
  onSelectUnit,
}: UnitAvailabilitySelectProps) {
  const availabilityByUnitId = new Map(
    (availability ?? []).map((unitAvailability) => [unitAvailability.unitId, unitAvailability]),
  );
  const selectedAvailability = availabilityByUnitId.get(selectedUnitId);
  const isSelectedUnitOccupied = selectedAvailability?.isAvailable === false;

  let helpText = 'Elige primero el horario para ver qué unidades están libres.';
  if (hasWindow && isCheckingAvailability) {
    helpText = 'Comprobando qué unidades están libres…';
  }
  if (hasWindow && availability) {
    const freeUnitCount = availability.filter(
      (unitAvailability) => unitAvailability.isAvailable,
    ).length;
    helpText = `${freeUnitCount} de ${availability.length} unidades libres en ese horario. Es orientativo: se confirma al asignar.`;
  }

  let placeholder = 'Elige una unidad';
  if (isLoadingUnits) {
    placeholder = 'Cargando unidades…';
  }

  return (
    <div className={styles.unitAvailabilitySelect}>
      <label htmlFor={fieldId}>Unidad</label>
      <select
        id={fieldId}
        value={selectedUnitId}
        onChange={(changeEvent) => onSelectUnit(changeEvent.target.value)}
        disabled={isLoadingUnits}
        aria-invalid={errorMessages !== undefined}
        aria-describedby={`${fieldId}-help ${fieldId}-errors`}
      >
        <option value="">{placeholder}</option>
        {units?.map((unit) => {
          const unitAvailability = availabilityByUnitId.get(unit.id);
          // Las ocupadas no se pueden elegir, salvo la ya elegida: así se ve por qué no conviene.
          const isOccupied = unitAvailability?.isAvailable === false;
          const isDisabled = isOccupied && unit.id !== selectedUnitId;
          return (
            <option key={unit.id} value={unit.id} disabled={isDisabled}>
              {buildOptionLabel(unit, unitAvailability)}
            </option>
          );
        })}
      </select>
      <p id={`${fieldId}-help`} className={styles.helpText}>
        {helpText}
      </p>
      {isSelectedUnitOccupied && (
        <p className={styles.occupiedWarning} role="status">
          La unidad elegida está ocupada en ese horario. Elige otra o cambia el horario.
        </p>
      )}
      <FieldErrors id={`${fieldId}-errors`} messages={errorMessages} />
    </div>
  );
}
