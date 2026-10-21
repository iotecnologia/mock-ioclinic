import { describe, expect, it } from 'vitest';
import { celula, fimDoMes, montarRelatorio, ocupacaoSemana, paraCsv, porForma, resumoMes, resumoPeriodo, serieMensal, somaMes, variacao } from '../src/regras/financeiro';
import { gerarBase } from '../src/repositorio/gerador';
import type { Agendamento, Despesa } from '../src/tipos/modelos';

const ag = (id: string, data: string, valor: number, status: Agendamento['status'] = 'atendido', pago = true, forma: 'pix' | 'cartao_credito' = 'pix'): Agendamento =>
  ({ id, pacienteId: 'p1', servicoId: 'consulta', data, hora: '09:00', duracaoMin: 60, status, criadoEm: data, pagamento: pago ? { status: 'pago', valor, forma, pagoEm: data } : { status: 'pendente', valor } });
const desp = (id: string, data: string, valor: number, status: Despesa['status'] = 'paga'): Despesa => ({ id, data, descricao: 'x', categoria: 'Outros', valor, status });
const b = {
  servicos: [{ id: 'consulta', nome: 'Consulta', curto: 'Consulta', tipo: 'consulta' as const, duracaoMin: 60, valor: 350 }],
  pacientes: [{ id: 'p1', nome: 'Ana', cpf: '', nascimento: '1960-01-01', sexo: 'F' as const, telefone: '', consentimentoLgpd: true, criadoEm: '2026-10-02' }],
  agendamentos: [ag('a1', '2026-10-01', 350), ag('a2', '2026-10-02', 332.5, 'atendido', true, 'cartao_credito'), ag('a3', '2026-10-03', 350, 'atendido', false), ag('a4', '2026-10-04', 0, 'faltou', false), ag('a5', '2026-09-10', 350)],
  despesas: [desp('d1', '2026-10-05', 4200), desp('d2', '2026-10-25', 500, 'a_pagar'), desp('d3', '2026-09-05', 4200)],
};

describe('financeiro', () => {
  it('meses', () => {
    expect(somaMes('2026-01', -1)).toBe('2025-12');
    expect(fimDoMes('2026-02')).toBe('2026-02-28');
  });
  it('resumo do período: recebido, despesas, lucro, a receber, faltas', () => {
    const r = resumoPeriodo(b, '2026-10-01', '2026-10-31');
    expect(r.recebido).toBe(682.5);
    expect(r.despesas).toBe(4700);
    expect(r.despesasPagas).toBe(4200);
    expect(r.aPagar).toBe(500);
    expect(r.lucro).toBe(-4017.5);
    expect(r.aReceber).toBe(350);
    expect(r.atendidos).toBe(3);
    expect(r.taxaFaltas).toBe(25);
    expect(r.ticketMedio).toBe(341.25);
  });
  it('mês corrente compara com o mesmo período do mês anterior', () => {
    const r = resumoMes(b, '2026-10', '2026-10-03');
    expect(r.parcial).toBe(true);
    expect(r.atual.recebido).toBe(682.5);
    expect(r.anterior.recebido).toBe(0);     // set/10 fica fora de 01–03/set
  });
  it('variação', () => {
    expect(variacao(110, 100)).toBe(10);
    expect(variacao(5, 0)).toBeNull();
  });
  it('por forma de pagamento', () => {
    expect(porForma(b, '2026-10-01', '2026-10-31')).toEqual({ pix: 350, cartao_credito: 332.5, cartao_debito: 0, dinheiro: 0 });
  });
  it('relatório de receitas com total e CSV para Excel', () => {
    const r = montarRelatorio('receitas', b, '2026-10-01', '2026-10-31');
    expect(r.linhas).toHaveLength(2);
    expect(r.total?.[4]).toBe(682.5);
    const csv = paraCsv(r);
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv).toContain('01/10/2026;Ana;Consulta;PIX;350,00');
  });
  it('fluxo de caixa acumula', () => {
    const r = montarRelatorio('fluxo', b, '2026-10-01', '2026-10-31');
    expect(r.linhas[r.linhas.length - 1][4]).toBe(-4017.5);
  });
  it('célula formata data e moeda', () => {
    expect(celula('2026-10-01')).toBe('01/10/2026');
    expect(celula(10, true, (n) => 'R$ ' + n)).toBe('R$ 10');
  });
});

describe('base fictícia (financeiro)', () => {
  const g = gerarBase('2026-10-24', 9 * 60 + 10);
  it('6 meses de série com receita e despesa', () => {
    const s = serieMensal(g, '2026-10', 6, '2026-10-24');
    expect(s.map((x) => x.mes)).toEqual(['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10']);
    expect(s.every((x) => x.receita > 0 && x.despesa > 0)).toBe(true);
  });
  it('clínica dá lucro num mês fechado', () => {
    expect(resumoMes(g, '2026-09', '2026-10-24').atual.lucro).toBeGreaterThan(0);
  });
  it('despesas vencidas estão pagas; futuras a pagar', () => {
    expect(g.despesas.every((d) => (d.data < '2026-10-24' ? d.status === 'paga' : d.status === 'a_pagar'))).toBe(true);
  });
  it('ocupação por dia da semana entre 0 e 100%', () => {
    const o = ocupacaoSemana(g, '2026-09-01', '2026-09-30');
    expect(o).toHaveLength(6);
    expect(o.every((x) => x.pct >= 0 && x.pct <= 100)).toBe(true);
  });
});
