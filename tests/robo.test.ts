// Robô do WhatsApp: menu com opções, agendar (paciente novo e cadastrado), remarcar, cancelar, atendente e FAQ.
import { describe, expect, it } from 'vitest';
import { diasComVaga, estadoInicial, pacienteDoNumero, responder, type EstadoRobo } from '../src/regras/robo';
import { gerarBase } from '../src/repositorio/gerador';

const HOJE = '2026-11-03';   // terça
const base = gerarBase(HOJE, 600);
const c = { base, hoje: HOJE, agoraMin: 8 * 60 };
const fala = (e: EstadoRobo, ...entradas: string[]) => {
  let r = { estado: e, msgs: [] as ReturnType<typeof responder>['msgs'], efeitos: [] as ReturnType<typeof responder>['efeitos'] };
  for (const x of entradas) r = responder(r.estado, x, c);
  return r;
};

describe('robô do WhatsApp', () => {
  it('qualquer mensagem abre o menu com 3 opções', () => {
    const r = fala(estadoInicial('(19) 98877-6655'), 'oi bom dia');
    expect(r.msgs[0].opcoes!.map((o) => o.id)).toEqual(['agendar', 'meus', 'atendente']);
  });
  it('pergunta de convênio responde "somente particular" e volta ao menu', () => {
    const r = fala(estadoInicial('(19) 98877-6655'), 'vocês atendem Unimed?');
    expect(r.msgs[0].texto).toContain('somente particular');
    expect(r.msgs[1].opcoes).toHaveLength(3);
  });
  it('paciente novo: escolhe serviço, dia e hora, informa nome e nascimento e agenda', () => {
    let r = fala(estadoInicial('(19) 98877-6655'), 'oi', 'agendar', 'consulta');
    const dia = r.msgs[0].opcoes![0].id;
    r = fala(r.estado, dia);
    const hora = r.msgs[0].opcoes![0].id;
    r = fala(r.estado, hora, 'Joana Prado', '20/04/1962', 'confirmar');
    expect(r.efeitos).toEqual([{ tipo: 'agendar', servicoId: 'consulta', data: dia, hora, novo: { nome: 'Joana Prado', nascimento: '1962-04-20', telefone: '(19) 98877-6655' } }]);
    expect(r.msgs[0].texto).toContain('Agendado');
  });
  it('data de nascimento inválida pede de novo', () => {
    let r = fala(estadoInicial('(19) 98877-6655'), 'oi', 'agendar', 'consulta');
    r = fala(r.estado, r.msgs[0].opcoes![0].id); r = fala(r.estado, r.msgs[0].opcoes![0].id, 'Joana Prado', '31/13/1990');
    expect(r.estado.etapa).toBe('nascimento');
  });
  it('paciente cadastrado é reconhecido pelo número e não precisa informar nome', () => {
    const p = base.pacientes.find((x) => x.telefone)!;
    expect(pacienteDoNumero(base, p.telefone)?.id).toBe(p.id);
    let r = fala(estadoInicial(p.telefone), 'oi', 'agendar', 'ecg');
    r = fala(r.estado, r.msgs[0].opcoes![0].id); r = fala(r.estado, r.msgs[0].opcoes![0].id);
    expect(r.estado.etapa).toBe('confirmar');
    r = fala(r.estado, 'confirmar');
    expect(r.efeitos[0]).toMatchObject({ tipo: 'agendar', pacienteId: p.id });
  });
  it('remarcar e cancelar um agendamento futuro', () => {
    const a = base.agendamentos.find((x) => x.data > HOJE && x.status === 'agendado' && base.pacientes.find((p) => p.id === x.pacienteId)?.telefone)!;
    const tel = base.pacientes.find((p) => p.id === a.pacienteId)!.telefone;
    const cancel = fala(estadoInicial(tel), 'oi', 'meus', a.id, 'cancelar');
    expect(cancel.efeitos).toEqual([{ tipo: 'cancelar', agendamentoId: a.id }]);
    let r = fala(estadoInicial(tel), 'oi', 'meus', a.id, 'remarcar');
    r = fala(r.estado, r.msgs[0].opcoes![0].id); r = fala(r.estado, r.msgs[0].opcoes![0].id, 'confirmar');
    expect(r.efeitos[0]).toMatchObject({ tipo: 'agendar', substitui: a.id, servicoId: a.servicoId });
  });
  it('falar com atendente: o robô fica quieto até o paciente mandar "menu"', () => {
    let r = fala(estadoInicial('(19) 98877-6655'), 'oi', 'atendente');
    expect(r.efeitos[0].tipo).toBe('atendente');
    r = fala(r.estado, 'tudo bem?');
    expect(r.msgs).toHaveLength(0);
    r = fala(r.estado, 'menu');
    expect(r.msgs[0].opcoes).toHaveLength(3);
  });
  it('só oferece dias com vaga e com a clínica aberta', () => {
    const d = diasComVaga(c, 'consulta');
    expect(d.length).toBeGreaterThan(0);
    expect(d.every((x) => new Date(x + 'T12:00').getDay() !== 0)).toBe(true);
  });
});
