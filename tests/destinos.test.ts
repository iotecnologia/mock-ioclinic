// Busca global (padrão ERP): a palavra-chave leva às páginas e funções certas, respeitando o perfil.
import { describe, expect, it } from 'vitest';
import { buscarDestinos } from '../src/regras/destinos';

const ids = (t: string, perfil: 'medica' | 'recepcao' = 'medica') => buscarDestinos(t, perfil).map((d) => d.id);

describe('busca global: destinos', () => {
  it('"despesa" leva ao financeiro (lista e nova despesa)', () => expect(ids('despesa')).toEqual(expect.arrayContaining(['fin-despesas', 'fin-nova'])));
  it('sinônimos: "agendar" e "marcar" levam ao novo agendamento', () => {
    expect(ids('agendar')[0]).toBe('agenda-novo');
    expect(ids('marcar')).toContain('agenda-novo');
  });
  it('acentos não importam: "revisão" e "revisao"', () => expect(ids('revisão')).toEqual(ids('revisao')));
  it('palavra no meio de outra não conta ("ana" não acha "semana")', () => expect(ids('ana')).toEqual([]));
  it('recepção não vê o financeiro nem o histórico', () => {
    expect(ids('despesa', 'recepcao')).toEqual([]);
    expect(ids('receita', 'recepcao')).toEqual([]);
  });
  it('várias palavras: todas precisam combinar', () => expect(ids('nova despesa')[0]).toBe('fin-nova'));
});
