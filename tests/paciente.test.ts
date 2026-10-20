import { describe, expect, it } from 'vitest';
import { buscarPacientes, historico, idade } from '../src/regras/paciente';
import { cpfValido, mascaraCpf, mascaraTelefone, cpfOculto } from '../src/util/formato';
import type { Paciente } from '../src/tipos/modelos';

const p = (id: string, nome: string, cpf = '529.982.247-25', telefone = '(19) 99999-1111'): Paciente =>
  ({ id, nome, cpf, telefone, nascimento: '1960-05-10', sexo: 'F', consentimentoLgpd: true, criadoEm: '2026-01-01' });

describe('paciente', () => {
  it('idade considera se já fez aniversário', () => {
    expect(idade('1960-05-10', '2026-05-09')).toBe(65);
    expect(idade('1960-05-10', '2026-05-10')).toBe(66);
  });
  it('busca sem acento e por partes do nome', () => {
    const l = [p('1', 'Lúcia Ferraz Prado'), p('2', 'José Almeida')];
    expect(buscarPacientes(l, 'lucia prado').map((x) => x.id)).toEqual(['1']);
    expect(buscarPacientes(l, 'JOSE').map((x) => x.id)).toEqual(['2']);
  });
  it('busca por CPF ou telefone (só números)', () => {
    const l = [p('1', 'Ana', '529.982.247-25'), p('2', 'Bia', '111.444.777-35', '(19) 98888-2222')];
    expect(buscarPacientes(l, '529982').map((x) => x.id)).toEqual(['1']);
    expect(buscarPacientes(l, '98888').map((x) => x.id)).toEqual(['2']);
  });
});

describe('formatos', () => {
  it('CPF válido e inválido', () => {
    expect(cpfValido('529.982.247-25')).toBe(true);
    expect(cpfValido('529.982.247-26')).toBe(false);
    expect(cpfValido('111.111.111-11')).toBe(false);
  });
  it('máscaras', () => {
    expect(mascaraCpf('52998224725')).toBe('529.982.247-25');
    expect(mascaraTelefone('19999991111')).toBe('(19) 99999-1111');
    expect(cpfOculto('52998224725')).toBe('***.982.247-**');
  });
});

describe('histórico e LGPD', () => {
  const b = {
    pacientes: [p('p1', 'Ana')],
    servicos: [{ id: 'consulta', nome: 'Consulta', curto: 'Consulta', tipo: 'consulta' as const, duracaoMin: 60, valor: 350 }],
    agendamentos: [{ id: 'a1', pacienteId: 'p1', servicoId: 'consulta', data: '2026-09-01', hora: '09:00', duracaoMin: 60, status: 'atendido' as const, pagamento: { status: 'pago' as const, valor: 350, forma: 'pix' as const, pagoEm: '2026-09-01' }, criadoEm: '2026-08-20' }],
    atendimentos: [{ id: 'x', agendamentoId: 'a1', pacienteId: 'p1', data: '2026-09-01', queixa: 'Dor', conduta: 'Exames', cid: 'I10', cidDescricao: 'Hipertensão' }],
  };
  it('recepção NÃO vê conteúdo clínico', () => {
    expect(historico('p1', b, 'recepcao').some((i) => i.tipo === 'clinico')).toBe(false);
  });
  it('médica vê conteúdo clínico', () => {
    expect(historico('p1', b, 'medica').some((i) => i.tipo === 'clinico')).toBe(true);
  });
});
