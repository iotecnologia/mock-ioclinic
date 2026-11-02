// Período de consulta do Painel, do Financeiro e dos Relatórios: dia, semana, mês, trimestre, ano ou personalizado.
// As três telas usam o MESMO período (componentes/SeletorPeriodo.tsx) e as mesmas contas (regras/financeiro.ts),
// então os números sempre batem entre elas. Funções puras, testadas em tests/periodo.test.ts.
import { br, brCurto, deIso, inicioSemana, iso, nomeDiaCurto, somaDias } from '../util/datas';

export type Escala = 'dia' | 'semana' | 'mes' | 'trimestre' | 'ano' | 'personalizado';
export interface Periodo { escala: Escala; de: string; ate: string }

export const ESCALAS: { id: Escala; nome: string }[] = [
  { id: 'dia', nome: 'Dia' }, { id: 'semana', nome: 'Semana' }, { id: 'mes', nome: 'Mês' },
  { id: 'trimestre', nome: 'Trimestre' }, { id: 'ano', nome: 'Ano' }, { id: 'personalizado', nome: 'Personalizado' },
];

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const MESES_C = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const fimMes = (a: number, m0: number) => iso(new Date(a, m0 + 1, 0));
/** Dias entre duas datas (b − a). */
export const dias = (a: string, b: string) => Math.round((deIso(b).getTime() - deIso(a).getTime()) / 86400000);

/** Período da escala que contém a data `ref`. */
export function periodoDe(escala: Exclude<Escala, 'personalizado'>, ref: string): Periodo {
  const d = deIso(ref), a = d.getFullYear(), m = d.getMonth();
  if (escala === 'dia') return { escala, de: ref, ate: ref };
  if (escala === 'semana') { const ini = inicioSemana(ref) > ref ? somaDias(inicioSemana(ref), -7) : inicioSemana(ref); return { escala, de: ini, ate: somaDias(ini, 6) }; }
  if (escala === 'mes') return { escala, de: iso(new Date(a, m, 1)), ate: fimMes(a, m) };
  if (escala === 'trimestre') { const t = Math.floor(m / 3) * 3; return { escala, de: iso(new Date(a, t, 1)), ate: fimMes(a, t + 2) }; }
  return { escala, de: `${a}-01-01`, ate: `${a}-12-31` };
}

/** Anda `n` períodos para frente (ou para trás, n negativo). Personalizado anda o próprio tamanho. */
export function mover(p: Periodo, n: number): Periodo {
  if (p.escala === 'personalizado') { const t = dias(p.de, p.ate) + 1; return { ...p, de: somaDias(p.de, t * n), ate: somaDias(p.ate, t * n) }; }
  if (p.escala === 'dia') return periodoDe('dia', somaDias(p.de, n));
  if (p.escala === 'semana') return periodoDe('semana', somaDias(p.de, 7 * n));
  const d = deIso(p.de);
  const passo = p.escala === 'mes' ? 1 : p.escala === 'trimestre' ? 3 : 12;
  return periodoDe(p.escala, iso(new Date(d.getFullYear(), d.getMonth() + passo * n, 1)));
}

/**
 * Período de comparação (o anterior). Se o período atual ainda não terminou, compara só a parte que já passou
 * com a mesma parte do anterior (ex.: 1º a 15 de outubro × 1º a 15 de setembro).
 */
export function comparacao(p: Periodo, hojeIso: string): { atual: { de: string; ate: string }; anterior: { de: string; ate: string }; parcial: boolean } {
  const ant = mover(p, -1);
  const parcial = p.de <= hojeIso && hojeIso < p.ate;
  if (!parcial) return { atual: { de: p.de, ate: p.ate }, anterior: { de: ant.de, ate: ant.ate }, parcial };
  const corrido = dias(p.de, hojeIso);
  const ateAnt = somaDias(ant.de, corrido);
  return { atual: { de: p.de, ate: hojeIso }, anterior: { de: ant.de, ate: ateAnt < ant.ate ? ateAnt : ant.ate }, parcial };
}

/** Nome do período para o título: "Sex, 30/10/2026", "Semana de 26/10 a 01/11/2026", "Outubro 2026", "4º trimestre 2026", "2026". */
export function rotulo(p: Periodo): string {
  const d = deIso(p.de);
  if (p.escala === 'dia') return `${nomeDiaCurto(p.de)}, ${br(p.de)}`;
  if (p.escala === 'semana') return `Semana de ${brCurto(p.de)} a ${br(p.ate)}`;
  if (p.escala === 'mes') return `${MESES[d.getMonth()]} ${d.getFullYear()}`;
  if (p.escala === 'trimestre') return `${Math.floor(d.getMonth() / 3) + 1}º trimestre ${d.getFullYear()}`;
  if (p.escala === 'ano') return String(d.getFullYear());
  return p.de === p.ate ? br(p.de) : `${br(p.de)} a ${br(p.ate)}`;
}

/** Rótulo curto de cada barra nos gráficos. */
export function rotuloCurto(p: Periodo): string {
  const d = deIso(p.de);
  if (p.escala === 'dia') return brCurto(p.de);
  if (p.escala === 'semana') return brCurto(p.de);
  if (p.escala === 'mes') return MESES_C[d.getMonth()];
  if (p.escala === 'trimestre') return `${Math.floor(d.getMonth() / 3) + 1}T${String(d.getFullYear()).slice(2)}`;
  if (p.escala === 'ano') return String(d.getFullYear());
  return brCurto(p.de);
}

/** Quantas barras o gráfico de evolução mostra para cada escala. */
const QTD: Record<Escala, number> = { dia: 7, semana: 6, mes: 6, trimestre: 4, ano: 3, personalizado: 6 };

/** Os últimos N períodos até o escolhido (para os gráficos de evolução). */
export function ultimos(p: Periodo): Periodo[] {
  const n = QTD[p.escala];
  return Array.from({ length: n }, (_, i) => mover(p, i - n + 1));
}

/** Nome da evolução no título do gráfico ("últimos 6 meses"). */
export function nomeEvolucao(p: Periodo): string {
  const n = QTD[p.escala];
  return { dia: `últimos ${n} dias`, semana: `últimas ${n} semanas`, mes: `últimos ${n} meses`, trimestre: `últimos ${n} trimestres`, ano: `últimos ${n} anos`, personalizado: `últimos ${n} períodos iguais` }[p.escala];
}

/** Período inicial: o mês de hoje. */
export const periodoPadrao = (hojeIso: string): Periodo => periodoDe('mes', hojeIso);
