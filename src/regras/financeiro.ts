// Regras financeiras e de indicadores: resumo do mês, séries para o Painel (BI), relatórios e CSV.
// Funções puras (sem tela), testadas em tests/financeiro.test.ts.
// Receita = pagamentos recebidos (data do pagamento). Despesa = despesas pelo vencimento (competência do mês).
import type { BaseClinica, FormaPagamento } from '../tipos/modelos';
import { diaSemana, iso, min, somaDias } from '../util/datas';
import { faixasDoDia, ocupaHorario } from './disponibilidade';

type Base = Pick<BaseClinica, 'agendamentos' | 'despesas' | 'servicos' | 'pacientes'>;
type BaseAgenda = Pick<BaseClinica, 'agendamentos' | 'clinica' | 'feriados' | 'bloqueios'>;

const p2 = (n: number) => String(n).padStart(2, '0');
/** '2026-10-21' → '2026-10' */
export const mesDe = (data: string) => data.slice(0, 7);
/** Soma n meses a 'YYYY-MM'. */
export const somaMes = (mes: string, n: number) => { const [a, m] = mes.split('-').map(Number); const d = new Date(a, m - 1 + n, 1); return `${d.getFullYear()}-${p2(d.getMonth() + 1)}`; };
/** Último dia do mês 'YYYY-MM' → 'YYYY-MM-DD'. */
export const fimDoMes = (mes: string) => { const [a, m] = mes.split('-').map(Number); return iso(new Date(a, m, 0)); };
const NOMES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const NOMES_LONGOS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export const nomeMesCurto = (mes: string) => NOMES[Number(mes.slice(5, 7)) - 1];
export const nomeMesLongo = (mes: string) => `${NOMES_LONGOS[Number(mes.slice(5, 7)) - 1]} de ${mes.slice(0, 4)}`;

/** Todos os pagamentos recebidos (cada agendamento pago vira uma entrada no caixa). */
export function recebimentos(b: Pick<BaseClinica, 'agendamentos'>, de: string, ate: string) {
  return b.agendamentos
    .filter((a) => a.pagamento?.status === 'pago' && a.pagamento.valor > 0)
    .map((a) => ({ ag: a, data: a.pagamento!.pagoEm ?? a.data, valor: a.pagamento!.valor, forma: a.pagamento!.forma as FormaPagamento }))
    .filter((r) => r.data >= de && r.data <= ate)
    .sort((x, y) => x.data.localeCompare(y.data) || min(x.ag.hora) - min(y.ag.hora));
}

const soma = (l: { valor: number }[]) => +l.reduce((t, x) => t + x.valor, 0).toFixed(2);

/** Indicadores de um período [de, ate]. */
export function resumoPeriodo(b: Base, de: string, ate: string) {
  const rec = recebimentos(b, de, ate);
  const desp = b.despesas.filter((d) => d.data >= de && d.data <= ate);
  const ags = b.agendamentos.filter((a) => a.data >= de && a.data <= ate && a.status !== 'cancelado');
  const atendidos = ags.filter((a) => a.status === 'atendido').length;
  const faltas = ags.filter((a) => a.status === 'faltou').length;
  const recebido = soma(rec);
  const despesas = soma(desp);
  return {
    recebido,
    despesas,
    despesasPagas: soma(desp.filter((d) => d.status === 'paga')),
    aPagar: soma(desp.filter((d) => d.status === 'a_pagar')),
    lucro: +(recebido - despesas).toFixed(2),
    aReceber: soma(ags.filter((a) => a.pagamento?.status === 'pendente' && ['chegou', 'em_atendimento', 'atendido'].includes(a.status)).map((a) => ({ valor: a.pagamento!.valor }))),
    agendamentos: ags.length,
    atendidos,
    faltas,
    taxaFaltas: atendidos + faltas ? +((faltas / (atendidos + faltas)) * 100).toFixed(1) : 0,
    ticketMedio: rec.length ? +(recebido / rec.length).toFixed(2) : 0,
  };
}

/** Resumo do mês. Se for o mês corrente, considera até `hoje` (e o comparativo usa o mesmo período do mês anterior). */
export function resumoMes(b: Base, mes: string, hojeIso: string) {
  const parcial = mesDe(hojeIso) === mes;
  const ate = parcial ? hojeIso : fimDoMes(mes);
  const mesAnt = somaMes(mes, -1);
  const diaLimite = Math.min(Number(ate.slice(8, 10)), Number(fimDoMes(mesAnt).slice(8, 10)));
  const ateAnt = parcial ? `${mesAnt}-${p2(diaLimite)}` : fimDoMes(mesAnt);
  return { atual: resumoPeriodo(b, `${mes}-01`, ate), anterior: resumoPeriodo(b, `${mesAnt}-01`, ateAnt), parcial, ate };
}

/** Variação percentual (null quando não há base de comparação). */
export const variacao = (atual: number, anterior: number): number | null => (anterior ? +(((atual - anterior) / Math.abs(anterior)) * 100).toFixed(1) : null);

/** Série mensal para o Painel: receita, despesa, agendamentos e atendidos dos últimos `n` meses até `mes`. */
export function serieMensal(b: Base, mes: string, n: number, hojeIso: string) {
  return Array.from({ length: n }, (_, i) => somaMes(mes, i - n + 1)).map((m) => {
    const ate = mesDe(hojeIso) === m ? hojeIso : fimDoMes(m);
    const r = resumoPeriodo(b, `${m}-01`, ate);
    // agendamentos do mês inteiro (inclusive os futuros já marcados)
    const agendados = b.agendamentos.filter((a) => mesDe(a.data) === m && a.status !== 'cancelado').length;
    return { mes: m, receita: r.recebido, despesa: r.despesas, agendados, atendidos: r.atendidos };
  });
}

/** Receita por serviço no período, do maior para o menor. */
export function receitaPorServico(b: Base, de: string, ate: string) {
  const mapa = new Map<string, number>();
  for (const r of recebimentos(b, de, ate)) mapa.set(r.ag.servicoId, (mapa.get(r.ag.servicoId) ?? 0) + r.valor);
  return [...mapa.entries()].map(([id, valor]) => ({ nome: b.servicos.find((s) => s.id === id)?.nome ?? id, valor: +valor.toFixed(2) })).sort((x, y) => y.valor - x.valor);
}

/** Recebido por forma de pagamento no período. */
export function porForma(b: Pick<BaseClinica, 'agendamentos'>, de: string, ate: string): Record<FormaPagamento, number> {
  const t: Record<FormaPagamento, number> = { pix: 0, cartao_credito: 0, cartao_debito: 0, dinheiro: 0 };
  for (const r of recebimentos(b, de, ate)) t[r.forma] = +(t[r.forma] + r.valor).toFixed(2);
  return t;
}

/** Ocupação da agenda por dia da semana (seg–sáb): % do tempo de atendimento ocupado no período. */
export function ocupacaoSemana(b: BaseAgenda, de: string, ate: string) {
  const disp = [0, 0, 0, 0, 0, 0, 0], ocup = [0, 0, 0, 0, 0, 0, 0];
  for (let d = de; d <= ate; d = somaDias(d, 1)) {
    const w = diaSemana(d);
    for (const f of faixasDoDia(d, b)) disp[w] += f.fim - f.inicio;
    for (const a of b.agendamentos) if (a.data === d && ocupaHorario(a)) ocup[w] += a.duracaoMin;
  }
  return [1, 2, 3, 4, 5, 6].map((w) => ({ dia: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][w], pct: disp[w] ? Math.round((ocup[w] / disp[w]) * 100) : 0 }));
}

// ---------------------------------------------------------------- relatórios
export type TipoRelatorio = 'atendimentos' | 'receitas' | 'despesas' | 'fluxo' | 'pacientes';
export interface Coluna { titulo: string; num?: boolean }
export interface Relatorio { titulo: string; colunas: Coluna[]; linhas: (string | number)[][]; total?: (string | number)[] }

export function montarRelatorio(tipo: TipoRelatorio, b: Base, de: string, ate: string): Relatorio {
  const nomeP = (id: string) => b.pacientes.find((p) => p.id === id)?.nome ?? '';
  const nomeS = (id: string) => b.servicos.find((s) => s.id === id)?.nome ?? id;
  const FORMA: Record<string, string> = { pix: 'PIX', dinheiro: 'Dinheiro', cartao_credito: 'Cartão de crédito', cartao_debito: 'Cartão de débito' };
  const STATUS: Record<string, string> = { agendado: 'Agendado', confirmado: 'Confirmado', chegou: 'Na recepção', em_atendimento: 'Em atendimento', atendido: 'Atendido', faltou: 'Faltou', cancelado: 'Cancelado' };
  if (tipo === 'atendimentos') {
    const l = b.agendamentos.filter((a) => a.data >= de && a.data <= ate).sort((x, y) => x.data.localeCompare(y.data) || min(x.hora) - min(y.hora));
    return { titulo: 'Atendimentos', colunas: [{ titulo: 'Data' }, { titulo: 'Hora' }, { titulo: 'Paciente' }, { titulo: 'Serviço' }, { titulo: 'Situação' }],
      linhas: l.map((a) => [a.data, a.hora, nomeP(a.pacienteId), nomeS(a.servicoId), STATUS[a.status]]),
      total: [`${l.filter((a) => a.status === 'atendido').length} atendidos`, '', `${l.length} agendamentos`, '', `${l.filter((a) => a.status === 'faltou').length} faltas`] };
  }
  if (tipo === 'receitas') {
    const l = recebimentos(b, de, ate);
    return { titulo: 'Receitas recebidas', colunas: [{ titulo: 'Data' }, { titulo: 'Paciente' }, { titulo: 'Serviço' }, { titulo: 'Forma' }, { titulo: 'Valor', num: true }],
      linhas: l.map((r) => [r.data, nomeP(r.ag.pacienteId), nomeS(r.ag.servicoId), FORMA[r.forma] ?? r.forma, r.valor]), total: ['Total', '', '', `${l.length} pagamentos`, soma(l)] };
  }
  if (tipo === 'despesas') {
    const l = b.despesas.filter((d) => d.data >= de && d.data <= ate);
    return { titulo: 'Despesas', colunas: [{ titulo: 'Vencimento' }, { titulo: 'Descrição' }, { titulo: 'Categoria' }, { titulo: 'Situação' }, { titulo: 'Valor', num: true }],
      linhas: l.map((d) => [d.data, d.descricao, d.categoria, d.status === 'paga' ? 'Paga' : 'A pagar', d.valor]), total: ['Total', '', '', `${l.length} lançamentos`, soma(l)] };
  }
  if (tipo === 'fluxo') {
    const linhas: (string | number)[][] = [];
    let acum = 0, te = 0, ts = 0;
    for (let d = de; d <= ate; d = somaDias(d, 1)) {
      const e = soma(recebimentos(b, d, d));
      const s = soma(b.despesas.filter((x) => x.data === d));
      if (!e && !s) continue;
      acum = +(acum + e - s).toFixed(2); te += e; ts += s;
      linhas.push([d, e, s, +(e - s).toFixed(2), acum]);
    }
    return { titulo: 'Fluxo de caixa', colunas: [{ titulo: 'Data' }, { titulo: 'Entradas', num: true }, { titulo: 'Saídas', num: true }, { titulo: 'Saldo do dia', num: true }, { titulo: 'Acumulado', num: true }],
      linhas, total: ['Total', +te.toFixed(2), +ts.toFixed(2), +(te - ts).toFixed(2), acum] };
  }
  const l = b.pacientes.filter((p) => !p.situacao && p.criadoEm >= de && p.criadoEm <= ate).sort((x, y) => x.criadoEm.localeCompare(y.criadoEm));
  return { titulo: 'Pacientes novos', colunas: [{ titulo: 'Cadastro' }, { titulo: 'Paciente' }, { titulo: 'Celular' }, { titulo: 'Bairro' }, { titulo: 'Termo LGPD' }],
    linhas: l.map((p) => [p.criadoEm, p.nome, p.telefone, p.endereco?.bairro ?? '', p.consentimentoLgpd ? 'Aceito' : 'Pendente']), total: [`${l.length} pacientes`, '', '', '', ''] };
}

const ehData = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
/** Valor de célula para tela/impressão: data em dd/mm/aaaa e número em moeda. */
export function celula(v: string | number, num?: boolean, moeda?: (n: number) => string): string {
  if (typeof v === 'number') return num && moeda ? moeda(v) : String(v);
  return ehData(v) ? v.split('-').reverse().join('/') : v;
}

/** CSV para Excel em português: separador ";", vírgula decimal e BOM (acentos corretos). */
export function paraCsv(r: Relatorio): string {
  const esc = (v: string | number) => {
    const t = typeof v === 'number' ? v.toFixed(2).replace('.', ',') : ehData(v) ? v.split('-').reverse().join('/') : v;
    return /[;"\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  const linhas = [r.colunas.map((c) => c.titulo), ...r.linhas, ...(r.total ? [r.total] : [])];
  return '﻿' + linhas.map((l) => l.map(esc).join(';')).join('\r\n');
}

/** Primeiro e último dia de um mês relativo a hoje (0 = este mês, -1 = mês passado). */
export function periodoMes(hojeIso: string, rel: number): { de: string; ate: string } {
  const m = somaMes(mesDe(hojeIso), rel);
  return { de: `${m}-01`, ate: rel === 0 ? hojeIso : fimDoMes(m) };
}
export const diasAtras = (hojeIso: string, n: number) => ({ de: somaDias(hojeIso, -n), ate: hojeIso });

/**
 * Evolução para os gráficos do Painel: receita, custo, agendamentos e atendidos de cada período da lista.
 * Mesma conta do Financeiro e dos Relatórios (receita pela data do pagamento, custo pelo vencimento).
 */
export function serieEvolucao(b: Base, periodos: { de: string; ate: string; rotulo: string }[]) {
  return periodos.map((p) => {
    const r = resumoPeriodo(b, p.de, p.ate);
    return { ...p, receita: r.recebido, despesa: r.despesas, agendados: r.agendamentos, atendidos: r.atendidos };
  });
}
