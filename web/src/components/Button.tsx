// Botones de la aplicación con sus variantes, y el enlace con aspecto de botón.
import type { ButtonHTMLAttributes } from 'react';
import { Link, type LinkProps } from 'react-router';
import styles from '../styles/Button.module.css';

type ButtonVariant = 'primary' | 'secondary' | 'danger';

const VARIANT_CLASS_NAMES: Record<ButtonVariant, string> = {
  primary: styles.primary,
  secondary: styles.secondary,
  danger: styles.danger,
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

/** Botón con la variante visual indicada; por defecto no envía formularios si no se pide. */
export function Button({
  variant = 'primary',
  className = '',
  type = 'button',
  ...buttonProps
}: ButtonProps) {
  const variantClassName = VARIANT_CLASS_NAMES[variant];
  return (
    <button
      type={type}
      className={`${styles.button} ${variantClassName} ${className}`}
      {...buttonProps}
    />
  );
}

interface ButtonLinkProps extends LinkProps {
  variant?: ButtonVariant;
}

/** Enlace de navegación con aspecto de botón, para acciones que llevan a otra pantalla. */
export function ButtonLink({ variant = 'primary', className = '', ...linkProps }: ButtonLinkProps) {
  const variantClassName = VARIANT_CLASS_NAMES[variant];
  return <Link className={`${styles.button} ${variantClassName} ${className}`} {...linkProps} />;
}
