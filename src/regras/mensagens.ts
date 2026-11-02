// Mensagens de WhatsApp para o paciente: confirmação do agendamento e lembrete da véspera.
// Pedem a confirmação com 1️⃣ / 2️⃣. No sistema final saem pela API oficial do WhatsApp Business (modelos aprovados
// pela Meta) e a resposta muda o status sozinha; no mock, a recepção envia pelo WhatsApp ou a demonstração simula.
import type { Agendamento, Clinica, Paciente, Servico } from '../tipos/modelos';
import { br, brCurto, nomeDia } from '../util/datas';

const primeiroNome = (p: Pick<Paciente, 'nome'>) => p.nome.trim().split(/\s+/)[0];
const diaSemana = (data: string) => { const d = nomeDia(data); return d[0].toUpperCase() + d.slice(1) + (d === 'sábado' || d === 'domingo' ? '' : '-feira'); };
const icone = (s: Servico) => (s.tipo === 'exame' ? '🫀' : '🩺');

export function msgAgendamento(c: Clinica, p: Pick<Paciente, 'nome'>, s: Servico, a: Pick<Agendamento, 'data' | 'hora'>): string {
  return [
    `Olá, ${primeiroNome(p)}! 👋`,
    '',
    `Seu agendamento na clínica da ${c.medica} está marcado ✅`,
    '',
    `${icone(s)} ${s.nome}`,
    `📅 ${diaSemana(a.data)}, ${br(a.data)}`,
    `⏰ ${a.hora}`,
    `📍 ${c.endereco}`,
    ...(s.preparo ? ['', `📋 Preparo: ${s.preparo}`] : []),
    '',
    'Por favor, confirme sua presença respondendo:',
    '1️⃣ Confirmo',
    '2️⃣ Preciso remarcar',
    '',
    'Qualquer dúvida, é só chamar por aqui. Até breve! 💙',
  ].join('\n');
}

export function msgLembrete(c: Clinica, p: Pick<Paciente, 'nome'>, s: Servico, a: Pick<Agendamento, 'data' | 'hora'>): string {
  return [
    `Olá, ${primeiroNome(p)}! 😊`,
    '',
    `Passando para lembrar do seu atendimento com a ${c.medica}:`,
    '',
    `📅 ${diaSemana(a.data)}, ${brCurto(a.data)} às ⏰ ${a.hora}`,
    `${icone(s)} ${s.nome}`,
    ...(s.preparo ? [`📋 Preparo: ${s.preparo}`] : []),
    '',
    'Você confirma sua presença?',
    '1️⃣ Sim, confirmo',
    '2️⃣ Preciso remarcar',
    '',
    'Obrigada! 💙',
  ].join('\n');
}

/** Mensagem para quem pediu para remarcar. */
export const msgRemarcar = (c: Clinica, p: Pick<Paciente, 'nome'>) =>
  `Olá, ${primeiroNome(p)}! 😊 Recebemos seu pedido para remarcar 📅\n\nQual dia e horário ficam melhor para você? Vamos encontrar um novo horário na agenda da ${c.medica}. 💙`;

/**
 * Resposta simulada na demonstração (sempre a mesma para o mesmo agendamento).
 * Lembrete da véspera: ~70% confirma, ~15% pede para remarcar, ~15% não responde.
 * Confirmação de agendamento novo (`sempre`): sempre responde (~80% confirma), para a apresentação mostrar o fluxo.
 */
export function respostaSimulada(id: string, sempre = false): 'confirmou' | 'remarcar' | null {
  // FNV-1a + mistura final: espalha bem até ids parecidos (a101, a102…)
  let h = 0x811c9dc5;
  for (const ch of id + (sempre ? ':c' : ':l')) { h ^= ch.charCodeAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
  h ^= h >>> 16; h = Math.imul(h, 0x45d9f3b) >>> 0; h ^= h >>> 16;
  const n = h % 100;
  if (sempre) return n < 80 ? 'confirmou' : 'remarcar';
  return n < 70 ? 'confirmou' : n < 85 ? 'remarcar' : null;
}
