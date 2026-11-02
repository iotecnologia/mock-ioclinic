// Regras da agenda do dia: status, ordem, contadores e próximo paciente.
import type { Agendamento, BaseClinica, StatusAgendamento } from '../tipos/modelos';
import { min, somaDias } from '../util/datas';
import { situacaoDia } from './disponibilidade';

export const STATUS: Record<StatusAgendamento, { nome: string; cls: string }> = {
  agendado: { nome: 'Agendado', cls: 't-in' },
  confirmado: { nome: 'Confirmado', cls: 't-ok' },
  chegou: { nome: 'Na recepção', cls: 't-at' },
  em_atendimento: { nome: 'Em atendimento', cls: 't-at2' },
  atendido: { nome: 'Atendido', cls: 't-fim' },
  faltou: { nome: 'Faltou', cls: 't-no' },
  cancelado: { nome: 'Cancelado', cls: 't-no' },
};

/** Próximos passos possíveis a partir de cada status (o que aparece como botão). */
export const PROXIMOS: Record<StatusAgendamento, StatusAgendamento[]> = {
  agendado: ['confirmado', 'chegou', 'faltou', 'cancelado'],
  confirmado: ['chegou', 'faltou', 'cancelado'],
  chegou: ['em_atendimento'],
  em_atendimento: ['atendido'],
  atendido: [],
  faltou: [],
  cancelado: [],
};

export const doDia = (b: Pick<BaseClinica, 'agendamentos'>, data: string, comCancelados = false) =>
  b.agendamentos
    .filter((a) => a.data === data && (comCancelados || a.status !== 'cancelado'))
    .sort((x, y) => min(x.hora) - min(y.hora));

export function contagem(lista: Agendamento[]) {
  const c = { total: 0, confirmados: 0, aguardando: 0, atendidos: 0, aReceber: 0, faltas: 0 };
  for (const a of lista) {
    if (a.status === 'cancelado') continue;
    c.total++;
    if (['confirmado', 'chegou', 'em_atendimento', 'atendido'].includes(a.status)) c.confirmados++;   // confirmou presença
    if (a.status === 'chegou') c.aguardando++;
    if (a.status === 'atendido') c.atendidos++;
    if (a.status === 'faltou') c.faltas++;
    if (a.pagamento?.status === 'pendente' && ['chegou', 'em_atendimento', 'atendido'].includes(a.status)) c.aReceber++;
  }
  return c;
}

/** Próximo paciente da médica: quem está em atendimento, senão o primeiro que já chegou, senão o próximo horário. */
export function proximoPaciente(lista: Agendamento[], agora: number): Agendamento | undefined {
  return lista.find((a) => a.status === 'em_atendimento')
    ?? lista.find((a) => a.status === 'chegou')
    ?? lista.find((a) => ['agendado', 'confirmado'].includes(a.status) && min(a.hora) + a.duracaoMin > agora);
}

/** Agendamentos de amanhã (ou do próximo dia útil) que ainda não foram confirmados. */
export const aConfirmar = (b: Pick<BaseClinica, 'agendamentos'>, data: string) =>
  doDia(b, data).filter((a) => a.status === 'agendado');

/** Próximo dia em que a clínica abre, depois de hoje (para o lembrete da véspera). */
export function proximoDiaAberto(b: Pick<BaseClinica, 'clinica' | 'agendamentos' | 'feriados' | 'bloqueios'>, hojeIso: string): string | undefined {
  for (let i = 1; i < 30; i++) { const d = somaDias(hojeIso, i); if (situacaoDia(d, b).aberto) return d; }
  return undefined;
}

/**
 * Lembretes que a recepção ainda precisa enviar pelo WhatsApp: agendados do próximo dia de atendimento
 * que não receberam lembrete e não pediram para remarcar. `hora` = já chegou a hora do lembrete (clinica.horaLembrete)?
 */
export function lembretesPendentes(b: Pick<BaseClinica, 'clinica' | 'agendamentos' | 'feriados' | 'bloqueios'>, hojeIso: string, agora: number) {
  const dia = proximoDiaAberto(b, hojeIso);
  const lista = dia ? aConfirmar(b, dia).filter((a) => !a.whats?.lembreteEm && a.whats?.resposta !== 'remarcar') : [];
  return { dia, lista, hora: agora >= min(b.clinica.horaLembrete ?? '10:00') };
}
