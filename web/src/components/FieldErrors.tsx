// Mensajes de error de un campo de formulario, mostrados justo debajo de él.
import styles from '../styles/FieldErrors.module.css';

interface FieldErrorsProps {
  id: string;
  messages: string[] | undefined;
}

/** Lista los errores de un campo; el `id` permite enlazarlos al campo con `aria-describedby`. */
export function FieldErrors({ id, messages }: FieldErrorsProps) {
  const hasMessages = messages !== undefined && messages.length > 0;
  if (!hasMessages) {
    return null;
  }

  return (
    <ul id={id} className={styles.fieldErrors}>
      {messages.map((message) => (
        <li key={message}>{message}</li>
      ))}
    </ul>
  );
}
