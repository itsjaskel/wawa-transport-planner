// Etiqueta con el estado de la conexión entre la interfaz, la api y la base de datos.
import { useApiHealth } from '../hooks/useApiHealth';
import styles from '../styles/ApiHealthBadge.module.css';

/** Muestra si la api y su base de datos responden, como una etiqueta de color con texto. */
export function ApiHealthBadge() {
  const { data: health, isPending, isError } = useApiHealth();

  if (isPending) {
    return <span className={`${styles.badge} ${styles.loading}`}>Comprobando conexión…</span>;
  }

  if (isError) {
    return <span className={`${styles.badge} ${styles.error}`}>Sin conexión con la api</span>;
  }

  if (!health.database.isConnected) {
    return <span className={`${styles.badge} ${styles.error}`}>Base de datos no disponible</span>;
  }

  return <span className={`${styles.badge} ${styles.ok}`}>Conectado</span>;
}
