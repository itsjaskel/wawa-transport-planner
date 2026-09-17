// Armazon de la aplicación. En la Fase 0 solo muestra la marca y comprueba que la
// cadena navegador -> api -> MongoDB está completa; las pantallas llegan en la Fase 3.
import { useApiHealth } from './hooks/useApiHealth';
import styles from './styles/App.module.css';

/** Muestra el estado de la conexión con la api como una etiqueta de color legible. */
function ApiHealthBadge() {
  const { data: health, isPending, isError } = useApiHealth();

  if (isPending) {
    return <span className={`${styles.badge} ${styles.badgeLoading}`}>Comprobando…</span>;
  }

  if (isError) {
    return <span className={`${styles.badge} ${styles.badgeError}`}>Sin conexión</span>;
  }

  if (!health.database.isConnected) {
    return <span className={`${styles.badge} ${styles.badgeError}`}>Base no disponible</span>;
  }

  return <span className={`${styles.badge} ${styles.badgeOk}`}>Operativa</span>;
}

/** Detalla la base de datos a la que la api está conectada, o el motivo por el que no se pudo saber. */
function ApiHealthDetails() {
  const { data: health, isPending, isError, error } = useApiHealth();

  if (isPending) {
    return null;
  }

  if (isError) {
    return <p className={styles.errorText}>{error.message}</p>;
  }

  const replicaSetLabel = health.database.replicaSetName ?? 'sin replica set';

  return (
    <dl className={styles.detailList}>
      <dt className={styles.detailTerm}>Base de datos</dt>
      <dd className={styles.detailValue}>{health.database.name}</dd>
      <dt className={styles.detailTerm}>Replica set</dt>
      <dd className={styles.detailValue}>{replicaSetLabel}</dd>
    </dl>
  );
}

/** Componente raiz de Rumb@: cabecera de marca y panel de estado del entorno. */
export default function App() {
  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <span className={styles.brand}>Rumb@</span>
          <p className={styles.tagline}>Planificación de rutas, unidades y duties</p>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.card}>
          <h1 className={styles.cardTitle}>Estado del entorno</h1>
          <div className={styles.statusRow}>
            <span className={styles.statusLabel}>Api</span>
            <ApiHealthBadge />
          </div>
          <ApiHealthDetails />
        </section>
      </main>
    </div>
  );
}
