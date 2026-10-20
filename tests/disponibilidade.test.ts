import { describe, expect, it } from 'vitest';
import { horariosLivres, situacaoDia, gradeDoDia, type BaseAgenda } from '../src/regras/disponibilidade';
import type { Agendamento, Clinica } from '../src/tipos/modelos';
import clinica from '../src/dados/clinica.json';

// 2026-10-26 = segunda · 2026-10-24 = sábado · 2026-10-25 = domingo · 2026-11-02 = Finados
const ag = (id: string, data: string, hora: string, duracaoMin: number, status: Agendamento['status'] = 'agendado'): Agendamento =>
  ({ id, pacienteId: 'p01', servicoId: 'x', data, hora, duracaoMin, status, criadoEm: data });
const base = (agendamentos: Agendamento[] = []): BaseAgenda => ({
  clinica: clinica as Clinica, agendamentos,
  feriados: [{ data: '2026-11-02', nome: 'Finados' }],
  bloqueios: [{ data: '2026-10-30', motivo: 'Congresso' }],
});

describe('dias de atendimento', () => {
  it('domingo fechado', () => expect(situacaoDia('2026-10-25', base()).aberto).toBe(false));
  it('feriado fechado com motivo', () => expect(situacaoDia('2026-11-02', base()).motivo).toContain('Finados'));
  it('bloqueio fecha o dia', () => expect(situacaoDia('2026-10-30', base()).motivo).toContain('Congresso'));
  it('segunda abre', () => expect(situacaoDia('2026-10-26', base()).aberto).toBe(true));
});

describe('horários livres', () => {
  it('segunda vazia: 18 blocos de 30 min (8–12 e 13–18)', () => {
    expect(horariosLivres('2026-10-26', 30, base())).toHaveLength(18);
  });
  it('sábado só de manhã', () => {
    const l = horariosLivres('2026-10-24', 30, base());
    expect(l[0]).toBe('08:00');
    expect(l[l.length - 1]).toBe('11:30');
  });
  it('consulta de 1h não atravessa o almoço (11:30 não serve)', () => {
    const l = horariosLivres('2026-10-26', 60, base());
    expect(l).toContain('11:00');
    expect(l).not.toContain('11:30');
    expect(l).not.toContain('12:00');
    expect(l).toContain('13:00');
    expect(l).not.toContain('17:30');
  });
  it('não sobrepõe agendamento existente', () => {
    const l = horariosLivres('2026-10-26', 60, base([ag('a', '2026-10-26', '09:00', 60)]));
    expect(l).not.toContain('08:30');
    expect(l).not.toContain('09:00');
    expect(l).not.toContain('09:30');
    expect(l).toContain('08:00');
    expect(l).toContain('10:00');
  });
  it('cancelado libera o horário', () => {
    const l = horariosLivres('2026-10-26', 60, base([ag('a', '2026-10-26', '09:00', 60, 'cancelado')]));
    expect(l).toContain('09:00');
  });
  it('hoje: não oferece horário que já passou', () => {
    const l = horariosLivres('2026-10-26', 30, base(), { agoraMin: 10 * 60 + 5 });
    expect(l[0]).toBe('10:30');
  });
  it('remarcar: ignora o próprio agendamento', () => {
    const l = horariosLivres('2026-10-26', 60, base([ag('a', '2026-10-26', '09:00', 60)]), { ignorarId: 'a' });
    expect(l).toContain('09:00');
  });
});

describe('grade do dia', () => {
  it('mostra agendamento uma vez e pula a duração dele', () => {
    const g = gradeDoDia('2026-10-26', base([ag('a', '2026-10-26', '09:00', 60)]));
    expect(g.filter((x) => x.tipo === 'ocupado')).toHaveLength(1);
    expect(g.find((x) => x.hora === '09:30')).toBeUndefined();
    expect(g.some((x) => x.tipo === 'intervalo' && x.hora === '12:00')).toBe(true);
  });
  it('dia fechado: grade vazia', () => expect(gradeDoDia('2026-10-25', base())).toHaveLength(0));
});
