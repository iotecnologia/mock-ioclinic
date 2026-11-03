// Monta o texto dos documentos (atestado, receita, pedido de exames, declaração de comparecimento),
// no modelo aprovado (protótipo AI Studio). O texto é o mesmo na tela, na impressão e no PDF.
// Sem certificado digital: a Dra. assina e carimba à mão (o selo ICP-Brasil entra só quando ela tiver o certificado).
import type { Documento, Paciente } from '../tipos/modelos';
import { br } from '../util/datas';
import { mascaraCpf } from '../util/formato';

const extensoNum = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'catorze', 'quinze'];
const porExtenso = (n: number) => (n <= 15 ? extensoNum[n] : String(n));

export function atestado(p: Paciente, o: { data: string; hora?: string; dias: number; inicio: string; cid?: string }): Omit<Documento, 'id'> {
  const quando = o.hora ? `nesta data às ${o.hora} horas` : 'nesta data';
  const texto = `Atesto para os devidos fins que o(a) paciente ${p.nome}, inscrito(a) no CPF sob o nº ${mascaraCpf(p.cpf)}, esteve sob meus cuidados médicos ${quando}` +
    (o.dias > 0
      ? `, necessitando de ${o.dias} (${porExtenso(o.dias)}) dia${o.dias > 1 ? 's' : ''} de afastamento de suas atividades habituais e profissionais a partir de ${br(o.inicio)}.`
      : ', sem necessidade de afastamento de suas atividades.');
  return { pacienteId: p.id, data: o.data, hora: o.hora, tipo: 'atestado', titulo: 'Atestado médico', paragrafos: [texto], ...(o.cid ? { cid: o.cid } : {}) };
}

export interface ItemReceita { nome: string; qtd?: string; uso: string }

/** Receita: "—— USO ORAL ——", "1) Remédio (dose) ——— quantidade", "Posologia: …" e orientações gerais. */
export function receita(p: Paciente, o: { data: string; hora?: string; itens: ItemReceita[]; orientacoes?: string }): Omit<Documento, 'id'> {
  const itens = o.itens.filter((i) => i.nome.trim()).map((i, k) =>
    `${k + 1}) ${i.nome.trim()}${i.qtd?.trim() ? ` ——— ${i.qtd.trim()}` : ''}${i.uso.trim() ? `\nPosologia: ${i.uso.trim()}` : ''}`);
  return {
    pacienteId: p.id, data: o.data, hora: o.hora, tipo: 'receita', titulo: 'Receituário médico',
    paragrafos: ['—— USO ORAL ——'], itens,
    ...(o.orientacoes?.trim() ? { notas: ['ORIENTAÇÕES GERAIS AO PACIENTE:', o.orientacoes.trim()] } : {}),
  };
}

export function pedidoExames(p: Paciente, o: { data: string; hora?: string; exames: string[]; indicacao?: string }): Omit<Documento, 'id'> {
  return {
    pacienteId: p.id, data: o.data, hora: o.hora, tipo: 'pedido_exames', titulo: 'Pedido médico / solicitação',
    paragrafos: ['Solicito a realização dos seguintes exames:'],
    itens: o.exames.map((e, k) => `${k + 1}) ${e}`),
    ...(o.indicacao ? { notas: [`Indicação clínica: ${o.indicacao}`] } : {}),
  };
}

export function comparecimento(p: Paciente, o: { data: string; hora?: string; de: string; ate: string }): Omit<Documento, 'id'> {
  return {
    pacienteId: p.id, data: o.data, hora: o.hora, tipo: 'comparecimento', titulo: 'Declaração de comparecimento',
    paragrafos: [`Declaro para os devidos fins que o(a) paciente ${p.nome}, portador(a) do CPF ${mascaraCpf(p.cpf)}, compareceu a esta unidade de atendimento médico no dia ${br(o.data)}, no período das ${o.de} às ${o.ate}, para consulta e acompanhamento ambulatorial.`],
  };
}

export const NOME_DOC: Record<Documento['tipo'], string> = {
  atestado: 'Atestado', receita: 'Receita', pedido_exames: 'Pedido de exames', comparecimento: 'Declaração de comparecimento',
};
