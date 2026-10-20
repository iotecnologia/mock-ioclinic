import { describe, expect, it } from 'vitest';
import { buscarCid, classificaImc, classificaPA, imc, lerPA } from '../src/regras/prontuario';
import { atestado, receita } from '../src/regras/documentos';
import { historico } from '../src/regras/paciente';
import type { Cid, Paciente } from '../src/tipos/modelos';
import cids from '../src/dados/cid.json';

const lista = cids as Cid[];
const p: Paciente = { id: 'p1', nome: 'Ana Lima', cpf: '52998224725', nascimento: '1960-01-01', sexo: 'F', telefone: '(19) 99999-1111', consentimentoLgpd: true, criadoEm: '2026-01-01' };

describe('sinais vitais', () => {
  it('IMC e classificação', () => {
    expect(imc(80, 170)).toBe(27.7);
    expect(classificaImc(27.7)?.nome).toBe('Sobrepeso');
    expect(classificaImc(22)?.nome).toBe('Peso adequado');
    expect(imc(80, undefined)).toBeUndefined();
  });
  it('lê PA em mmHg e em cmHg (12x8)', () => {
    expect(lerPA('120/80')).toEqual({ sis: 120, dia: 80 });
    expect(lerPA('12x8')).toEqual({ sis: 120, dia: 80 });
    expect(lerPA('80/120')).toBeUndefined();
    expect(lerPA('abc')).toBeUndefined();
  });
  it('classifica PA pela pior das duas (diretriz 2020)', () => {
    expect(classificaPA('118/76')?.nome).toBe('PA ótima');
    expect(classificaPA('125/82')?.nome).toBe('PA normal');
    expect(classificaPA('132/80')?.nome).toBe('Pré-hipertensão');
    expect(classificaPA('130/95')?.nome).toBe('HA estágio 1');
    expect(classificaPA('165/90')?.nome).toBe('HA estágio 2');
    expect(classificaPA('150/112')?.nome).toBe('HA estágio 3');
  });
});

describe('busca de CID', () => {
  it('por código', () => expect(buscarCid(lista, 'i10')[0].codigo).toBe('I10'));
  it('por texto sem acento e em partes', () => expect(buscarCid(lista, 'fibrila atrial')[0].codigo).toBe('I48'));
  it('palpitação', () => expect(buscarCid(lista, 'palpitac').map((c) => c.codigo)).toContain('R00.2'));
  it('vazio não devolve nada', () => expect(buscarCid(lista, '  ')).toHaveLength(0));
});

describe('documentos', () => {
  it('atestado com dias por extenso e CID só se informado', () => {
    const a = atestado(p, { data: '2026-10-20', dias: 2, inicio: '2026-10-20' });
    expect(a.paragrafos[0]).toContain('2 (dois) dias');
    expect(a.paragrafos.join(' ')).not.toContain('CID');
    expect(atestado(p, { data: '2026-10-20', dias: 0, inicio: '2026-10-20', cid: 'I10' }).paragrafos[1]).toContain('I10');
  });
  it('receita numera e ignora linhas vazias', () => {
    const r = receita(p, { data: '2026-10-20', itens: [{ nome: 'Losartana 50 mg', uso: '1 cp 12/12h' }, { nome: ' ', uso: '' }] });
    expect(r.itens).toEqual(['1. Losartana 50 mg — 1 cp 12/12h']);
  });
  it('recepção não vê documentos no histórico (podem ter CID)', () => {
    const b = { pacientes: [p], servicos: [], agendamentos: [], atendimentos: [], documentos: [{ id: 'd', ...atestado(p, { data: '2026-10-20', dias: 1, inicio: '2026-10-20' }) }] };
    expect(historico('p1', b, 'recepcao').some((i) => i.tipo === 'documento')).toBe(false);
    expect(historico('p1', b, 'medica').some((i) => i.tipo === 'documento')).toBe(true);
  });
});
