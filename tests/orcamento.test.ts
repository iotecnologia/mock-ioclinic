import { describe, expect, it } from 'vitest';
import { calcular, limiteDesconto, parcelasMax } from '../src/regras/orcamento';
import type { Clinica, Servico } from '../src/tipos/modelos';
import clinica from '../src/dados/clinica.json';
import servicos from '../src/dados/servicos.json';

const c = clinica as Clinica;
const s = servicos as Servico[];

describe('orçamento', () => {
  it('parcelas por faixa', () => {
    expect(parcelasMax(250, c)).toBe(2);
    expect(parcelasMax(300, c)).toBe(2);
    expect(parcelasMax(450, c)).toBe(3);
    expect(parcelasMax(1200, c)).toBe(6);
  });
  it('cartão: sem desconto, parcelado', () => {
    const r = calcular([{ servicoId: 'consulta', qtd: 1 }, { servicoId: 'eco', qtd: 1 }], s, 'cartao', 0, c);
    expect(r.subtotal).toBe(770);
    expect(r.total).toBe(770);
    expect(r.vezes).toBe(6);
    expect(r.parcela).toBeCloseTo(128.33, 2);
  });
  it('PIX: 5% de desconto', () => {
    expect(calcular([{ servicoId: 'consulta', qtd: 1 }], s, 'pix', 0, c).total).toBe(332.5);
  });
  it('desconto extra antes do PIX', () => {
    const r = calcular([{ servicoId: 'consulta', qtd: 1 }], s, 'pix', 10, c);
    expect(r.descExtra).toBe(35);
    expect(r.total).toBe(299.25);
  });
  it('limite de desconto: recepção até o máximo da clínica, médica sem limite', () => {
    expect(limiteDesconto('recepcao', c)).toBe(10);
    expect(limiteDesconto('medica', c)).toBe(100);
  });
});
