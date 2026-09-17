// Inicializa el replica set de un solo nodo que MongoDB necesita para soportar transacciones.
// Se ejecuta como un servicio efímero aparte y no dentro del arranque de la api, porque la api
// no debe levantar hasta que exista un primario elegido.
// Es idempotente: si el replica set ya estaba iniciado, no hace nada y termina con exito.

const REPLICA_SET_NAME = 'rs0';
const REPLICA_SET_MEMBER_HOST = 'mongo:27017';
const MAX_WAIT_ATTEMPTS = 60;
const WAIT_INTERVAL_MS = 1000;

/** Indica si este nodo ya forma parte de un replica set iniciado. */
function isReplicaSetInitiated() {
  try {
    rs.status();
    return true;
  } catch (error) {
    // Un nodo virgen responde con NotYetInitialized (código 94). Cualquier otro
    // error también se trata como "sin iniciar": el intento de iniciarlo dira que pasa.
    return false;
  }
}

/** Espera a que el replica set elija un primario y aborta si no ocurre a tiempo. */
function waitForPrimary() {
  for (let attempt = 1; attempt <= MAX_WAIT_ATTEMPTS; attempt += 1) {
    const hello = db.hello();

    if (hello.isWritablePrimary) {
      print('[mongo-init] primario elegido: ' + hello.me);
      return;
    }

    print('[mongo-init] esperando a que se elija un primario (' + attempt + ')…');
    sleep(WAIT_INTERVAL_MS);
  }

  throw new Error('[mongo-init] no se eligio un primario dentro del tiempo previsto.');
}

if (isReplicaSetInitiated()) {
  print('[mongo-init] el replica set ya estaba iniciado, no se hace nada.');
} else {
  print('[mongo-init] iniciando el replica set ' + REPLICA_SET_NAME + '…');
  rs.initiate({
    _id: REPLICA_SET_NAME,
    members: [{ _id: 0, host: REPLICA_SET_MEMBER_HOST }],
  });
}

waitForPrimary();
print('[mongo-init] listo.');
