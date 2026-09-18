// Creación, borrado y lectura de duties, y el borrado de unidades. Aquí vive la garantía central del
// negocio: una unidad nunca tiene dos duties solapados, ni siquiera con peticiones simultáneas; y
// nunca se borra una unidad que tenga duties. Ver CLAUDE.md §4.
import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
// Mongoose es CommonJS: `Connection` y `ClientSession` solo existen como tipos en ESM.
import type { ClientSession, Connection, Model } from 'mongoose';
import { Types } from 'mongoose';
import {
  API_ERROR_TYPES,
  ApiException,
  createNotFoundException,
} from '../common/errors/api-exception.js';
import { Route, type RouteDocument } from '../routes/schemas/route.schema.js';
import { Unit, type UnitDocument } from '../units/schemas/unit.schema.js';
import { buildOverlapFilter, type TimeWindow } from './domain/overlap.js';
import type { CreateDutyDto } from './dto/create-duty.dto.js';
import type { UnitAvailabilityQueryDto } from './dto/unit-availability-query.dto.js';
import type { UpdateDutyDto } from './dto/update-duty.dto.js';
import { Duty, type DutyDocument } from './schemas/duty.schema.js';

// Etiquetas con que MongoDB marca los errores de una transacción que merecería reintentarse.
// Si llegan hasta aquí es que `withTransaction` agotó su ventana de reintentos (120 s).
const RETRYABLE_TRANSACTION_LABELS = [
  'TransientTransactionError',
  'UnknownTransactionCommitResult',
];
const TRANSACTION_TIMEOUT_ERROR_NAME = 'MongoOperationTimeoutError';

/** Datos del duty con el que choca uno nuevo, para que la interfaz explique el conflicto. */
export interface ConflictingDutyDetails {
  id: string;
  routeId: string;
  routeName: string;
  unitCode: string;
  startAt: Date;
  endAt: Date;
}

/** Ruta donde una unidad tiene duties, para que la interfaz diga dónde buscarlos. */
export interface UnitDutyRoute {
  id: string;
  name: string;
  dutyCount: number;
}

/** Duty que ocupa a una unidad durante una ventana consultada. */
export interface OccupyingDuty {
  id: string;
  routeId: string;
  routeName: string;
  startAt: Date;
  endAt: Date;
}

/** Una unidad y si está libre en una ventana. */
export interface UnitAvailability {
  unitId: string;
  code: string;
  name: string;
  isAvailable: boolean;
  occupyingDuty?: OccupyingDuty;
}

/** Recuento de duties de una unidad agrupado por ruta, tal como sale de la agregación. */
interface RouteDutyCount {
  _id: Types.ObjectId;
  dutyCount: number;
}

/** Forma mínima de un error del driver de MongoDB con etiquetas. */
interface LabeledMongoError {
  name: string;
  errorLabels?: string[];
}

/** Gestiona los duties y garantiza que una unidad no tenga dos ventanas solapadas. */
@Injectable()
export class DutiesService {
  constructor(
    @InjectConnection() private readonly databaseConnection: Connection,
    @InjectModel(Duty.name) private readonly dutyModel: Model<Duty>,
    @InjectModel(Unit.name) private readonly unitModel: Model<Unit>,
    @InjectModel(Route.name) private readonly routeModel: Model<Route>,
  ) {}

  /** Crea un duty bloqueando la unidad; 404 si la unidad o la ruta no existen y 409 si su ventana se solapa con otro duty de la misma unidad. */
  async createDuty(createDutyDto: CreateDutyDto): Promise<DutyDocument> {
    const newWindow: TimeWindow = {
      startAt: new Date(createDutyDto.startAt),
      endAt: new Date(createDutyDto.endAt),
    };
    const session = await this.databaseConnection.startSession();

    try {
      // `withTransaction` puede ejecutar esta función varias veces si MongoDB detecta un
      // conflicto transitorio, así que no debe tener efectos fuera de la base.
      return await session.withTransaction(() =>
        this.createDutyInsideTransaction(createDutyDto, newWindow, session),
      );
    } catch (error) {
      throw translateTransactionError(error);
    } finally {
      await session.endSession();
    }
  }

  /** Ejecuta, dentro de la transacción y en este orden, el bloqueo, las comprobaciones y la inserción. */
  private async createDutyInsideTransaction(
    createDutyDto: CreateDutyDto,
    newWindow: TimeWindow,
    session: ClientSession,
  ): Promise<DutyDocument> {
    const lockedUnit = await this.lockUnitSchedule(createDutyDto.unitId, session);
    await this.findRouteOrFail(createDutyDto.routeId, session);

    const overlappingDuty = await this.findOverlappingDuty(
      createDutyDto.unitId,
      newWindow,
      session,
    );
    if (overlappingDuty) {
      throw await this.createOverlapConflict(overlappingDuty, lockedUnit, session);
    }

    // Se crea con un arreglo y la sesión, no con `new Model().save()`: Mongoose tiene un
    // problema conocido con documentos nuevos cuando la transacción se reintenta.
    const [createdDuty] = await this.dutyModel.create(
      [
        {
          routeId: createDutyDto.routeId,
          unitId: createDutyDto.unitId,
          startAt: newWindow.startAt,
          endAt: newWindow.endAt,
        },
      ],
      { session },
    );
    return createdDuty;
  }

  /** Incrementa `scheduleVersion` de la unidad para bloquear su agenda en esta transacción; 404 si no existe. */
  private async lockUnitSchedule(unitId: string, session: ClientSession): Promise<UnitDocument> {
    // ESTE INCREMENTO ES TODO EL MECANISMO DE CONCURRENCIA. Su valor no significa nada y nadie lo
    // lee. Existe para que dos transacciones que asignan duties a la misma unidad escriban en el
    // mismo documento: así MongoDB detecta el conflicto de escritura y obliga a una de ellas a
    // reintentar, y al reintentar ya ve el duty de la otra. Sin él, cada una insertaría un duty
    // distinto sin conflicto que detectar (write skew) y ambas confirmarían. No se toca.
    const lockedUnit = await this.unitModel
      .findByIdAndUpdate(
        unitId,
        { $inc: { scheduleVersion: 1 } },
        { session, returnDocument: 'after' },
      )
      .exec();

    if (!lockedUnit) {
      throw createNotFoundException(`No existe una unidad con id ${unitId}.`);
    }
    return lockedUnit;
  }

  /** Devuelve la ruta dentro de la transacción; 404 si no existe. */
  private async findRouteOrFail(routeId: string, session: ClientSession): Promise<RouteDocument> {
    const route = await this.routeModel.findById(routeId, { name: 1 }).session(session).exec();

    if (!route) {
      throw createNotFoundException(`No existe una ruta con id ${routeId}.`);
    }
    return route;
  }

  /** Busca, dentro de la transacción, un duty de la unidad cuya ventana se solape con la nueva; al editar, sin contar el propio. */
  private async findOverlappingDuty(
    unitId: string,
    newWindow: TimeWindow,
    session: ClientSession,
    excludedDutyId?: string,
  ): Promise<DutyDocument | null> {
    const overlapFilter: Record<string, unknown> = { unitId, ...buildOverlapFilter(newWindow) };
    if (excludedDutyId !== undefined) {
      // Sin esto, al editar un duty su propia ventana chocaría consigo misma.
      overlapFilter._id = { $ne: excludedDutyId };
    }
    return this.dutyModel.findOne(overlapFilter).session(session).exec();
  }

  /** Construye el error 409 con los datos del duty con el que choca, leídos dentro de la transacción. */
  private async createOverlapConflict(
    overlappingDuty: DutyDocument,
    lockedUnit: UnitDocument,
    session: ClientSession,
  ): Promise<ApiException> {
    const conflictingRoute = await this.routeModel
      .findById(overlappingDuty.routeId, { name: 1 })
      .session(session)
      .exec();
    // La ruta existe salvo que se haya borrado por fuera de la api; no hay borrado de rutas.
    const conflictingRouteName = conflictingRoute?.name ?? '(ruta eliminada)';

    const conflictingDuty: ConflictingDutyDetails = {
      id: overlappingDuty.id,
      routeId: String(overlappingDuty.routeId),
      routeName: conflictingRouteName,
      unitCode: lockedUnit.code,
      startAt: overlappingDuty.startAt,
      endAt: overlappingDuty.endAt,
    };

    return new ApiException(
      HttpStatus.CONFLICT,
      API_ERROR_TYPES.conflict,
      `La unidad ${lockedUnit.code} ya tiene un duty que se solapa con esa ventana, ` +
        `en la ruta "${conflictingRouteName}".`,
      { conflictingDuty },
    );
  }

  /** Cambia la unidad y la ventana de un duty con la misma garantía que al crearlo; 404 si faltan el duty o la unidad y 409 si se solapa. */
  async updateDuty(dutyId: string, updateDutyDto: UpdateDutyDto): Promise<DutyDocument> {
    const newWindow: TimeWindow = {
      startAt: new Date(updateDutyDto.startAt),
      endAt: new Date(updateDutyDto.endAt),
    };
    const session = await this.databaseConnection.startSession();

    try {
      return await session.withTransaction(() =>
        this.updateDutyInsideTransaction(dutyId, updateDutyDto.unitId, newWindow, session),
      );
    } catch (error) {
      throw translateTransactionError(error);
    } finally {
      await session.endSession();
    }
  }

  /** Ejecuta, dentro de la transacción, el bloqueo de la unidad de destino, las comprobaciones y el cambio. */
  private async updateDutyInsideTransaction(
    dutyId: string,
    targetUnitId: string,
    newWindow: TimeWindow,
    session: ClientSession,
  ): Promise<DutyDocument> {
    // Se bloquea la unidad de destino, que es la única que puede quedar con un solapamiento. La de
    // origen solo pierde un duty, y eso no puede crear ningún conflicto.
    const lockedUnit = await this.lockUnitSchedule(targetUnitId, session);

    const duty = await this.dutyModel.findById(dutyId).session(session).exec();
    if (!duty) {
      throw createNotFoundException(`No existe un duty con id ${dutyId}.`);
    }

    const overlappingDuty = await this.findOverlappingDuty(
      targetUnitId,
      newWindow,
      session,
      dutyId,
    );
    if (overlappingDuty) {
      throw await this.createOverlapConflict(overlappingDuty, lockedUnit, session);
    }

    // Se guarda el documento cargado, y no con `updateOne`, para que corra el validador del esquema
    // (`endAt > startAt`), que necesita el documento completo.
    duty.set({ unitId: targetUnitId, startAt: newWindow.startAt, endAt: newWindow.endAt });
    return duty.save({ session });
  }

  /** Elimina un duty; 404 si no existe. */
  async deleteDuty(dutyId: string): Promise<void> {
    // No bloquea la unidad: borrar no puede crear un solapamiento. Una creación simultánea como
    // mucho verá todavía este duty y responderá 409, que es el error seguro.
    const deletedDuty = await this.dutyModel.findByIdAndDelete(dutyId).exec();

    if (!deletedDuty) {
      throw createNotFoundException(`No existe un duty con id ${dutyId}.`);
    }
  }

  /** Borra una unidad solo si no tiene duties; 404 si no existe y 409 (con sus rutas) si tiene alguno. */
  async deleteUnit(unitId: string): Promise<void> {
    const session = await this.databaseConnection.startSession();

    try {
      // Sin transacción, una asignación simultánea podría colarse entre el recuento y el borrado
      // y dejar un duty apuntando a una unidad que ya no existe.
      await session.withTransaction(() => this.deleteUnitInsideTransaction(unitId, session));
    } catch (error) {
      throw translateTransactionError(error);
    } finally {
      await session.endSession();
    }
  }

  /** Comprueba, dentro de la transacción, que la unidad existe y no tiene duties, y la borra. */
  private async deleteUnitInsideTransaction(unitId: string, session: ClientSession): Promise<void> {
    const unit = await this.unitModel.findById(unitId, { code: 1 }).session(session).exec();
    if (!unit) {
      throw createNotFoundException(`No existe una unidad con id ${unitId}.`);
    }

    const unitDutyRoutes = await this.findUnitDutyRoutes(unitId, session);
    if (unitDutyRoutes.length > 0) {
      throw createUnitInUseException(unit.code, unitDutyRoutes);
    }

    // Este borrado escribe en el mismo documento que incrementa `lockUnitSchedule` al asignar un
    // duty. Si las dos operaciones coinciden, MongoDB detecta el conflicto de escritura y obliga a
    // una a reintentar: o el borrado ve el duty nuevo y responde 409, o la asignación ya no
    // encuentra la unidad y responde 404. Por eso no hace falta un `$inc` propio aquí.
    await this.unitModel.deleteOne({ _id: unitId }).session(session).exec();
  }

  /** Devuelve, dentro de la transacción, las rutas donde la unidad tiene duties y cuántos en cada una. */
  private async findUnitDutyRoutes(
    unitId: string,
    session: ClientSession,
  ): Promise<UnitDutyRoute[]> {
    // La agregación no convierte tipos como `find`: el id tiene que ir ya como ObjectId.
    const routeDutyCounts = await this.dutyModel
      .aggregate<RouteDutyCount>([
        { $match: { unitId: new Types.ObjectId(unitId) } },
        { $group: { _id: '$routeId', dutyCount: { $sum: 1 } } },
      ])
      .session(session)
      .exec();

    if (routeDutyCounts.length === 0) {
      return [];
    }

    const routeIds = routeDutyCounts.map((routeDutyCount) => routeDutyCount._id);
    const routes = await this.routeModel
      .find({ _id: { $in: routeIds } }, { name: 1 })
      .session(session)
      .exec();

    return routeDutyCounts.map((routeDutyCount) => {
      const route = routes.find((candidate) => candidate._id.equals(routeDutyCount._id));
      return {
        id: String(routeDutyCount._id),
        name: route?.name ?? '(ruta eliminada)',
        dutyCount: routeDutyCount.dutyCount,
      };
    });
  }

  /** Indica qué unidades están libres en una ventana y, de las ocupadas, qué duty las ocupa. */
  async findUnitAvailability(
    availabilityQuery: UnitAvailabilityQueryDto,
  ): Promise<UnitAvailability[]> {
    // Es una ayuda para planificar, no la garantía: se lee sin transacción, y otra persona puede
    // ocupar una unidad libre un instante después. La garantía la da `createDuty` al asignar.
    const availabilityWindow: TimeWindow = {
      startAt: new Date(availabilityQuery.startAt),
      endAt: new Date(availabilityQuery.endAt),
    };
    const units = await this.unitModel.find({}, { code: 1, name: 1 }).sort({ code: 1 }).exec();
    const overlappingDuties = await this.findDutiesOverlappingWindow(
      availabilityWindow,
      availabilityQuery.excludeDutyId,
    );
    const routeNamesById = await this.findRouteNamesById(overlappingDuties);

    return units.map((unit) => {
      const occupyingDuty = overlappingDuties.find((duty) => duty.unitId.equals(unit._id));
      const unitAvailability: UnitAvailability = {
        unitId: unit.id,
        code: unit.code,
        name: unit.name,
        isAvailable: occupyingDuty === undefined,
      };
      if (occupyingDuty) {
        unitAvailability.occupyingDuty = {
          id: occupyingDuty.id,
          routeId: String(occupyingDuty.routeId),
          routeName: routeNamesById.get(String(occupyingDuty.routeId)) ?? '(ruta eliminada)',
          startAt: occupyingDuty.startAt,
          endAt: occupyingDuty.endAt,
        };
      }
      return unitAvailability;
    });
  }

  /** Devuelve los duties de cualquier unidad que se solapan con la ventana, salvo el indicado. */
  private async findDutiesOverlappingWindow(
    window: TimeWindow,
    excludedDutyId: string | undefined,
  ): Promise<DutyDocument[]> {
    // La misma condición que usa la asignación: si la regla cambia, cambia en los dos sitios a la vez.
    const overlapFilter: Record<string, unknown> = buildOverlapFilter(window);
    if (excludedDutyId !== undefined) {
      overlapFilter._id = { $ne: excludedDutyId };
    }
    return this.dutyModel.find(overlapFilter).sort({ startAt: 1 }).exec();
  }

  /** Devuelve el nombre de cada ruta de los duties indicados, por id de ruta. */
  private async findRouteNamesById(duties: DutyDocument[]): Promise<Map<string, string>> {
    const routeIds = duties.map((duty) => duty.routeId);
    const routes = await this.routeModel.find({ _id: { $in: routeIds } }, { name: 1 }).exec();
    return new Map(routes.map((route) => [route.id as string, route.name]));
  }

  /** Devuelve los duties de una ruta con los datos de su unidad, ordenados por inicio; 404 si la ruta no existe. */
  async findRouteDuties(routeId: string): Promise<DutyDocument[]> {
    const routeExists = await this.routeModel.exists({ _id: routeId }).exec();

    if (!routeExists) {
      throw createNotFoundException(`No existe una ruta con id ${routeId}.`);
    }

    return this.dutyModel
      .find({ routeId })
      .sort({ startAt: 1 })
      .populate({ path: 'unit', select: { code: 1, name: 1 } })
      .exec();
  }
}

/** Crea el 409 de una unidad que no se puede borrar porque tiene duties, indicando en qué rutas. */
function createUnitInUseException(unitCode: string, unitDutyRoutes: UnitDutyRoute[]): ApiException {
  const dutyCount = unitDutyRoutes.reduce(
    (total, unitDutyRoute) => total + unitDutyRoute.dutyCount,
    0,
  );
  const dutyWord = dutyCount === 1 ? 'duty' : 'duties';

  return new ApiException(
    HttpStatus.CONFLICT,
    API_ERROR_TYPES.unitInUse,
    `No se puede eliminar ${unitCode}: tiene ${dutyCount} ${dutyWord}. Elimínalos antes.`,
    { dutyCount, routes: unitDutyRoutes },
  );
}

/** Convierte el agotamiento de los reintentos de la transacción en un 503 claro; el resto de errores pasa intacto. */
function translateTransactionError(error: unknown): unknown {
  if (error instanceof ApiException) {
    return error;
  }

  const isRetryExhausted = isRetryableTransactionError(error);
  if (!isRetryExhausted) {
    return error;
  }

  return new ApiException(
    HttpStatus.SERVICE_UNAVAILABLE,
    API_ERROR_TYPES.scheduleBusy,
    'La agenda de esta unidad está muy solicitada en este momento. Inténtalo de nuevo.',
  );
}

/** Indica si el error es de los que `withTransaction` reintenta, o su vencimiento por tiempo. */
function isRetryableTransactionError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const mongoError = error as LabeledMongoError;
  const isTimeout = mongoError.name === TRANSACTION_TIMEOUT_ERROR_NAME;
  const errorLabels = mongoError.errorLabels ?? [];
  const hasRetryableLabel = errorLabels.some((label) =>
    RETRYABLE_TRANSACTION_LABELS.includes(label),
  );

  return isTimeout || hasRetryableLabel;
}
