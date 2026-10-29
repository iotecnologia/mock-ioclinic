import { beforeEach, describe, expect, it } from 'vitest';
import { apagarSalvo, CHAVE_DEMO, fecharDiasPassados, juntar, lerSalvo } from '../src/componentes/Dados';
import { gerarBase } from '../src/repositorio/gerador';

// localStorage de mentira (os testes rodam fora do navegador)
const mem = new Map<string, string>();
(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k), clear: () => mem.clear(), key: () => null, length: 0,
} as Storage;

describe('salvar no navegador (mock)', () => {
  beforeEach(() => mem.clear());

  it('sem nada salvo → null; versão diferente → ignora', () => {
    expect(lerSalvo()).toBeNull();
    mem.set(CHAVE_DEMO, JSON.stringify({ versao: 999 }));
    expect(lerSalvo()).toBeNull();
  });

  it('o que foi salvo volta junto com a base nova (paciente novo continua lá)', () => {
    const b = gerarBase('2026-10-24', 600);
    const novo = { ...b.pacientes[0], id: 'nTESTE', nome: 'Paciente Cadastrado Na Demo' };
    mem.set(CHAVE_DEMO, JSON.stringify({ versao: 1, salvoEm: '2026-10-24', pacientes: [...b.pacientes, novo], agendamentos: b.agendamentos, atendimentos: b.atendimentos, resumos: b.resumos, documentos: b.documentos, despesas: b.despesas, bloqueios: b.bloqueios }));
    const s = lerSalvo()!;
    const j = juntar(gerarBase('2026-10-24', 600), s);
    expect(j.pacientes.some((p) => p.nome === 'Paciente Cadastrado Na Demo')).toBe(true);
    expect(j.cids.length).toBeGreaterThan(0);   // estático vem do código
    apagarSalvo();
    expect(lerSalvo()).toBeNull();
  });

  it('dias seguintes: fecha o que ficou em aberto no passado, sem mexer em hoje/futuro', () => {
    const b = gerarBase('2026-10-24', 9 * 60);   // salvo no dia 24 de manhã
    const f = fecharDiasPassados(b, '2026-10-29');  // aberto no dia 29
    const abertosPassado = f.agendamentos.filter((a) => a.data < '2026-10-29' && ['agendado', 'confirmado', 'chegou', 'em_atendimento'].includes(a.status));
    expect(abertosPassado).toHaveLength(0);
    const fechados = f.agendamentos.filter((a) => a.data >= '2026-10-24' && a.data < '2026-10-29');
    expect(fechados.every((a) => a.status === 'atendido' || a.status === 'faltou' || a.status === 'cancelado')).toBe(true);
    // atendidos fechados ficaram recebidos (ou isentos)
    expect(fechados.filter((a) => a.status === 'atendido').every((a) => !a.pagamento || a.pagamento.status !== 'pendente')).toBe(true);
    // futuro intocado
    const fut = (x: typeof b) => x.agendamentos.filter((a) => a.data >= '2026-10-29').map((a) => a.status).join();
    expect(fut(f)).toBe(fut(b));
  });

  it('é estável (abrir duas vezes dá o mesmo resultado)', () => {
    const b = gerarBase('2026-10-24', 600);
    expect(JSON.stringify(fecharDiasPassados(fecharDiasPassados(b, '2026-10-29'), '2026-10-29'))).toBe(JSON.stringify(fecharDiasPassados(b, '2026-10-29')));
  });
});
