// Cálculo do orçamento particular: desconto PIX/dinheiro, desconto extra e parcelamento no cartão.
import type { Clinica, Servico } from '../tipos/modelos';

export interface ItemOrc { servicoId: string; qtd: number }
export type FormaOrc = 'cartao' | 'pix';

/** Máximo de parcelas no cartão para o valor (regra por faixa em clinica.json). */
export function parcelasMax(total: number, c: Pick<Clinica, 'parcelas'>): number {
  for (const f of c.parcelas) if (f.ate === null || total <= f.ate) return f.vezes;
  return 1;
}

/** Desconto extra permitido: médica sem limite; recepção até o máximo da clínica. */
export const limiteDesconto = (perfil: 'medica' | 'recepcao', c: Pick<Clinica, 'descontoMaxRecepcao'>) => (perfil === 'medica' ? 100 : c.descontoMaxRecepcao);

export function calcular(itens: ItemOrc[], servicos: Servico[], forma: FormaOrc, descontoExtra: number, c: Pick<Clinica, 'descontoPix' | 'parcelas'>) {
  const linhas = itens.map((i) => { const s = servicos.find((x) => x.id === i.servicoId)!; return { s, qtd: i.qtd, valor: s.valor * i.qtd }; });
  const subtotal = linhas.reduce((t, l) => t + l.valor, 0);
  const extra = Math.min(Math.max(descontoExtra, 0), 100);
  const descExtra = +(subtotal * extra / 100).toFixed(2);
  const base = subtotal - descExtra;
  const descPix = forma === 'pix' ? +(base * c.descontoPix / 100).toFixed(2) : 0;
  const total = +(base - descPix).toFixed(2);
  const vezes = forma === 'cartao' ? parcelasMax(total, c) : 1;
  return { linhas, subtotal, descExtra, descPix, total, vezes, parcela: +(total / vezes).toFixed(2) };
}
