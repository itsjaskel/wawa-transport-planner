// Formulario para asignar un duty a la ruta actual: unidad, inicio y fin en la hora local.
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { ApiError } from '../api/client';
import type { Unit } from '../api/types';
import { useCreateDuty } from '../hooks/useCreateDuty';
import { useUnits } from '../hooks/useUnits';
import styles from '../styles/DutyForm.module.css';
import { convertLocalInputToIso, formatUtcOffset, isValidLocalInput } from '../utils/dateTime';
import { groupFieldMessages, hasFieldMessages, type FieldMessages } from '../utils/invalidFields';
import { Button } from './Button';
import { DutyConflictWarning } from './DutyConflictWarning';
import { FieldErrors } from './FieldErrors';

interface DutyFormProps {
  routeId: string;
  onDutyCreated: (successMessage: string) => void;
}

/** Valores del formulario tal como los escribe el usuario. */
interface DutyFormValues {
  unitId: string;
  startLocal: string;
  endLocal: string;
}

const EMPTY_FORM_VALUES: DutyFormValues = { unitId: '', startLocal: '', endLocal: '' };

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
  return 'No se pudo asignar el duty.';
}

/** Busca el código de una unidad para el mensaje de éxito. */
function findUnitCode(units: Unit[] | undefined, unitId: string): string {
  const selectedUnit = units?.find((unit) => unit.id === unitId);
  return selectedUnit?.code ?? 'la unidad';
}

/** Asigna un duty a la ruta; muestra los errores junto a cada campo y el conflicto de horario con su detalle. */
export function DutyForm({ routeId, onDutyCreated }: DutyFormProps) {
  const [formValues, setFormValues] = useState<DutyFormValues>(EMPTY_FORM_VALUES);
  const [clientFieldMessages, setClientFieldMessages] = useState<FieldMessages>({});
  const { data: units, isPending: isLoadingUnits, isError: hasUnitsError } = useUnits();
  const createDuty = useCreateDuty();

  const serverFieldMessages = groupFieldMessages(createDuty.error);
  const fieldMessages = { ...serverFieldMessages, ...clientFieldMessages };
  const conflictingDuty =
    createDuty.error instanceof ApiError ? createDuty.error.readConflictingDuty() : null;
  const generalErrorMessage = readGeneralErrorMessage(createDuty.error);

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
    createDuty.reset();
  }

  /** Valida y envía el duty; al terminar bien, limpia las fechas y avisa a la pantalla. */
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
    createDuty.mutate(dutyInput, {
      onSuccess: () => {
        const unitCode = findUnitCode(units, formValues.unitId);
        setFormValues({ ...EMPTY_FORM_VALUES, unitId: formValues.unitId });
        onDutyCreated(`Duty asignado a ${unitCode}.`);
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

  return (
    <form className={styles.dutyForm} onSubmit={submitDuty} noValidate>
      <p className={styles.formHint}>Horas en tu zona horaria ({localOffsetLabel}).</p>

      <div className={styles.fields}>
        <div className={styles.field}>
          <label htmlFor="duty-unit">Unidad</label>
          <select
            id="duty-unit"
            value={formValues.unitId}
            onChange={(changeEvent) => updateField('unitId', changeEvent.target.value)}
            disabled={isLoadingUnits}
            aria-invalid={fieldMessages.unitId !== undefined}
            aria-describedby="duty-unit-errors"
          >
            <option value="">{isLoadingUnits ? 'Cargando unidades…' : 'Elige una unidad'}</option>
            {units?.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.code} · {unit.name}
              </option>
            ))}
          </select>
          <FieldErrors id="duty-unit-errors" messages={fieldMessages.unitId} />
        </div>

        <div className={styles.field}>
          <label htmlFor="duty-start">Inicio</label>
          <input
            id="duty-start"
            type="datetime-local"
            value={formValues.startLocal}
            onChange={(changeEvent) => updateField('startLocal', changeEvent.target.value)}
            aria-invalid={fieldMessages.startAt !== undefined}
            aria-describedby="duty-start-errors"
          />
          <FieldErrors id="duty-start-errors" messages={fieldMessages.startAt} />
        </div>

        <div className={styles.field}>
          <label htmlFor="duty-end">Fin</label>
          <input
            id="duty-end"
            type="datetime-local"
            value={formValues.endLocal}
            onChange={(changeEvent) => updateField('endLocal', changeEvent.target.value)}
            aria-invalid={fieldMessages.endAt !== undefined}
            aria-describedby="duty-end-errors"
          />
          <FieldErrors id="duty-end-errors" messages={fieldMessages.endAt} />
        </div>
      </div>

      {conflictingDuty && (
        <DutyConflictWarning conflictingDuty={conflictingDuty} currentRouteId={routeId} />
      )}
      {generalErrorMessage && <p className={styles.formError}>{generalErrorMessage}</p>}

      <div className={styles.actions}>
        <Button type="submit" disabled={createDuty.isPending}>
          {createDuty.isPending ? 'Asignando…' : 'Asignar duty'}
        </Button>
      </div>
    </form>
  );
}
