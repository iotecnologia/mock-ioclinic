// Correções de 01/11: pré-cadastro, encaixe, CID por situação, remédio por laboratório, período compartilhado e PDF.
import { describe, expect, it } from 'vitest';
import { gradeDoDia, horariosEncaixe, horariosLivres, type BaseAgenda } from '../src/regras/disponibilidade';
import { cadastrados, ID_REMOVIDO, idadeTxt, limparPreCadastros } from '../src/regras/paciente';
import { buscarCid, buscarMedicamento, nomeNaReceita, opcaoBuscada } from '../src/regras/prontuario';
import { comparacao, mover, periodoDe, rotulo, ultimos } from '../src/regras/periodo';
import { montarRelatorio, resumoPeriodo } from '../src/regras/financeiro';
import { nomeArquivo } from '../src/util/pdf';
import { fecharDiasPassados } from '../src/componentes/Dados';
import { gerarBase } from '../src/repositorio/gerador';
import type { Agendamento, Cid, Clinica, Medicamento, Paciente } from '../src/tipos/modelos';
import clinica from '../src/dados/clinica.json';
import cids from '../src/dados/cid.json';
import meds from '../src/dados/medicamentos.json';

const ag = (id: string, pacienteId: string, data: string, hora: string, status: Agendamento['status'] = 'agendado', extra: Partial<Agendamento> = {}): Agendamento =>
  ({ id, pacienteId, servicoId: 'consulta', data, hora, duracaoMin: 60, status, criadoEm: data, ...extra });
const pac = (id: string, situacao?: Paciente['situacao']): Paciente =>
  ({ id, nome: 'Fulano de Tal', cpf: '', nascimento: situacao ? '' : '1970-05-10', sexo: 'O', telefone: '(19) 99999-0000', consentimentoLgpd: !situacao, criadoEm: '2026-10-01', situacao });

describe('pré-cadastro', () => {
  it('não aparece na lista de pacientes', () => expect(cadastrados([pac('a'), pac('b', 'pre')]).map((p) => p.id)).toEqual(['a']));
  it('mostra "pré-cadastro" no lugar da idade', () => expect(idadeTxt(pac('b', 'pre'), '2026-11-01')).toBe('pré-cadastro'));
  it('agendado: o pré-cadastro fica', () => {
    const b = limparPreCadastros({ pacientes: [pac('b', 'pre')], agendamentos: [ag('1', 'b', '2026-11-03', '09:00')] });
    expect(b.pacientes.map((p) => p.id)).toEqual(['b']);
  });
  it('faltou: nome e WhatsApp apagados, horário fica anônimo', () => {
    const b = limparPreCadastros({ pacientes: [pac('a'), pac('b', 'pre')], agendamentos: [ag('1', 'b', '2026-11-03', '09:00', 'faltou')] });
    expect(b.pacientes.find((p) => p.id === 'b')).toBeUndefined();
    expect(b.agendamentos[0].pacienteId).toBe(ID_REMOVIDO);
    expect(b.pacientes.find((p) => p.id === ID_REMOVIDO)?.telefone).toBe('');
  });
  it('cancelou mas tem outro horário ativo: fica', () => {
    const b = limparPreCadastros({ pacientes: [pac('b', 'pre')], agendamentos: [ag('1', 'b', '2026-11-03', '09:00', 'cancelado'), ag('2', 'b', '2026-11-05', '09:00')] });
    expect(b.pacientes).toHaveLength(1);
  });
  it('paciente cadastrado que falta não é apagado', () => {
    const b = limparPreCadastros({ pacientes: [pac('a')], agendamentos: [ag('1', 'a', '2026-11-03', '09:00', 'faltou')] });
    expect(b.pacientes).toHaveLength(1);
  });
  it('dia passado sem completar o cadastro = faltou e apagado', () => {
    const base = gerarBase('2026-11-01', 600);
    const b = fecharDiasPassados({ ...base, pacientes: [...base.pacientes, pac('pre1', 'pre')], agendamentos: [...base.agendamentos, ag('x1', 'pre1', '2026-10-30', '09:00')] }, '2026-11-01');
    expect(b.pacientes.find((p) => p.id === 'pre1')).toBeUndefined();
    expect(b.agendamentos.find((a) => a.id === 'x1')?.status).toBe('faltou');
  });
});

describe('encaixe', () => {
  const base = (agendamentos: Agendamento[]): BaseAgenda => ({ clinica: clinica as Clinica, agendamentos, feriados: [], bloqueios: [] });
  // sábado 2026-10-31: 08–12 lotado com 4 consultas
  const lotado = ['08:00', '09:00', '10:00', '11:00'].map((h, i) => ag('s' + i, 'a', '2026-10-31', h));
  it('dia lotado não tem horário livre', () => expect(horariosLivres('2026-10-31', 60, base(lotado))).toHaveLength(0));
  it('encaixe oferece todos os horários da grade', () => expect(horariosEncaixe('2026-10-31', base(lotado))).toEqual(['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30']));
  it('encaixe aparece na grade do dia junto com quem já estava no horário', () => {
    const g = gradeDoDia('2026-10-31', base([...lotado, ag('e1', 'b', '2026-10-31', '09:00', 'agendado', { encaixe: true })]));
    const ids = g.filter((l) => l.tipo === 'ocupado').map((l) => (l.tipo === 'ocupado' ? l.ag.id : ''));
    expect(ids).toEqual(['s0', 's1', 'e1', 's2', 's3']);
  });
});

describe('CID por situação', () => {
  const L = cids as Cid[];
  it('"dor no peito" traz CIDs de dor torácica e angina', () => {
    const c = buscarCid(L, 'dor no peito').map((x) => x.codigo);
    expect(c).toEqual(expect.arrayContaining(['R07.4', 'R07.2', 'I20.9']));
  });
  it('"pressão alta" traz I10 primeiro', () => expect(buscarCid(L, 'pressao alta')[0].codigo).toBe('I10'));
  it('"falta de ar" traz dispneia', () => expect(buscarCid(L, 'falta de ar').map((x) => x.codigo)).toContain('R06.0'));
  it('sigla continua funcionando', () => expect(buscarCid(L, 'i48')[0].codigo).toBe('I48'));
});

describe('remédio por laboratório', () => {
  const L = meds as Medicamento[];
  it('cada remédio tem ao menos uma apresentação com laboratório (exceto os sem cadastro)', () => {
    expect(L.filter((m) => m.opcoes?.length).length).toBeGreaterThan(70);
  });
  it('buscar "EMS" traz remédios com genérico EMS', () => {
    const r = buscarMedicamento(L, 'ems', 50);
    expect(r.length).toBeGreaterThan(3);
    expect(r.every((m) => m.opcoes!.some((o) => o.laboratorio === 'EMS'))).toBe(true);
  });
  it('"losartana medley" já vem com o Medley escolhido (se houver)', () => {
    const m = L.find((x) => x.id === 'm001')!;
    const i = opcaoBuscada(m, 'losartana ' + m.opcoes![1].laboratorio.toLowerCase());
    expect(i).toBe(1);
  });
  it('nome na receita', () => {
    const m = L.find((x) => x.id === 'm001')!;
    expect(nomeNaReceita(m, '50 mg', m.opcoes![0])).toBe('Losartana potássica 50 mg (Cozaar® · Organon)');
    expect(nomeNaReceita(m, '50 mg', m.opcoes![1])).toMatch(/^Losartana potássica 50 mg \(genérico · /);
  });
});

describe('período compartilhado', () => {
  it('semana de seg a dom', () => expect(periodoDe('semana', '2026-11-01')).toMatchObject({ de: '2026-10-26', ate: '2026-11-01' }));
  it('trimestre', () => expect(periodoDe('trimestre', '2026-11-01')).toMatchObject({ de: '2026-10-01', ate: '2026-12-31' }));
  it('anda para trás', () => expect(mover(periodoDe('mes', '2026-01-15'), -1)).toMatchObject({ de: '2025-12-01', ate: '2025-12-31' }));
  it('rótulos', () => {
    expect(rotulo(periodoDe('mes', '2026-10-05'))).toBe('Outubro 2026');
    expect(rotulo(periodoDe('trimestre', '2026-10-05'))).toBe('4º trimestre 2026');
  });
  it('período em andamento compara a mesma parte do anterior', () => {
    const c = comparacao(periodoDe('mes', '2026-10-15'), '2026-10-15');
    expect(c).toMatchObject({ parcial: true, atual: { de: '2026-10-01', ate: '2026-10-15' }, anterior: { de: '2026-09-01', ate: '2026-09-15' } });
  });
  it('evolução: 6 meses terminando no escolhido', () => expect(ultimos(periodoDe('mes', '2026-10-05')).map((p) => p.de.slice(0, 7))).toEqual(['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10']));
  it('Financeiro, Painel e Relatórios batem no mesmo período', () => {
    const b = gerarBase('2026-11-01', 600);
    const p = periodoDe('mes', '2026-10-10');
    const r = resumoPeriodo(b, p.de, p.ate);
    const rel = montarRelatorio('receitas', b, p.de, p.ate);
    const desp = montarRelatorio('despesas', b, p.de, p.ate);
    expect(rel.total![4]).toBe(r.recebido);
    expect(desp.total![4]).toBe(r.despesas);
  });
});

describe('PDF', () => {
  it('nome do arquivo', () => expect(nomeArquivo('Receita', 'Maria José Souza', '2026-11-01')).toBe('receita_maria-jose-souza_01-11-2026'));
  it('orçamento sem paciente', () => expect(nomeArquivo('orcamento', undefined, '2026-11-01')).toBe('orcamento_01-11-2026'));
});
