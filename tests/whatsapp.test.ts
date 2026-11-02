// Mensagens do WhatsApp (confirmação, lembrete e remarcação) e a resposta simulada da demonstração.
import { describe, expect, it } from 'vitest';
import { msgAgendamento, msgLembrete, msgRemarcar, respostaSimulada } from '../src/regras/mensagens';
import type { Clinica, Servico } from '../src/tipos/modelos';
import clinica from '../src/dados/clinica.json';
import servicos from '../src/dados/servicos.json';

const c = clinica as Clinica;
const consulta = (servicos as Servico[]).find((s) => s.id === 'consulta')!;
const p = { nome: 'Joana Teste Prado' };
const a = { data: '2026-11-07', hora: '09:00' };

describe('mensagens do WhatsApp', () => {
  it('confirmação: saudação, dados, emojis e pedido de confirmação', () => {
    const m = msgAgendamento(c, p, consulta, a);
    expect(m).toContain('Olá, Joana! 👋');
    expect(m).toContain('📅 Sábado, 07/11/2026');
    expect(m).toContain('⏰ 09:00');
    expect(m).toContain('1️⃣ Confirmo');
    expect(m).toContain('2️⃣ Preciso remarcar');
    expect(m).toContain(c.medica);
  });
  it('lembrete pede confirmação', () => {
    const m = msgLembrete(c, p, consulta, a);
    expect(m).toContain('Você confirma sua presença?');
    expect(m).toContain('📅 Sábado, 07/11 às ⏰ 09:00');
  });
  it('remarcar', () => expect(msgRemarcar(c, p)).toContain('pedido para remarcar'));
  it('resposta simulada é estável e cobre os casos', () => {
    const r = Array.from({ length: 200 }, (_, i) => respostaSimulada('ag' + i));
    expect(respostaSimulada('ag7')).toBe(respostaSimulada('ag7'));
    expect(r).toContain('confirmou'); expect(r).toContain('remarcar'); expect(r).toContain(null);
    expect(Array.from({ length: 50 }, (_, i) => respostaSimulada('n' + i, true))).not.toContain(null);
  });
});
