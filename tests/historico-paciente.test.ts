// Histórico do paciente na ficha: exames pedidos x feitos e situação do retorno.
import { describe, expect, it } from 'vitest';
import { examesPedidos, situacaoRetorno } from '../src/regras/paciente';
import servicos from '../src/dados/servicos.json';
import type { Agendamento, Atendimento, Servico } from '../src/tipos/modelos';

const S = servicos as Servico[];
const ag = (id: string, servicoId: string, data: string, status: Agendamento['status']): Agendamento =>
  ({ id, pacienteId: 'p1', servicoId, data, hora: '09:00', duracaoMin: 30, status, criadoEm: data });
const at = (data: string, exames: string[], retornoDias?: number): Atendimento =>
  ({ id: 'at' + data, agendamentoId: 'x' + data, pacienteId: 'p1', data, queixa: '', conduta: '', examesSolicitados: exames, retornoDias });

describe('exames pedidos', () => {
  const base = (ags: Agendamento[]) => ({ servicos: S, atendimentos: [at('2026-10-01', ['Ecocardiograma', 'Holter 24h', 'Troponina'])], agendamentos: ags });
  it('feito, agendado, pendente e de fora da clínica', () => {
    const l = examesPedidos('p1', base([ag('a1', 'eco', '2026-10-05', 'atendido'), ag('a2', 'holter', '2026-12-01', 'agendado')]));
    expect(l.map((e) => [e.nome, e.situacao])).toEqual([['Ecocardiograma', 'feito'], ['Holter 24h', 'agendado'], ['Troponina', 'fora']]);
  });
  it('exame feito ANTES do pedido não conta', () => {
    expect(examesPedidos('p1', base([ag('a1', 'eco', '2026-09-01', 'atendido')]))[0].situacao).toBe('pendente');
  });
  it('falta ou cancelamento não contam como feito', () => {
    expect(examesPedidos('p1', base([ag('a1', 'eco', '2026-10-05', 'faltou')]))[0].situacao).toBe('pendente');
  });
});

describe('retorno', () => {
  it('retorno sem custo até 30 dias da última consulta atendida', () => {
    const b = { servicos: S, atendimentos: [at('2026-11-10', [], 60)], agendamentos: [ag('c1', 'consulta', '2026-11-10', 'atendido')] };
    const r = situacaoRetorno('p1', b, '2026-11-25');
    expect(r).toMatchObject({ gratisAte: '2026-12-10', dentroDoPrazo: true, indicado: '2027-01-09' });
    expect(situacaoRetorno('p1', b, '2026-12-11').dentroDoPrazo).toBe(false);
  });
  it('mostra o retorno já marcado', () => {
    const b = { servicos: S, atendimentos: [], agendamentos: [ag('c1', 'consulta', '2026-11-10', 'atendido'), ag('r1', 'retorno', '2026-12-01', 'confirmado')] };
    expect(situacaoRetorno('p1', b, '2026-11-25').marcado?.id).toBe('r1');
  });
});
