// Pantalla para crear una ruta nueva o editar una existente: nombre, mapa editor y lista de puntos.
import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ApiError } from '../api/client';
import type { Route } from '../api/types';
import { Button } from '../components/Button';
import { FieldErrors } from '../components/FieldErrors';
import { RouteMap } from '../components/RouteMap';
import { RoutePointsEditor } from '../components/RoutePointsEditor';
import { StatusMessage } from '../components/StatusMessage';
import { useRoute } from '../hooks/useRoute';
import { useSaveRoute } from '../hooks/useSaveRoute';
import styles from '../styles/RouteFormPage.module.css';
import { groupFieldMessages, hasFieldMessages, type FieldMessages } from '../utils/invalidFields';
import {
  convertDraftsToPoints,
  convertPointsToDrafts,
  createDraftFromClick,
  moveListItem,
  selectDrawablePoints,
  type RoutePointDraft,
} from '../utils/routePointDrafts';

const HTTP_STATUS_NOT_FOUND = 404;
// Debe coincidir con el mínimo de la api; se comprueba aquí para avisar antes de enviar.
const MIN_POINTS_PER_ROUTE = 2;

/** Revisa lo obvio antes de enviar; el resto (rangos, longitudes) lo valida la api campo a campo. */
function validateRouteForm(routeName: string, pointDrafts: RoutePointDraft[]): FieldMessages {
  const fieldMessages: FieldMessages = {};
  if (routeName.trim() === '') {
    fieldMessages.name = ['El nombre es obligatorio.'];
  }
  if (pointDrafts.length < MIN_POINTS_PER_ROUTE) {
    fieldMessages.points = [`Una ruta necesita al menos ${MIN_POINTS_PER_ROUTE} puntos.`];
  }
  return fieldMessages;
}

/** Formulario con el estado de la ruta que se edita; `initialRoute` vacío significa ruta nueva. */
function RouteForm({ initialRoute }: { initialRoute: Route | undefined }) {
  const navigate = useNavigate();
  const isEditing = initialRoute !== undefined;
  const [routeName, setRouteName] = useState(initialRoute?.name ?? '');
  const [pointDrafts, setPointDrafts] = useState<RoutePointDraft[]>(() =>
    convertPointsToDrafts(initialRoute?.points ?? []),
  );
  const [clientFieldMessages, setClientFieldMessages] = useState<FieldMessages>({});
  const saveRoute = useSaveRoute(initialRoute?.id);

  const fieldMessages = { ...groupFieldMessages(saveRoute.error), ...clientFieldMessages };
  const hasGeneralError = saveRoute.isError && !hasFieldMessages(saveRoute.error);
  // Mientras se edita, el mapa dibuja solo los puntos con coordenadas válidas.
  const drawablePoints = selectDrawablePoints(pointDrafts);

  /** Descarta los errores mostrados, que dejan de describir lo que hay escrito. */
  function clearErrors() {
    setClientFieldMessages({});
    saveRoute.reset();
  }

  /** Añade al final el punto marcado con un clic en el mapa. */
  function addPointFromMap(lat: number, lng: number) {
    setPointDrafts((previousDrafts) => [...previousDrafts, createDraftFromClick(lat, lng)]);
    clearErrors();
  }

  /** Cambia un campo de un punto. */
  function changePoint(pointIndex: number, fieldName: 'name' | 'lat' | 'lng', value: string) {
    setPointDrafts((previousDrafts) =>
      previousDrafts.map((pointDraft, draftIndex) => {
        if (draftIndex !== pointIndex) {
          return pointDraft;
        }
        return { ...pointDraft, [fieldName]: value };
      }),
    );
    clearErrors();
  }

  /** Mueve un punto a otra posición de la ruta. */
  function movePoint(pointIndex: number, targetIndex: number) {
    setPointDrafts((previousDrafts) => moveListItem(previousDrafts, pointIndex, targetIndex));
    clearErrors();
  }

  /** Quita un punto de la ruta. */
  function removePoint(pointIndex: number) {
    setPointDrafts((previousDrafts) =>
      previousDrafts.filter((_pointDraft, draftIndex) => draftIndex !== pointIndex),
    );
    clearErrors();
  }

  /** Valida y guarda la ruta; al terminar bien lleva a su detalle con un aviso de éxito. */
  function submitRoute(submitEvent: FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault();
    const validationMessages = validateRouteForm(routeName, pointDrafts);
    setClientFieldMessages(validationMessages);
    if (Object.keys(validationMessages).length > 0) {
      return;
    }

    const routeInput = { name: routeName.trim(), points: convertDraftsToPoints(pointDrafts) };
    saveRoute.mutate(routeInput, {
      onSuccess: (savedRoute) => {
        const successMessage = isEditing ? 'Ruta actualizada.' : 'Ruta creada.';
        navigate(`/routes/${savedRoute.id}`, { state: { successMessage } });
      },
    });
  }

  const cancelPath = isEditing ? `/routes/${initialRoute.id}` : '/routes';

  return (
    <form className={styles.routeForm} onSubmit={submitRoute} noValidate>
      <h1 className={styles.pageTitle}>{isEditing ? 'Editar ruta' : 'Nueva ruta'}</h1>

      <div className={styles.nameField}>
        <label htmlFor="route-name">Nombre de la ruta</label>
        <input
          id="route-name"
          value={routeName}
          onChange={(changeEvent) => {
            setRouteName(changeEvent.target.value);
            clearErrors();
          }}
          aria-invalid={fieldMessages.name !== undefined}
          aria-describedby="route-name-errors"
        />
        <FieldErrors id="route-name-errors" messages={fieldMessages.name} />
      </div>

      <div className={styles.editorLayout}>
        <div className={styles.mapColumn}>
          <p className={styles.hint}>
            Haz clic en el mapa para añadir un punto al final de la ruta.
          </p>
          <RouteMap points={drawablePoints} onAddPoint={addPointFromMap} />
        </div>
        <section className={styles.pointsColumn} aria-labelledby="route-points-title">
          <h2 id="route-points-title" className={styles.sectionTitle}>
            Puntos ({pointDrafts.length})
          </h2>
          <FieldErrors id="route-points-errors" messages={fieldMessages.points} />
          <RoutePointsEditor
            pointDrafts={pointDrafts}
            fieldMessages={fieldMessages}
            onChangePoint={changePoint}
            onMovePoint={movePoint}
            onRemovePoint={removePoint}
          />
        </section>
      </div>

      {hasGeneralError && (
        <p className={styles.formError} role="alert">
          No se pudo guardar la ruta: {saveRoute.error?.message}
        </p>
      )}

      <div className={styles.actions}>
        <Link to={cancelPath} className={styles.cancelLink}>
          Cancelar
        </Link>
        <Button type="submit" disabled={saveRoute.isPending}>
          {saveRoute.isPending ? 'Guardando…' : 'Guardar ruta'}
        </Button>
      </div>
    </form>
  );
}

/** Pantalla de alta o edición: en edición carga primero la ruta y solo entonces muestra el formulario. */
export function RouteFormPage() {
  const { routeId } = useParams<{ routeId: string }>();
  const { data: route, isPending, isError, error } = useRoute(routeId);
  const isNewRoute = routeId === undefined;

  if (isNewRoute) {
    return <RouteForm initialRoute={undefined} />;
  }

  if (isPending) {
    return <StatusMessage kind="loading" title="Cargando la ruta…" />;
  }

  if (isError) {
    const isMissingRoute = error instanceof ApiError && error.statusCode === HTTP_STATUS_NOT_FOUND;
    const errorTitle = isMissingRoute ? 'Esta ruta no existe.' : 'No se pudo cargar la ruta.';
    return (
      <StatusMessage kind="error" title={errorTitle}>
        <Link to="/routes">Volver al listado de rutas</Link>
      </StatusMessage>
    );
  }

  // La `key` recrea el formulario si se cambia de ruta sin salir de la pantalla.
  return <RouteForm key={route.id} initialRoute={route} />;
}
