// Borradores de los puntos de una ruta mientras se editan en el formulario. Las coordenadas se
// guardan como texto para poder escribir valores a medias (`-99.`) sin que se corrijan solos.
import type { RoutePoint } from '../api/types';
import { CLICKED_COORDINATE_DECIMALS } from '../config/map';

/** Un punto tal como está escrito en el formulario. */
export interface RoutePointDraft {
  /** Identificador local y estable para que React no confunda filas al reordenarlas. */
  draftId: number;
  lat: string;
  lng: string;
  name: string;
}

// Contador en lugar de `crypto.randomUUID`: este solo existe en contextos seguros y fallaría si la
// interfaz se abre por la IP de la red local.
let nextDraftId = 1;

/** Crea un borrador con un identificador nuevo. */
export function createPointDraft(lat: string, lng: string, name = ''): RoutePointDraft {
  const pointDraft = { draftId: nextDraftId, lat, lng, name };
  nextDraftId += 1;
  return pointDraft;
}

/** Convierte los puntos guardados de una ruta en borradores editables. */
export function convertPointsToDrafts(points: RoutePoint[]): RoutePointDraft[] {
  return points.map((point) =>
    createPointDraft(String(point.lat), String(point.lng), point.name ?? ''),
  );
}

/** Crea el borrador de un punto marcado con un clic en el mapa, con precisión razonable. */
export function createDraftFromClick(lat: number, lng: number): RoutePointDraft {
  return createPointDraft(
    lat.toFixed(CLICKED_COORDINATE_DECIMALS),
    lng.toFixed(CLICKED_COORDINATE_DECIMALS),
  );
}

/** Lee una coordenada escrita; si está vacía o no es un número devuelve NaN, para que la api la rechace. */
function parseCoordinate(coordinateText: string): number {
  // `Number('')` es 0: sin este cuidado, un campo vacío mandaría el punto a la latitud 0.
  if (coordinateText.trim() === '') {
    return Number.NaN;
  }
  return Number(coordinateText);
}

/** Convierte los borradores en los puntos que se envían a la api, en el mismo orden. */
export function convertDraftsToPoints(pointDrafts: RoutePointDraft[]): RoutePoint[] {
  return pointDrafts.map((pointDraft) => {
    const trimmedName = pointDraft.name.trim();
    const point: RoutePoint = {
      lat: parseCoordinate(pointDraft.lat),
      lng: parseCoordinate(pointDraft.lng),
    };
    if (trimmedName !== '') {
      point.name = trimmedName;
    }
    return point;
  });
}

/** Devuelve solo los puntos con coordenadas válidas, para dibujarlos en el mapa mientras se edita. */
export function selectDrawablePoints(pointDrafts: RoutePointDraft[]): RoutePoint[] {
  return convertDraftsToPoints(pointDrafts).filter(
    (point) => Number.isFinite(point.lat) && Number.isFinite(point.lng),
  );
}

/** Devuelve una copia de la lista con el elemento de `fromIndex` movido a `toIndex`. */
export function moveListItem<TItem>(items: TItem[], fromIndex: number, toIndex: number): TItem[] {
  const reorderedItems = [...items];
  const [movedItem] = reorderedItems.splice(fromIndex, 1);
  reorderedItems.splice(toIndex, 0, movedItem);
  return reorderedItems;
}
