// Pantalla para direcciones que no existen, con salida de vuelta al listado.
import { Link } from 'react-router';
import { StatusMessage } from '../components/StatusMessage';
import styles from '../styles/NotFoundPage.module.css';

/** Avisa de que la página no existe y ofrece volver al listado de rutas. */
export function NotFoundPage() {
  return (
    <section className={styles.notFoundPage}>
      <StatusMessage kind="empty" title="Esta página no existe.">
        <Link to="/routes">Volver al listado de rutas</Link>
      </StatusMessage>
    </section>
  );
}
