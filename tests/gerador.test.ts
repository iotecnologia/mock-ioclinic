import { describe, expect, it } from 'vitest';
import { gerarBase } from '../src/repositorio/gerador';
import { situacaoDia } from '../src/regras/disponibilidade';
import { min } from '../src/util/datas';
import { cpfValido } from '../src/util/formato';

const b = gerarBase('2026-10-24', 9 * 60 + 10);

describe('base fictícia', () => {
  it('é previsível (mesma data → mesma base)', () => {
    expect(gerarBase('2026-10-24', 9 * 60 + 10).agendamentos.length).toBe(b.agendamentos.length);
  });
  it('200 pacientes com CPF válido', () => {
    expect(b.pacientes).toHaveLength(200);
    expect(b.pacientes.every((p) => cpfValido(p.cpf))).toBe(true);
  });
  it('nenhum agendamento sobreposto no mesmo dia', () => {
    const porDia = new Map<string, [number, number][]>();
    for (const a of b.agendamentos.filter((x) => x.status !== 'cancelado')) {
      const l = porDia.get(a.data) ?? [];
      const i = min(a.hora), f = i + a.duracaoMin;
      expect(l.some(([x, y]) => i < y && x < f)).toBe(false);
      l.push([i, f]); porDia.set(a.data, l);
    }
  });
  it('nenhum agendamento em dia fechado', () => {
    expect(b.agendamentos.every((a) => situacaoDia(a.data, b).aberto)).toBe(true);
  });
  it('o dia de hoje tem agenda', () => {
    expect(b.agendamentos.filter((a) => a.data === '2026-10-24').length).toBeGreaterThan(3);
  });
  it('ninguém duas vezes no mesmo dia', () => {
    const vistos = new Set<string>();
    for (const a of b.agendamentos.filter((x) => x.status !== 'cancelado')) {
      const k = a.data + a.pacienteId;
      expect(vistos.has(k)).toBe(false);
      vistos.add(k);
    }
  });
  it('tem pacientes para a revisão anual (última visita há mais de 1 ano)', () => {
    const ult = new Map<string, string>();
    for (const a of b.agendamentos) if (a.status === 'atendido' && a.data > (ult.get(a.pacienteId) ?? '')) ult.set(a.pacienteId, a.data);
    expect([...ult.values()].filter((d) => d < '2025-10-24').length).toBeGreaterThan(5);
  });
  it('só consultas/retornos atendidos têm prontuário', () => {
    for (const at of b.atendimentos) {
      const a = b.agendamentos.find((x) => x.id === at.agendamentoId)!;
      expect(a.status).toBe('atendido');
      expect(a.servicoId).not.toMatch(/ecg|eco|holter|mapa|ergometrico|bioimpedancia|ecodoppler/);
    }
  });
});
