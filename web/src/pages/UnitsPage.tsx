// Pantalla de unidades: alta (código y nombre) y listado de la flota, con edición del nombre y
// borrado de las unidades que no tienen duties.
import { useCallback, useState, type FormEvent } from 'react';
import { ApiError } from '../api/client';
import { Button } from '../components/Button';
import { FieldErrors } from '../components/FieldErrors';
import { StatusMessage } from '../components/StatusMessage';
import { SuccessNotice } from '../components/SuccessNotice';
import { UnitsTable } from '../components/UnitsTable';
import { useCreateUnit } from '../hooks/useCreateUnit';
import { useUnits } from '../hooks/useUnits';
import styles from '../styles/UnitsPage.module.css';
import { groupFieldMessages, type FieldMessages } from '../utils/invalidFields';
import { MAX_UNIT_CODE_LENGTH, MAX_UNIT_NAME_LENGTH } from '../config/fieldLimits';

const DUPLICATE_KEY_ERROR_TYPE = 'DuplicateKey';

/** Devuelve los errores por campo, incluido el de código repetido, que la api da como 409. */
function readUnitFieldMessages(error: unknown): FieldMessages {
  const isDuplicateCode = error instanceof ApiError && error.errorType === DUPLICATE_KEY_ERROR_TYPE;
  if (isDuplicateCode) {
    return { code: ['Ya existe una unidad con ese código.'] };
  }
  return groupFieldMessages(error);
}

/** Formulario de alta de una unidad; avisa al terminar bien. */
function CreateUnitForm({ onUnitCreated }: { onUnitCreated: (successMessage: string) => void }) {
  const [unitCode, setUnitCode] = useState('');
  const [unitName, setUnitName] = useState('');
  const createUnit = useCreateUnit();

  const fieldMessages = readUnitFieldMessages(createUnit.error);
  const hasGeneralError = createUnit.isError && Object.keys(fieldMessages).length === 0;

  /** Envía el alta; la api valida el formato del código y que no esté repetido. */
  function submitUnit(submitEvent: FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault();
    createUnit.mutate(
      { code: unitCode, name: unitName },
      {
        onSuccess: (createdUnit) => {
          setUnitCode('');
          setUnitName('');
          onUnitCreated(`Unidad ${createdUnit.code} dada de alta.`);
        },
      },
    );
  }

  return (
    <form className={styles.createUnitForm} onSubmit={submitUnit} noValidate>
      <h2 className={styles.sectionTitle}>Nueva unidad</h2>
      <div className={styles.fields}>
        <div>
          <label htmlFor="unit-code">Código</label>
          <input
            id="unit-code"
            value={unitCode}
            maxLength={MAX_UNIT_CODE_LENGTH}
            placeholder="BUS-004"
            onChange={(changeEvent) => {
              setUnitCode(changeEvent.target.value);
              createUnit.reset();
            }}
            aria-invalid={fieldMessages.code !== undefined}
            aria-describedby="unit-code-help unit-code-errors"
          />
          <p id="unit-code-help" className={styles.fieldHelp}>
            Letras, dígitos y guiones. Se guarda en mayúsculas.
          </p>
          <FieldErrors id="unit-code-errors" messages={fieldMessages.code} />
        </div>
        <div>
          <label htmlFor="unit-name">Nombre</label>
          <input
            id="unit-name"
            value={unitName}
            maxLength={MAX_UNIT_NAME_LENGTH}
            placeholder="Autobús 4"
            onChange={(changeEvent) => {
              setUnitName(changeEvent.target.value);
              createUnit.reset();
            }}
            aria-invalid={fieldMessages.name !== undefined}
            aria-describedby="unit-name-errors"
          />
          <FieldErrors id="unit-name-errors" messages={fieldMessages.name} />
        </div>
      </div>
      {hasGeneralError && (
        <p className={styles.formError} role="alert">
          No se pudo dar de alta la unidad: {createUnit.error?.message}
        </p>
      )}
      <div className={styles.actions}>
        <Button type="submit" disabled={createUnit.isPending}>
          {createUnit.isPending ? 'Guardando…' : 'Dar de alta'}
        </Button>
      </div>
    </form>
  );
}

/** Listado de unidades según el estado de la consulta: cargando, error, vacío o la tabla. */
function UnitsList({ onUnitChanged }: { onUnitChanged: (successMessage: string) => void }) {
  const { data: units, isPending, isError, error } = useUnits();

  if (isPending) {
    return <StatusMessage kind="loading" title="Cargando unidades…" />;
  }
  if (isError) {
    return (
      <StatusMessage kind="error" title="No se pudieron cargar las unidades.">
        {error.message}
      </StatusMessage>
    );
  }
  if (units.length === 0) {
    return (
      <StatusMessage kind="empty" title="Todavía no hay unidades.">
        Da de alta la primera con el formulario.
      </StatusMessage>
    );
  }

  return <UnitsTable units={units} onUnitChanged={onUnitChanged} />;
}

/** Pantalla de unidades: alta, listado, edición del nombre y borrado. */
export function UnitsPage() {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const dismissSuccessMessage = useCallback(() => setSuccessMessage(null), []);

  return (
    <section>
      <h1 className={styles.pageTitle}>Unidades</h1>
      <SuccessNotice message={successMessage} onDismiss={dismissSuccessMessage} />
      <div className={styles.layout}>
        <div className={styles.formCard}>
          <CreateUnitForm onUnitCreated={setSuccessMessage} />
        </div>
        <section aria-label="Listado de unidades">
          <UnitsList onUnitChanged={setSuccessMessage} />
        </section>
      </div>
    </section>
  );
}
