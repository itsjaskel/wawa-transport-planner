// Expone el estado del servicio y de su conexión a MongoDB.
// Docker usa este endpoint como healthcheck, así que debe fallar cuando la base no responde.
import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectConnection } from '@nestjs/mongoose';
// Mongoose es CommonJS: en ESM, Node no expone `Connection` como export con nombre.
// Se importa como tipo, que desaparece al compilar. Ver la convención en CLAUDE.md.
import type { Connection } from 'mongoose';

// Valor de `readyState` de Mongoose que significa "conectado". Los demás son
// desconectado, conectando y desconectando.
const MONGOOSE_CONNECTED_STATE = 1;

/** Respuesta del endpoint de salud, pensada para leerse a simple vista en la terminal. */
export interface HealthStatus {
  status: 'ok';
  database: {
    isConnected: boolean;
    name: string;
    replicaSetName: string | null;
  };
}

@ApiTags('Estado')
@Controller('health')
export class HealthController {
  constructor(@InjectConnection() private readonly databaseConnection: Connection) {}

  /** Informa si la api y su conexión a MongoDB están operativas; responde 503 si la base no responde. */
  @Get()
  @ApiOperation({ summary: 'Estado de la api y de su conexión a MongoDB (replica set incluido)' })
  async getHealth(): Promise<HealthStatus> {
    const isConnected = this.databaseConnection.readyState === MONGOOSE_CONNECTED_STATE;

    if (!isConnected) {
      throw new ServiceUnavailableException('La api no tiene conexión con MongoDB.');
    }

    const replicaSetName = await this.readReplicaSetName();

    return {
      status: 'ok',
      database: {
        isConnected: true,
        name: this.databaseConnection.name,
        replicaSetName,
      },
    };
  }

  /** Devuelve el nombre del replica set activo, o null si la base no forma parte de ninguno. */
  private async readReplicaSetName(): Promise<string | null> {
    const database = this.databaseConnection.db;

    if (!database) {
      throw new ServiceUnavailableException('La api no tiene conexión con MongoDB.');
    }

    const helloResult = await database.admin().command({ hello: 1 });
    return helloResult.setName ?? null;
  }
}
