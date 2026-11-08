// Robô de atendimento pelo WhatsApp: o paciente manda mensagem e o robô responde com OPÇÕES para tocar
// (botões e listas, como na API oficial do WhatsApp). Agendar, remarcar/cancelar, falar com atendente e
// perguntas frequentes. Função pura: recebe o estado + o que o paciente mandou e devolve as respostas e os
// EFEITOS no sistema (agendar, cancelar, chamar atendente) — quem aplica é a tela. Testado em tests/robo.test.ts.
import type { Agendamento, BaseClinica, Paciente } from '../tipos/modelos';
import { horariosLivres, situacaoDia } from './disponibilidade';
import { br, brCurto, nomeDia, nomeDiaCurto, somaDias } from '../util/datas';
import { digitos, moeda, semAcento } from '../util/formato';

export interface Opcao { id: string; rotulo: string; desc?: string }
export interface MsgRobo { de: 'paciente' | 'robo'; texto: string; tipo?: 'botoes' | 'lista'; botaoLista?: string; opcoes?: Opcao[] }
export type Efeito =
  | { tipo: 'agendar'; servicoId: string; data: string; hora: string; pacienteId?: string; novo?: { nome: string; nascimento: string; telefone: string }; substitui?: string }
  | { tipo: 'cancelar'; agendamentoId: string }
  | { tipo: 'atendente'; motivo: string };

type Etapa = 'inicio' | 'menu' | 'servico' | 'dia' | 'hora' | 'nome' | 'nascimento' | 'confirmar' | 'meus' | 'acao_ag' | 'atendente';
export interface EstadoRobo {
  etapa: Etapa; telefone: string;
  servicoId?: string; data?: string; hora?: string; nome?: string; nascimento?: string;
  remarcarId?: string;   // remarcando este agendamento
  agId?: string;         // agendamento escolhido em "meus agendamentos"
}
type Base = Pick<BaseClinica, 'clinica' | 'servicos' | 'pacientes' | 'agendamentos' | 'feriados' | 'bloqueios'>;
interface Ctx { base: Base; hoje: string; agoraMin: number }

export const estadoInicial = (telefone: string): EstadoRobo => ({ etapa: 'inicio', telefone });

/** Paciente reconhecido pelo número do WhatsApp (sem o 55 e sem máscara). */
export const pacienteDoNumero = (b: Pick<BaseClinica, 'pacientes'>, tel: string): Paciente | undefined =>
  b.pacientes.find((p) => p.situacao !== 'removido' && digitos(p.telefone) && digitos(p.telefone) === digitos(tel));

const ATIVO: Agendamento['status'][] = ['agendado', 'confirmado'];
const primeiro = (nome: string) => nome.trim().split(/\s+/)[0];
const capital = (s: string) => s[0].toUpperCase() + s.slice(1);

function menu(c: Ctx, p?: Paciente): MsgRobo {
  return {
    de: 'robo', tipo: 'botoes',
    texto: `Olá${p ? `, ${primeiro(p.nome)}` : ''}! 👋 Aqui é o consultório da ${c.base.clinica.medica}.\nComo podemos ajudar?`,
    opcoes: [{ id: 'agendar', rotulo: '📅 Agendar' }, { id: 'meus', rotulo: '🔁 Remarcar ou cancelar' }, { id: 'atendente', rotulo: '💬 Falar com atendente' }],
  };
}

function listaServicos(c: Ctx): MsgRobo {
  return {
    de: 'robo', tipo: 'lista', botaoLista: 'Ver serviços', texto: 'Qual atendimento você precisa? 🩺',
    opcoes: c.base.servicos.filter((s) => s.valor > 0).map((s) => ({ id: s.id, rotulo: s.nome.slice(0, 24), desc: `${s.duracaoMin} min` })),
  };
}

/** Próximos dias (até 10, em 30 dias) que têm horário livre para o serviço. */
export function diasComVaga(c: Ctx, servicoId: string, ignorarId?: string): string[] {
  const s = c.base.servicos.find((x) => x.id === servicoId)!;
  const r: string[] = [];
  for (let i = 0; i < 30 && r.length < 10; i++) {
    const d = somaDias(c.hoje, i);
    if (!situacaoDia(d, c.base).aberto) continue;
    if (horariosLivres(d, s.duracaoMin, c.base, { agoraMin: i === 0 ? c.agoraMin : undefined, ignorarId }).length) r.push(d);
  }
  return r;
}

function listaDias(c: Ctx, e: EstadoRobo): MsgRobo {
  const dias = diasComVaga(c, e.servicoId!, e.remarcarId);
  if (!dias.length) return { de: 'robo', tipo: 'botoes', texto: 'Não encontramos horário livre nos próximos 30 dias. 😕', opcoes: [{ id: 'atendente', rotulo: '💬 Falar com atendente' }, { id: 'menu', rotulo: '↩️ Menu' }] };
  return {
    de: 'robo', tipo: 'lista', botaoLista: 'Ver dias', texto: 'Escolha o dia 📅',
    opcoes: dias.map((d) => ({ id: d, rotulo: `${capital(nomeDiaCurto(d))}, ${brCurto(d)}`, desc: d === c.hoje ? 'hoje' : d === somaDias(c.hoje, 1) ? 'amanhã' : undefined })),
  };
}

function listaHoras(c: Ctx, e: EstadoRobo): MsgRobo {
  const s = c.base.servicos.find((x) => x.id === e.servicoId)!;
  const h = horariosLivres(e.data!, s.duracaoMin, c.base, { agoraMin: e.data === c.hoje ? c.agoraMin : undefined, ignorarId: e.remarcarId }).slice(0, 9);
  return {
    de: 'robo', tipo: 'lista', botaoLista: 'Ver horários', texto: `Horários livres em ${capital(nomeDia(e.data!))}, ${br(e.data!)} ⏰`,
    opcoes: [...h.map((x) => ({ id: x, rotulo: x })), { id: 'outro_dia', rotulo: 'Ver outro dia' }],
  };
}

function resumo(c: Ctx, e: EstadoRobo, nome: string): MsgRobo {
  const s = c.base.servicos.find((x) => x.id === e.servicoId)!;
  return {
    de: 'robo', tipo: 'botoes',
    texto: `Confira, por favor:\n\n👤 ${nome}\n🩺 ${s.nome}\n📅 ${capital(nomeDia(e.data!))}, ${br(e.data!)}\n⏰ ${e.hora}\n💳 ${moeda(s.valor)} (particular)`,
    opcoes: [{ id: 'confirmar', rotulo: '✅ Confirmar' }, { id: 'mudar', rotulo: '✏️ Mudar' }],
  };
}

/** Perguntas que se repetem: responde e volta ao menu. */
function faq(c: Ctx, t: string): string | null {
  if (/unimed|convenio|plano de saude|plano|amil|bradesco|sulamerica|hapvida/.test(t)) return 'Atendemos somente particular. 😊 Emitimos recibo para reembolso do seu plano.';
  if (/endereco|onde fica|localiza|como chego/.test(t)) return `📍 ${c.base.clinica.endereco}`;
  if (/valor|preco|quanto custa|custa/.test(t)) return `Valores: ${c.base.servicos.filter((s) => s.valor > 0).map((s) => `${s.curto} ${moeda(s.valor)}`).join(' · ')}.`;
  if (/horario de atendimento|que horas abre|funciona|abre/.test(t)) return 'Atendemos de segunda a sexta, das 8h às 12h e das 13h às 18h, e aos sábados das 8h às 12h. ⏰';
  return null;
}

/**
 * O paciente mandou `entrada` (texto digitado, ou o id da opção tocada).
 * Devolve o novo estado, as mensagens do robô e os efeitos no sistema.
 */
export function responder(e: EstadoRobo, entrada: string, c: Ctx): { estado: EstadoRobo; msgs: MsgRobo[]; efeitos: Efeito[] } {
  const pac = pacienteDoNumero(c.base, e.telefone);
  const t = semAcento(entrada).trim();
  const ok = (estado: EstadoRobo, ...msgs: MsgRobo[]) => ({ estado, msgs, efeitos: [] as Efeito[] });
  const robo = (texto: string): MsgRobo => ({ de: 'robo', texto });

  // em atendimento humano: o robô fica quieto (a recepção responde no WhatsApp); "menu" volta ao robô
  if (e.etapa === 'atendente' && t !== 'menu') return ok(e);
  if (t === 'menu' || t === 'voltar') return ok({ ...estadoInicial(e.telefone), etapa: 'menu' }, menu(c, pac));

  if (e.etapa === 'inicio' || e.etapa === 'menu') {
    const r = faq(c, t);
    if (e.etapa === 'menu' && t === 'agendar') return ok({ ...e, etapa: 'servico' }, listaServicos(c));
    if (e.etapa === 'menu' && t === 'atendente') {
      return { estado: { ...e, etapa: 'atendente' }, msgs: [robo('Certo! 💬 Uma atendente vai responder por aqui em instantes.\n(Para voltar ao menu automático, envie "menu".)')], efeitos: [{ tipo: 'atendente', motivo: 'pediu para falar com atendente' }] };
    }
    if (e.etapa === 'menu' && t === 'meus') {
      const meus = pac ? c.base.agendamentos.filter((a) => a.pacienteId === pac.id && a.data >= c.hoje && ATIVO.includes(a.status)).sort((x, y) => (x.data + x.hora).localeCompare(y.data + y.hora)) : [];
      if (!meus.length) return ok({ ...e, etapa: 'menu' }, robo('Não encontramos agendamentos futuros para este número. 🤔'), menu(c, pac));
      return ok({ ...e, etapa: 'meus' }, {
        de: 'robo', tipo: 'lista', botaoLista: 'Ver agendamentos', texto: 'Qual agendamento?',
        opcoes: meus.slice(0, 10).map((a) => ({ id: a.id, rotulo: `${brCurto(a.data)} às ${a.hora}`, desc: c.base.servicos.find((s) => s.id === a.servicoId)?.nome })),
      });
    }
    return ok({ ...e, etapa: 'menu' }, ...(r ? [robo(r)] : []), menu(c, pac));
  }

  if (e.etapa === 'servico') {
    if (!c.base.servicos.some((s) => s.id === entrada && s.valor > 0)) return ok(e, robo('Toque em uma das opções da lista, por favor. 👇'), listaServicos(c));
    const n = { ...e, servicoId: entrada, etapa: 'dia' as const };
    return ok(n, listaDias(c, n));
  }
  if (e.etapa === 'dia') {
    if (!diasComVaga(c, e.servicoId!, e.remarcarId).includes(entrada)) return ok(e, robo('Escolha um dos dias da lista. 👇'), listaDias(c, e));
    const n = { ...e, data: entrada, etapa: 'hora' as const };
    return ok(n, listaHoras(c, n));
  }
  if (e.etapa === 'hora') {
    if (entrada === 'outro_dia') { const n = { ...e, etapa: 'dia' as const }; return ok(n, listaDias(c, n)); }
    const s = c.base.servicos.find((x) => x.id === e.servicoId)!;
    if (!horariosLivres(e.data!, s.duracaoMin, c.base, { ignorarId: e.remarcarId }).includes(entrada)) return ok(e, robo('Esse horário não está mais livre. Escolha outro: 👇'), listaHoras(c, e));
    const n = { ...e, hora: entrada };
    if (pac || e.remarcarId) return ok({ ...n, etapa: 'confirmar' }, resumo(c, n, pac?.nome ?? ''));
    return ok({ ...n, etapa: 'nome' }, robo('Para finalizar, qual é o seu nome completo? ✍️'));
  }
  if (e.etapa === 'nome') {
    if (entrada.trim().split(/\s+/).length < 2) return ok(e, robo('Por favor, envie nome e sobrenome. ✍️'));
    return ok({ ...e, nome: entrada.trim(), etapa: 'nascimento' }, robo('E a sua data de nascimento? (ex.: 25/04/1970) 🎂'));
  }
  if (e.etapa === 'nascimento') {
    const m = entrada.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    const iso = m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : '';
    if (!m || iso > c.hoje || iso < '1900-01-01' || Number(m[2]) > 12 || Number(m[1]) > 31) return ok(e, robo('Não entendi a data. Envie no formato dia/mês/ano, ex.: 25/04/1970. 🎂'));
    const n = { ...e, nascimento: iso, etapa: 'confirmar' as const };
    return ok(n, resumo(c, n, e.nome!));
  }
  if (e.etapa === 'confirmar') {
    if (t === 'mudar') { const n = { ...e, etapa: 'servico' as const }; return ok(n, listaServicos(c)); }
    if (t !== 'confirmar') return ok(e, robo('Toque em ✅ Confirmar ou ✏️ Mudar. 👇'), resumo(c, e, pac?.nome ?? e.nome ?? ''));
    const s = c.base.servicos.find((x) => x.id === e.servicoId)!;
    const efeito: Efeito = { tipo: 'agendar', servicoId: e.servicoId!, data: e.data!, hora: e.hora!, ...(pac ? { pacienteId: pac.id } : { novo: { nome: e.nome!, nascimento: e.nascimento!, telefone: e.telefone } }), ...(e.remarcarId ? { substitui: e.remarcarId } : {}) };
    const nome = pac?.nome ?? e.nome!;
    return {
      estado: { ...estadoInicial(e.telefone), etapa: 'menu' },
      msgs: [robo(`Pronto, ${primeiro(nome)}! ✅ ${e.remarcarId ? 'Remarcado' : 'Agendado'}:\n\n🩺 ${s.nome}\n📅 ${capital(nomeDia(e.data!))}, ${br(e.data!)} às ⏰ ${e.hora}\n📍 ${c.base.clinica.endereco}${s.preparo ? `\n\n📋 Preparo: ${s.preparo}` : ''}\n\nNa véspera enviaremos um lembrete. Até breve! 💙`)],
      efeitos: [efeito],
    };
  }
  if (e.etapa === 'meus') {
    const a = c.base.agendamentos.find((x) => x.id === entrada && pac && x.pacienteId === pac.id);
    if (!a) return ok(e, robo('Escolha um dos agendamentos da lista. 👇'));
    return ok({ ...e, agId: a.id, etapa: 'acao_ag' }, {
      de: 'robo', tipo: 'botoes', texto: `${brCurto(a.data)} às ${a.hora} · ${c.base.servicos.find((s) => s.id === a.servicoId)?.nome}\nO que deseja fazer?`,
      opcoes: [{ id: 'remarcar', rotulo: '🔁 Remarcar' }, { id: 'cancelar', rotulo: '❌ Cancelar' }, { id: 'menu', rotulo: '↩️ Menu' }],
    });
  }
  if (e.etapa === 'acao_ag') {
    const a = c.base.agendamentos.find((x) => x.id === e.agId)!;
    if (t === 'cancelar') {
      return { estado: { ...estadoInicial(e.telefone), etapa: 'menu' }, msgs: [robo(`Agendamento de ${brCurto(a.data)} às ${a.hora} cancelado. ❌\nQuando quiser, é só chamar para marcar de novo. 💙`)], efeitos: [{ tipo: 'cancelar', agendamentoId: a.id }] };
    }
    if (t === 'remarcar') { const n: EstadoRobo = { ...e, servicoId: a.servicoId, remarcarId: a.id, etapa: 'dia' }; return ok(n, listaDias(c, n)); }
    return ok(e, robo('Toque em uma das opções. 👇'));
  }
  return ok({ ...e, etapa: 'menu' }, menu(c, pac));
}
