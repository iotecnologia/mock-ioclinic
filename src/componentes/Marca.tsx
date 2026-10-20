// Marca do produto: IO Clinic e, embaixo, o nome da médica (vem de dados/clinica.json).
import { useDados } from './Dados';

export function Logo({ tam = 34 }: { tam?: number }) {
  return (
    <svg width={tam} height={tam} viewBox="0 0 64 64" aria-hidden="true" className="logo-svg">
      <rect width="64" height="64" rx="16" fill="#DEE8F4" />
      <path d="M12 34h10l4-10 7 20 5-13 3 3h11" fill="none" stroke="#0C3257" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Marca() {
  const { base } = useDados();
  return (
    <div className="marca">
      <Logo />
      <div><b>IO CLINIC</b><small>{base.clinica.medica}</small></div>
    </div>
  );
}
