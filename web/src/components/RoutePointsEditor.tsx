// Lista editable de los puntos de una ruta: nombre, latitud y longitud, y botones para reordenar y quitar.
import styles from '../styles/RoutePointsEditor.module.css';
import type { FieldMessages } from '../utils/invalidFields';
import type { RoutePointDraft } from '../utils/routePointDrafts';
import { Button } from './Button';
import { FieldErrors } from './FieldErrors';

type EditablePointField = 'name' | 'lat' | 'lng';

interface RoutePointsEditorProps {
  pointDrafts: RoutePointDraft[];
  fieldMessages: FieldMessages;
  onChangePoint: (pointIndex: number, fieldName: EditablePointField, value: string) => void;
  onMovePoint: (pointIndex: number, targetIndex: number) => void;
  onRemovePoint: (pointIndex: number) => void;
}

interface PointRowProps extends Omit<RoutePointsEditorProps, 'pointDrafts'> {
  pointDraft: RoutePointDraft;
  pointIndex: number;
  pointCount: number;
}

/** Fila de un punto con sus campos, sus errores y los botones de subir, bajar y quitar. */
function PointRow({
  pointDraft,
  pointIndex,
  pointCount,
  fieldMessages,
  onChangePoint,
  onMovePoint,
  onRemovePoint,
}: PointRowProps) {
  const pointNumber = pointIndex + 1;
  const fieldIdPrefix = `point-${pointDraft.draftId}`;
  const isFirstPoint = pointIndex === 0;
  const isLastPoint = pointIndex === pointCount - 1;
  // Los errores de la api vienen por posición: `points.2.lat` es la latitud del tercer punto.
  const latMessages = fieldMessages[`points.${pointIndex}.lat`];
  const lngMessages = fieldMessages[`points.${pointIndex}.lng`];
  const nameMessages = fieldMessages[`points.${pointIndex}.name`];
  const rowMessages = fieldMessages[`points.${pointIndex}`];

  return (
    <li className={styles.pointRow}>
      <div className={styles.rowHeader}>
        <span className={styles.pointNumber} aria-hidden="true">
          {pointNumber}
        </span>
        <span className={styles.rowTitle}>Punto {pointNumber}</span>
        <div className={styles.rowActions}>
          <Button
            variant="secondary"
            onClick={() => onMovePoint(pointIndex, pointIndex - 1)}
            disabled={isFirstPoint}
            aria-label={`Subir el punto ${pointNumber}`}
          >
            ↑
          </Button>
          <Button
            variant="secondary"
            onClick={() => onMovePoint(pointIndex, pointIndex + 1)}
            disabled={isLastPoint}
            aria-label={`Bajar el punto ${pointNumber}`}
          >
            ↓
          </Button>
          <Button
            variant="danger"
            onClick={() => onRemovePoint(pointIndex)}
            aria-label={`Quitar el punto ${pointNumber}`}
          >
            ✕
          </Button>
        </div>
      </div>

      <div className={styles.fields}>
        <div className={styles.nameField}>
          <label htmlFor={`${fieldIdPrefix}-name`}>Nombre (opcional)</label>
          <input
            id={`${fieldIdPrefix}-name`}
            value={pointDraft.name}
            onChange={(changeEvent) => onChangePoint(pointIndex, 'name', changeEvent.target.value)}
            aria-invalid={nameMessages !== undefined}
            aria-describedby={`${fieldIdPrefix}-name-errors`}
          />
          <FieldErrors id={`${fieldIdPrefix}-name-errors`} messages={nameMessages} />
        </div>
        <div>
          <label htmlFor={`${fieldIdPrefix}-lat`}>Latitud</label>
          <input
            id={`${fieldIdPrefix}-lat`}
            inputMode="decimal"
            value={pointDraft.lat}
            onChange={(changeEvent) => onChangePoint(pointIndex, 'lat', changeEvent.target.value)}
            aria-invalid={latMessages !== undefined}
            aria-describedby={`${fieldIdPrefix}-lat-errors`}
          />
          <FieldErrors id={`${fieldIdPrefix}-lat-errors`} messages={latMessages} />
        </div>
        <div>
          <label htmlFor={`${fieldIdPrefix}-lng`}>Longitud</label>
          <input
            id={`${fieldIdPrefix}-lng`}
            inputMode="decimal"
            value={pointDraft.lng}
            onChange={(changeEvent) => onChangePoint(pointIndex, 'lng', changeEvent.target.value)}
            aria-invalid={lngMessages !== undefined}
            aria-describedby={`${fieldIdPrefix}-lng-errors`}
          />
          <FieldErrors id={`${fieldIdPrefix}-lng-errors`} messages={lngMessages} />
        </div>
      </div>
      <FieldErrors id={`${fieldIdPrefix}-errors`} messages={rowMessages} />
    </li>
  );
}

/** Muestra los puntos en orden para editarlos; el número coincide con el marcador del mapa. */
export function RoutePointsEditor({ pointDrafts, ...rowHandlers }: RoutePointsEditorProps) {
  if (pointDrafts.length === 0) {
    return (
      <p className={styles.emptyHint}>
        Todavía no hay puntos. Haz clic en el mapa para añadir el primero; cada clic añade uno al
        final.
      </p>
    );
  }

  return (
    <ol className={styles.routePointsEditor}>
      {pointDrafts.map((pointDraft, pointIndex) => (
        <PointRow
          key={pointDraft.draftId}
          pointDraft={pointDraft}
          pointIndex={pointIndex}
          pointCount={pointDrafts.length}
          {...rowHandlers}
        />
      ))}
    </ol>
  );
}
