// Armazón de la interfaz: cabecera con la marca, la navegación principal y el estado de la
// conexión, y debajo la pantalla que corresponda a la dirección actual.
import { NavLink, Outlet } from 'react-router';
import { ApiHealthBadge } from './components/ApiHealthBadge';
import styles from './styles/App.module.css';

/** Devuelve la clase de un enlace de navegación, resaltando el de la sección actual. */
function readNavLinkClassName({ isActive }: { isActive: boolean }): string {
  if (isActive) {
    return `${styles.navLink} ${styles.navLinkActive}`;
  }
  return styles.navLink;
}

/** Componente raíz de Rumb@: cabecera común y la pantalla actual. */
export default function App() {
  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.brandBlock}>
            <span className={styles.brand}>Rumb@</span>
            <span className={styles.tagline}>Planificación de rutas, unidades y duties</span>
          </div>
          <nav className={styles.nav} aria-label="Principal">
            <NavLink to="/routes" className={readNavLinkClassName}>
              Rutas
            </NavLink>
            <NavLink to="/units" className={readNavLinkClassName}>
              Unidades
            </NavLink>
          </nav>
          <ApiHealthBadge />
        </div>
      </header>

      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
