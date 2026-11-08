// Pendências do sistema (sino do topo): tudo que alguém precisa fazer agora, em um só lugar.
// Regra pura (sem tela): recebe a base e devolve a lista. A tela só mostra e abre o detalhe na mesma tela.
import type { BaseClinica, Perfil } from '../tipos/modelos';
import { aConfirmar, doDia, lembretesPendentes, proximoDiaAberto } from './agenda';
import { somaDias } from '../util/datas';

export type TipoPend = 'lembretes' | 'remarcar' | 'recepcao' | 'precadastro' | 'receber' | 'despesa';
export interface Pendencia {
  id: string;
  tipo: TipoPend;
  titulo: string;
  detalhe: string;
  /** agendamento a abrir (detalhe na mesma tela) */
  agId?: string;
  /** despesa a abrir */
  despesaId?: string;
  /** dia dos lembretes (abre a lista de lembretes) */
  dia?: string;
  urgente?: boolean;
  /** quantas tarefas o item representa (ex.: lembretes de 7 pacientes = 7). Padrão 1. */
  qtd?: number;
}

/** Ordem em que os grupos aparecem no sino (o mais urgente primeiro). */
export const GRUPOS_PEND: { tipo: TipoPend; nome: string }[] = [
  { tipo: 'recepcao', nome: 'Aguardando na recepção' },
  { tipo: 'remarcar', nome: 'Pediram para remarcar' },
  { tipo: 'lembretes', nome: 'Lembretes e confirmações' },
  { tipo: 'precadastro', nome: 'Completar cadastro na chegada' },
  { tipo: 'receber', nome: 'A receber hoje' },
  { tipo: 'despesa', nome: 'Despesas vencidas ou vencendo hoje' },
];

const br = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

export function pendencias(base: BaseClinica, hj: string, agora: number, perfil: Perfil, whatsAuto = false): Pendencia[] {
  const out: Pendencia[] = [];
  const pac = (id: string) => base.pacientes.find((p) => p.id === id);
  const serv = (id: string) => base.servicos.find((s) => s.id === id);
  const hojeL = doDia(base, hj);

  // 1. quem já chegou e está esperando
  for (const a of hojeL.filter((x) => x.status === 'chegou'))
    out.push({ id: 'rc:' + a.id, tipo: 'recepcao', titulo: pac(a.pacienteId)?.nome ?? '', detalhe: `${a.hora} · ${serv(a.servicoId)?.curto ?? ''}`, agId: a.id, urgente: true });

  // 2. pedidos de remarcação pelo WhatsApp ainda não tratados
  base.agendamentos
    .filter((a) => a.whats?.resposta === 'remarcar' && !a.whats.resolvido && a.data >= hj && ['agendado', 'confirmado'].includes(a.status))
    .sort((x, y) => x.data.localeCompare(y.data) || x.hora.localeCompare(y.hora))
    .forEach((a) => out.push({ id: 'rm:' + a.id, tipo: 'remarcar', titulo: pac(a.pacienteId)?.nome ?? '', detalhe: `${a.data === hj ? 'hoje' : br(a.data)} ${a.hora} · ${serv(a.servicoId)?.curto ?? ''}`, agId: a.id, urgente: true }));

  // 3. lembretes do próximo dia de atendimento (hora do lembrete) ou quem ainda não confirmou
  const dia = proximoDiaAberto(base, hj);
  if (dia) {
    const lemb = lembretesPendentes(base, hj, agora);
    const semConfirmar = aConfirmar(base, dia).filter((a) => a.whats?.resposta !== 'remarcar');
    const quando = dia === somaDias(hj, 1) ? 'amanhã' : br(dia);
    if (!whatsAuto && lemb.hora && lemb.lista.length)
      out.push({ id: 'lb:' + dia, tipo: 'lembretes', titulo: `Enviar lembretes de ${quando} pelo WhatsApp`, detalhe: `${lemb.lista.length} paciente${lemb.lista.length > 1 ? 's' : ''}`, dia, urgente: true, qtd: lemb.lista.length });
    else if (semConfirmar.length)
      out.push({ id: 'cf:' + dia, tipo: 'lembretes', titulo: `Confirmar ${quando}`, detalhe: `${semConfirmar.length} paciente${semConfirmar.length > 1 ? 's' : ''} sem confirmação`, dia, qtd: semConfirmar.length });
  }

  // 4. pré-cadastro com horário hoje: completar o cadastro quando o paciente chegar
  for (const a of hojeL.filter((x) => ['agendado', 'confirmado'].includes(x.status) && pac(x.pacienteId)?.situacao === 'pre'))
    out.push({ id: 'pc:' + a.id, tipo: 'precadastro', titulo: pac(a.pacienteId)?.nome ?? '', detalhe: `${a.hora} · ${serv(a.servicoId)?.curto ?? ''} · pré-cadastro`, agId: a.id });

  // 5. quem já chegou/foi atendido e ainda não pagou
  for (const a of hojeL.filter((x) => x.pagamento?.status === 'pendente' && ['chegou', 'em_atendimento', 'atendido'].includes(x.status)))
    out.push({ id: 'rb:' + a.id, tipo: 'receber', titulo: pac(a.pacienteId)?.nome ?? '', detalhe: `${a.hora} · ${serv(a.servicoId)?.curto ?? ''}`, agId: a.id });

  // 6. despesas (só a médica vê o financeiro)
  if (perfil === 'medica')
    base.despesas.filter((d) => d.status === 'a_pagar' && d.data <= hj).sort((x, y) => x.data.localeCompare(y.data))
      .forEach((d) => out.push({ id: 'dp:' + d.id, tipo: 'despesa', titulo: d.descricao, detalhe: d.data < hj ? `venceu ${br(d.data)}` : 'vence hoje', despesaId: d.id, urgente: d.data < hj }));

  return out;
}

/** Total do número do sino (soma as quantidades). */
export const totalPendencias = (l: Pendencia[]) => l.reduce((t, p) => t + (p.qtd ?? 1), 0);
