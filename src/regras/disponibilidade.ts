// Disponibilidade da agenda: dias de atendimento, feriados, bloqueios e horários livres.
// Funções puras (sem tela): recebem a base e devolvem resultado. Testadas em tests/disponibilidade.test.ts.
import type { Agendamento, BaseClinica } from '../tipos/modelos';
import { diaSemana, hhmm, min } from '../util/datas';

export type BaseAgenda = Pick<BaseClinica, 'clinica' | 'agendamentos' | 'feriados' | 'bloqueios'>;
export interface Faixa { inicio: number; fim: number }

/** Agendamento que ocupa horário (cancelado libera o horário). */
export const ocupaHorario = (a: Agendamento) => a.status !== 'cancelado';

/** O dia abre? Se não, diz o motivo (domingo, feriado, bloqueio). */
export function situacaoDia(data: string, b: BaseAgenda): { aberto: boolean; motivo?: string } {
  const fer = b.feriados.find((f) => f.data === data);
  if (fer) return { aberto: false, motivo: `Feriado · ${fer.nome}` };
  const blq = b.bloqueios.find((x) => x.data === data);
  if (blq) return { aberto: false, motivo: `Agenda bloqueada · ${blq.motivo}` };
  const faixas = b.clinica.horarios[String(diaSemana(data))] ?? [];
  if (!faixas.length) return { aberto: false, motivo: 'Clínica fechada' };
  return { aberto: true };
}

/** Faixas de atendimento do dia em minutos (vazio se o dia não abre). */
export function faixasDoDia(data: string, b: BaseAgenda): Faixa[] {
  if (!situacaoDia(data, b).aberto) return [];
  return (b.clinica.horarios[String(diaSemana(data))] ?? []).map((f) => ({ inicio: min(f.inicio), fim: min(f.fim) }));
}

const sobrepoe = (a1: number, a2: number, b1: number, b2: number) => a1 < b2 && b1 < a2;

/**
 * Horários de início livres para um serviço de `duracaoMin` minutos.
 * - o serviço inteiro precisa caber dentro de uma faixa (não atravessa o almoço);
 * - não pode sobrepor outro agendamento (cancelado não conta);
 * - se `agoraMin` vier (dia de hoje), só horários que ainda não passaram.
 */
export function horariosLivres(
  data: string, duracaoMin: number, b: BaseAgenda,
  opc: { agoraMin?: number; ignorarId?: string } = {},
): string[] {
  const ocupados = b.agendamentos
    .filter((a) => a.data === data && ocupaHorario(a) && a.id !== opc.ignorarId)
    .map((a) => [min(a.hora), min(a.hora) + a.duracaoMin] as const);
  const passo = b.clinica.gradeMin;
  const livres: string[] = [];
  for (const f of faixasDoDia(data, b)) {
    for (let t = f.inicio; t + duracaoMin <= f.fim; t += passo) {
      if (opc.agoraMin !== undefined && t <= opc.agoraMin) continue;
      if (ocupados.some(([i, fim]) => sobrepoe(t, t + duracaoMin, i, fim))) continue;
      livres.push(hhmm(t));
    }
  }
  return livres;
}

/** Quantos blocos da grade (30 min) estão livres no dia — usado nas bolinhas do calendário. */
export const blocosLivres = (data: string, b: BaseAgenda, agoraMin?: number) =>
  horariosLivres(data, b.clinica.gradeMin, b, { agoraMin }).length;

export type LinhaGrade =
  | { tipo: 'livre'; hora: string }
  | { tipo: 'ocupado'; hora: string; ag: Agendamento }
  | { tipo: 'intervalo'; hora: string; ate: string };

/** Grade do dia para a tela de agenda: livres, agendamentos e intervalo de almoço, em ordem. */
export function gradeDoDia(data: string, b: BaseAgenda): LinhaGrade[] {
  const faixas = faixasDoDia(data, b);
  const doDia = b.agendamentos.filter((a) => a.data === data && ocupaHorario(a)).sort((x, y) => min(x.hora) - min(y.hora));
  const linhas: LinhaGrade[] = [];
  faixas.forEach((f, i) => {
    if (i > 0) linhas.push({ tipo: 'intervalo', hora: hhmm(faixas[i - 1].fim), ate: hhmm(f.inicio) });
    let t = f.inicio;
    while (t < f.fim) {
      const ag = doDia.find((a) => min(a.hora) === t) ?? doDia.find((a) => min(a.hora) < t && min(a.hora) + a.duracaoMin > t);
      if (ag) {
        if (min(ag.hora) === t) linhas.push({ tipo: 'ocupado', hora: ag.hora, ag });
        t = Math.max(t + b.clinica.gradeMin, min(ag.hora) + ag.duracaoMin);
      } else {
        linhas.push({ tipo: 'livre', hora: hhmm(t) });
        t += b.clinica.gradeMin;
      }
    }
  });
  return linhas;
}
