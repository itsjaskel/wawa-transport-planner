// Aviso breve de que una acción terminó bien; desaparece solo al cabo de unos segundos.
import { useEffect } from 'react';
import styles from '../styles/SuccessNotice.module.css';

const NOTICE_VISIBLE_MS = 5000;

interface SuccessNoticeProps {
  message: string | null;
  onDismiss: () => void;
}

/** Muestra el mensaje de éxito indicado y avisa para ocultarlo cuando pasa su tiempo. */
export function SuccessNotice({ message, onDismiss }: SuccessNoticeProps) {
  useEffect(() => {
    if (!message) {
      return;
    }
    const dismissTimer = window.setTimeout(onDismiss, NOTICE_VISIBLE_MS);
    return () => window.clearTimeout(dismissTimer);
  }, [message, onDismiss]);

  if (!message) {
    return null;
  }

  return (
    <p className={styles.successNotice} role="status">
      {message}
    </p>
  );
}
