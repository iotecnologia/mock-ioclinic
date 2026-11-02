// Marca: em DESTAQUE, a da Dra. (emblema + nome + especialidade, vindos de dados/clinica.json).
// A IO aparece como quem desenvolveu: "IO Clinic v0.1 · IO Tecnologia" no rodapé do menu, no login e na abertura.
import { useDados } from './Dados';
import { LogoDra } from './LogoDra';

export const VERSAO = 'v0.1';

/** "Dra. Flávia Silva Mothé" → "Dra. Flávia Mothé" (primeiro e último nome). */
export function nomeCurto(medica: string): string {
  const titulo = medica.match(/^(Dra?\.)\s*/)?.[1];
  const partes = medica.replace(/^Dra?\.\s*/, '').trim().split(/\s+/);
  return `${titulo ? titulo + ' ' : ''}${partes[0]}${partes.length > 1 ? ' ' + partes[partes.length - 1] : ''}`;
}

/** Topo do menu lateral: emblema da Dra. + nome + especialidade. */
export function Marca() {
  const { base } = useDados();
  return (
    <div className="marca dra">
      <LogoDra tam={40} tinta="clara" />
      <div><b>{nomeCurto(base.clinica.medica)}</b><small>{base.clinica.especialidade}</small></div>
    </div>
  );
}

/** Crédito do sistema (discreto): IO Clinic + versão + IO Tecnologia. */
export function CreditoIO({ versao = true }: { versao?: boolean }) {
  return <span className="credito-io">IO Clinic{versao ? ` ${VERSAO}` : ''} · IO Tecnologia</span>;
}
