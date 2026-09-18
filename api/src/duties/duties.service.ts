// Creación, borrado y lectura de duties. Aquí vive la garantía central del negocio: una unidad
// nunca tiene dos duties solapados, ni siquiera con peticiones simultáneas. Ver CLAUDE.md §4.
import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
// Mongoose es CommonJS: `Connection` y `ClientSession` solo existen como tipos en ESM.
import type { ClientSession, Connection, Model } from 'mongoose';
import {
  API_ERROR_TYPES,
  ApiException,
  createNotFoundException,
} from '../common/errors/api-exception.js';
import { Route, type RouteDocument } from '../routes/schemas/route.schema.js';
import { Unit, type UnitDocument } from '../units/schemas/unit.schema.js';
import { buildOverlapFilter, type TimeWindow } from './domain/overlap.js';
import type { CreateDutyDto } from './dto/create-duty.dto.js';
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

  /** Busca, dentro de la transacción, un duty de la unidad cuya ventana se solape con la nueva. */
  private async findOverlappingDuty(
    unitId: string,
    newWindow: TimeWindow,
    session: ClientSession,
  ): Promise<DutyDocument | null> {
    return this.dutyModel
      .findOne({ unitId, ...buildOverlapFilter(newWindow) })
      .session(session)
      .exec();
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

  /** Elimina un duty; 404 si no existe. */
  async deleteDuty(dutyId: string): Promise<void> {
    // No bloquea la unidad: borrar no puede crear un solapamiento. Una creación simultánea como
    // mucho verá todavía este duty y responderá 409, que es el error seguro.
    const deletedDuty = await this.dutyModel.findByIdAndDelete(dutyId).exec();

    if (!deletedDuty) {
      throw createNotFoundException(`No existe un duty con id ${dutyId}.`);
    }
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
