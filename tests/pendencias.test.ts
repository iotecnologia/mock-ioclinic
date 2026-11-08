// Sino de notificações: o que entra na lista de pendências e para quem.
import { describe, expect, it } from 'vitest';
import { pendencias } from '../src/regras/pendencias';
import { gerarBase } from '../src/repositorio/gerador';
import type { Agendamento, BaseClinica, Despesa, Paciente } from '../src/tipos/modelos';

const HJ = '2026-11-10';   // terça (dia de atendimento)
const ag = (id: string, pacienteId: string, data: string, hora: string, status: Agendamento['status'], extra: Partial<Agendamento> = {}): Agendamento =>
  ({ id, pacienteId, servicoId: 'consulta', data, hora, duracaoMin: 60, status, criadoEm: data, pagamento: { status: 'pendente', valor: 600 }, ...extra });
const pac = (id: string, situacao?: Paciente['situacao']): Paciente =>
  ({ id, nome: 'Paciente ' + id, cpf: '', nascimento: '1970-05-10', sexo: 'O', telefone: '(19) 99999-0000', consentimentoLgpd: true, criadoEm: '2026-10-01', situacao });
const desp = (id: string, data: string, status: Despesa['status'] = 'a_pagar'): Despesa => ({ id, data, descricao: 'Conta ' + id, categoria: 'Aluguel', valor: 100, status });

function base(agendamentos: Agendamento[], pacientes: Paciente[], despesas: Despesa[] = []): BaseClinica {
  const b = gerarBase(HJ, 8 * 60);
  return { ...b, agendamentos, pacientes, despesas, bloqueios: [], feriados: [] };
}

describe('pendências do sino', () => {
  it('paciente que chegou aparece como aguardando na recepção (urgente)', () => {
    const l = pendencias(base([ag('1', 'a', HJ, '09:00', 'chegou')], [pac('a')]), HJ, 8 * 60, 'recepcao');
    expect(l.find((p) => p.tipo === 'recepcao')).toMatchObject({ agId: '1', urgente: true });
  });
  it('quem chegou e não pagou entra em "a receber"; quem pagou não', () => {
    const l = pendencias(base([ag('1', 'a', HJ, '09:00', 'atendido'), ag('2', 'b', HJ, '10:00', 'atendido', { pagamento: { status: 'pago', valor: 600, forma: 'pix' } })], [pac('a'), pac('b')]), HJ, 12 * 60, 'recepcao');
    expect(l.filter((p) => p.tipo === 'receber').map((p) => p.agId)).toEqual(['1']);
  });
  it('pedido de remarcar pelo WhatsApp ainda não tratado', () => {
    const l = pendencias(base([ag('1', 'a', '2026-11-11', '09:00', 'agendado', { whats: { modo: 'auto', resposta: 'remarcar' } })], [pac('a')]), HJ, 8 * 60, 'recepcao');
    expect(l.some((p) => p.tipo === 'remarcar' && p.agId === '1')).toBe(true);
  });
  it('próximo dia: antes da hora do lembrete pede confirmação; depois, pede para enviar os lembretes', () => {
    const b = base([ag('1', 'a', '2026-11-11', '09:00', 'agendado')], [pac('a')]);
    expect(pendencias(b, HJ, 8 * 60, 'recepcao').find((p) => p.tipo === 'lembretes')?.titulo).toMatch(/^Confirmar/);
    expect(pendencias(b, HJ, 11 * 60, 'recepcao').find((p) => p.tipo === 'lembretes')?.titulo).toMatch(/^Enviar lembretes/);
  });
  it('pré-cadastro com horário hoje: completar o cadastro na chegada', () => {
    const l = pendencias(base([ag('1', 'a', HJ, '14:00', 'confirmado')], [pac('a', 'pre')]), HJ, 8 * 60, 'recepcao');
    expect(l.some((p) => p.tipo === 'precadastro')).toBe(true);
  });
  it('despesas vencidas só aparecem para a médica', () => {
    const b = base([], [], [desp('d1', '2026-11-05'), desp('d2', HJ), desp('d3', '2026-11-20'), desp('d4', '2026-11-01', 'paga')]);
    expect(pendencias(b, HJ, 8 * 60, 'medica').filter((p) => p.tipo === 'despesa').map((p) => p.despesaId)).toEqual(['d1', 'd2']);
    expect(pendencias(b, HJ, 8 * 60, 'recepcao').some((p) => p.tipo === 'despesa')).toBe(false);
  });
  it('sem nada pendente, lista vazia', () => expect(pendencias(base([], []), HJ, 8 * 60, 'medica')).toEqual([]));
});
