// Mensaje de estado reutilizable para cargas, listados vacíos y errores.
import type { ReactNode } from 'react';
import styles from '../styles/StatusMessage.module.css';

type StatusKind = 'loading' | 'empty' | 'error';

interface StatusMessageProps {
  kind: StatusKind;
  title: string;
  children?: ReactNode;
}

const KIND_CLASS_NAMES: Record<StatusKind, string> = {
  loading: styles.loading,
  empty: styles.empty,
  error: styles.error,
};

/** Muestra un estado de carga, vacío o error con un título y, si hace falta, qué hacer después. */
export function StatusMessage({ kind, title, children }: StatusMessageProps) {
  // Los errores se anuncian de inmediato a los lectores de pantalla; el resto, con cortesía.
  const liveRegionRole = kind === 'error' ? 'alert' : 'status';

  return (
    <div className={`${styles.statusMessage} ${KIND_CLASS_NAMES[kind]}`} role={liveRegionRole}>
      <p className={styles.title}>{title}</p>
      {children && <div className={styles.body}>{children}</div>}
    </div>
  );
}
