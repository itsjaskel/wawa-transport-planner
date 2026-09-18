// Formulario de duty para la ruta actual: asigna uno nuevo o edita uno existente (unidad y ventana).
// Al elegir el horario muestra qué unidades están libres; la garantía la da la api al guardar.
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { ApiError } from '../api/client';
import type { RouteDuty, Unit } from '../api/types';
import { useSaveDuty } from '../hooks/useSaveDuty';
import { useUnitAvailability, type AvailabilityWindow } from '../hooks/useUnitAvailability';
import { useUnits } from '../hooks/useUnits';
import styles from '../styles/DutyForm.module.css';
import {
  convertIsoToLocalInput,
  convertLocalInputToIso,
  formatUtcOffset,
  isValidLocalInput,
} from '../utils/dateTime';
import { groupFieldMessages, hasFieldMessages, type FieldMessages } from '../utils/invalidFields';
import { Button } from './Button';
import { DutyConflictWarning } from './DutyConflictWarning';
import { FieldErrors } from './FieldErrors';
import { UnitAvailabilitySelect } from './UnitAvailabilitySelect';

interface DutyFormProps {
  routeId: string;
  /** Si se indica, el formulario edita este duty en lugar de asignar uno nuevo. */
  dutyToEdit?: RouteDuty;
  onDutySaved: (successMessage: string) => void;
  /** Solo al editar: cierra el formulario sin guardar. */
  onCancel?: () => void;
}

/** Valores del formulario tal como los escribe el usuario. */
interface DutyFormValues {
  unitId: string;
  startLocal: string;
  endLocal: string;
}

const EMPTY_FORM_VALUES: DutyFormValues = { unitId: '', startLocal: '', endLocal: '' };

/** Valores iniciales: vacíos al asignar, los del duty (en hora local) al editar. */
function buildInitialValues(dutyToEdit: RouteDuty | undefined): DutyFormValues {
  if (!dutyToEdit) {
    return EMPTY_FORM_VALUES;
  }
  return {
    unitId: dutyToEdit.unitId,
    startLocal: convertIsoToLocalInput(dutyToEdit.startAt),
    endLocal: convertIsoToLocalInput(dutyToEdit.endAt),
  };
}

/** Devuelve la ventana en ISO si inicio y fin son válidos y el fin es posterior; si no, null. */
function buildAvailabilityWindow(formValues: DutyFormValues): AvailabilityWindow | null {
  const hasValidDates =
    isValidLocalInput(formValues.startLocal) && isValidLocalInput(formValues.endLocal);
  if (!hasValidDates) {
    return null;
  }
  const endsAfterStart = new Date(formValues.endLocal) > new Date(formValues.startLocal);
  if (!endsAfterStart) {
    return null;
  }
  return {
    startAt: convertLocalInputToIso(formValues.startLocal),
    endAt: convertLocalInputToIso(formValues.endLocal),
  };
}

/** Revisa lo obvio antes de enviar, para no hacer esperar al usuario por un error evidente. */
function validateDutyForm(formValues: DutyFormValues): FieldMessages {
  const fieldMessages: FieldMessages = {};

  if (formValues.unitId === '') {
    fieldMessages.unitId = ['Elige una unidad.'];
  }
  if (!isValidLocalInput(formValues.startLocal)) {
    fieldMessages.startAt = ['Indica la fecha y hora de inicio.'];
  }
  if (!isValidLocalInput(formValues.endLocal)) {
    fieldMessages.endAt = ['Indica la fecha y hora de fin.'];
  }

  const hasBothDates = !fieldMessages.startAt && !fieldMessages.endAt;
  const endsAfterStart = new Date(formValues.endLocal) > new Date(formValues.startLocal);
  if (hasBothDates && !endsAfterStart) {
    fieldMessages.endAt = ['El fin debe ser posterior al inicio.'];
  }

  return fieldMessages;
}

/** Devuelve el mensaje general de un error que no es de un campo ni un conflicto de horario. */
function readGeneralErrorMessage(error: unknown): string | null {
  if (!error) {
    return null;
  }
  const isOverlapConflict = error instanceof ApiError && error.readConflictingDuty() !== null;
  if (isOverlapConflict || hasFieldMessages(error)) {
    return null;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'No se pudo guardar el duty.';
}

/** Busca el código de una unidad para el mensaje de éxito. */
function findUnitCode(units: Unit[] | undefined, unitId: string): string {
  const selectedUnit = units?.find((unit) => unit.id === unitId);
  return selectedUnit?.code ?? 'la unidad';
}

/** Asigna o edita un duty; muestra la disponibilidad, los errores por campo y el conflicto de horario. */
export function DutyForm({ routeId, dutyToEdit, onDutySaved, onCancel }: DutyFormProps) {
  const isEditing = dutyToEdit !== undefined;
  const fieldIdPrefix = isEditing ? `duty-edit-${dutyToEdit.id}` : 'duty';
  const [formValues, setFormValues] = useState<DutyFormValues>(() =>
    buildInitialValues(dutyToEdit),
  );
  const [clientFieldMessages, setClientFieldMessages] = useState<FieldMessages>({});
  const { data: units, isPending: isLoadingUnits, isError: hasUnitsError } = useUnits();
  const saveDuty = useSaveDuty(dutyToEdit?.id);

  const availabilityWindow = buildAvailabilityWindow(formValues);
  // Al editar, el propio duty no debe hacer que su unidad aparezca ocupada.
  const unitAvailability = useUnitAvailability(availabilityWindow, dutyToEdit?.id);

  const fieldMessages = { ...groupFieldMessages(saveDuty.error), ...clientFieldMessages };
  const conflictingDuty =
    saveDuty.error instanceof ApiError ? saveDuty.error.readConflictingDuty() : null;
  const generalErrorMessage = readGeneralErrorMessage(saveDuty.error);

  // El desfase se calcula para la fecha elegida: con horario de verano puede cambiar según el día.
  let offsetReferenceDate = new Date();
  if (isValidLocalInput(formValues.startLocal)) {
    offsetReferenceDate = new Date(formValues.startLocal);
  }
  const localOffsetLabel = formatUtcOffset(offsetReferenceDate);

  /** Actualiza un campo y descarta los errores anteriores, que ya no describen lo que hay escrito. */
  function updateField(fieldName: keyof DutyFormValues, value: string) {
    setFormValues((previousValues) => ({ ...previousValues, [fieldName]: value }));
    setClientFieldMessages({});
    saveDuty.reset();
  }

  /** Valida y guarda el duty; al terminar bien avisa a la pantalla y, al asignar, limpia las fechas. */
  function submitDuty(submitEvent: FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault();
    const validationMessages = validateDutyForm(formValues);
    setClientFieldMessages(validationMessages);
    if (Object.keys(validationMessages).length > 0) {
      return;
    }

    const dutyInput = {
      routeId,
      unitId: formValues.unitId,
      startAt: convertLocalInputToIso(formValues.startLocal),
      endAt: convertLocalInputToIso(formValues.endLocal),
    };
    saveDuty.mutate(dutyInput, {
      onSuccess: () => {
        const unitCode = findUnitCode(units, formValues.unitId);
        if (isEditing) {
          onDutySaved(`Duty de ${unitCode} actualizado.`);
          return;
        }
        // Se conserva la unidad para poder asignarle varios duties seguidos.
        setFormValues({ ...EMPTY_FORM_VALUES, unitId: formValues.unitId });
        onDutySaved(`Duty asignado a ${unitCode}.`);
      },
    });
  }

  if (hasUnitsError) {
    return <p className={styles.formError}>No se pudieron cargar las unidades.</p>;
  }

  const hasNoUnits = !isLoadingUnits && units.length === 0;
  if (hasNoUnits) {
    return (
      <p className={styles.formHint}>
        Para asignar duties primero necesitas unidades.{' '}
        <Link to="/units">Da de alta una unidad</Link>.
      </p>
    );
  }

  let submitLabel = isEditing ? 'Guardar cambios' : 'Asignar duty';
  if (saveDuty.isPending) {
    submitLabel = 'Guardando…';
  }

  return (
    <form className={styles.dutyForm} onSubmit={submitDuty} noValidate>
      <p className={styles.formHint}>Horas en tu zona horaria ({localOffsetLabel}).</p>

      {/* Primero el horario: con él se sabe qué unidades están libres. */}
      <div className={styles.fields}>
        <div className={styles.field}>
          <label htmlFor={`${fieldIdPrefix}-start`}>Inicio</label>
          <input
            id={`${fieldIdPrefix}-start`}
            type="datetime-local"
            value={formValues.startLocal}
            onChange={(changeEvent) => updateField('startLocal', changeEvent.target.value)}
            aria-invalid={fieldMessages.startAt !== undefined}
            aria-describedby={`${fieldIdPrefix}-start-errors`}
          />
          <FieldErrors id={`${fieldIdPrefix}-start-errors`} messages={fieldMessages.startAt} />
        </div>

        <div className={styles.field}>
          <label htmlFor={`${fieldIdPrefix}-end`}>Fin</label>
          <input
            id={`${fieldIdPrefix}-end`}
            type="datetime-local"
            value={formValues.endLocal}
            onChange={(changeEvent) => updateField('endLocal', changeEvent.target.value)}
            aria-invalid={fieldMessages.endAt !== undefined}
            aria-describedby={`${fieldIdPrefix}-end-errors`}
          />
          <FieldErrors id={`${fieldIdPrefix}-end-errors`} messages={fieldMessages.endAt} />
        </div>

        <UnitAvailabilitySelect
          fieldId={`${fieldIdPrefix}-unit`}
          units={units}
          isLoadingUnits={isLoadingUnits}
          availability={unitAvailability.data}
          isCheckingAvailability={unitAvailability.isFetching}
          hasWindow={availabilityWindow !== null}
          selectedUnitId={formValues.unitId}
          errorMessages={fieldMessages.unitId}
          onSelectUnit={(unitId) => updateField('unitId', unitId)}
        />
      </div>

      {conflictingDuty && (
        <DutyConflictWarning conflictingDuty={conflictingDuty} currentRouteId={routeId} />
      )}
      {generalErrorMessage && <p className={styles.formError}>{generalErrorMessage}</p>}

      <div className={styles.actions}>
        <Button type="submit" disabled={saveDuty.isPending}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button variant="secondary" onClick={onCancel} disabled={saveDuty.isPending}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}
