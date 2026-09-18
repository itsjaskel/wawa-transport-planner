// Diálogo modal de confirmación para acciones destructivas, con el elemento `<dialog>` nativo.
import { useEffect, useRef } from 'react';
import styles from '../styles/ConfirmDialog.module.css';
import { Button } from './Button';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  isConfirming: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Pide confirmación antes de una acción destructiva; bloquea el resto de la página mientras está abierto. */
export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel,
  isConfirming,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  // `<dialog>` se abre y cierra con métodos, no con atributos: se sincroniza con la prop.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (isOpen && !dialog.open) {
      dialog.showModal();
    }
    if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  return (
    // `onCancel` cubre la tecla Escape, que el navegador trata como cancelar.
    <dialog
      ref={dialogRef}
      className={styles.confirmDialog}
      onCancel={onCancel}
      aria-labelledby="confirm-dialog-title"
    >
      <h2 id="confirm-dialog-title" className={styles.title}>
        {title}
      </h2>
      <p className={styles.description}>{description}</p>
      <div className={styles.actions}>
        <Button variant="secondary" onClick={onCancel} disabled={isConfirming}>
          Cancelar
        </Button>
        <Button variant="danger" onClick={onConfirm} disabled={isConfirming}>
          {isConfirming ? 'Eliminando…' : confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}
