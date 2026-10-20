// Monta o texto dos documentos (atestado, receita, pedido de exames, declaração de comparecimento).
// O texto é o mesmo na tela e na impressão. Papel timbrado, assinatura e carimbo da Dra. à mão.
import type { Documento, Paciente } from '../tipos/modelos';
import { br } from '../util/datas';
import { mascaraCpf } from '../util/formato';

const extensoNum = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'catorze', 'quinze'];
const porExtenso = (n: number) => (n <= 15 ? extensoNum[n] : String(n));
const ident = (p: Paciente) => `${p.nome}, CPF ${mascaraCpf(p.cpf)}`;

export function atestado(p: Paciente, o: { data: string; dias: number; inicio: string; cid?: string }): Omit<Documento, 'id'> {
  const par = [
    `Atesto, para os devidos fins, que ${ident(p)}, esteve sob meus cuidados profissionais nesta data` +
      (o.dias > 0 ? ` e necessita de ${o.dias} (${porExtenso(o.dias)}) dia${o.dias > 1 ? 's' : ''} de afastamento de suas atividades a partir de ${br(o.inicio)}.` : ', sem necessidade de afastamento.'),
  ];
  if (o.cid) par.push(`CID-10: ${o.cid} (informado com autorização do paciente).`);
  return { pacienteId: p.id, data: o.data, tipo: 'atestado', titulo: 'Atestado médico', paragrafos: par };
}

export function receita(p: Paciente, o: { data: string; itens: { nome: string; uso: string }[] }): Omit<Documento, 'id'> {
  return {
    pacienteId: p.id, data: o.data, tipo: 'receita', titulo: 'Receituário',
    paragrafos: [`Paciente: ${p.nome}`, 'Uso oral'],
    itens: o.itens.filter((i) => i.nome.trim()).map((i, k) => `${k + 1}. ${i.nome.trim()}${i.uso.trim() ? ' — ' + i.uso.trim() : ''}`),
  };
}

export function pedidoExames(p: Paciente, o: { data: string; exames: string[]; indicacao?: string }): Omit<Documento, 'id'> {
  return {
    pacienteId: p.id, data: o.data, tipo: 'pedido_exames', titulo: 'Solicitação de exames',
    paragrafos: [`Paciente: ${ident(p)}`, 'Solicito os exames abaixo:'],
    itens: [...o.exames.map((e) => `• ${e}`), ...(o.indicacao ? [`Indicação clínica: ${o.indicacao}`] : [])],
  };
}

export function comparecimento(p: Paciente, o: { data: string; de: string; ate: string }): Omit<Documento, 'id'> {
  return {
    pacienteId: p.id, data: o.data, tipo: 'comparecimento', titulo: 'Declaração de comparecimento',
    paragrafos: [`Declaro, para os devidos fins, que ${ident(p)}, compareceu a esta clínica em ${br(o.data)}, das ${o.de} às ${o.ate}, para atendimento médico.`],
  };
}

export const NOME_DOC: Record<Documento['tipo'], string> = {
  atestado: 'Atestado', receita: 'Receita', pedido_exames: 'Pedido de exames', comparecimento: 'Declaração de comparecimento',
};
