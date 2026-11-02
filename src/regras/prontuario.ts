// Regras do prontuário: IMC, classificação da pressão arterial e busca de CID.
// Funções puras, testadas em tests/prontuario.test.ts.
import type { Cid, ExameCatalogo, Medicamento } from '../tipos/modelos';
import { semAcento } from '../util/formato';

/** IMC = peso / altura² (altura em cm). Sem dado suficiente → undefined. */
export function imc(pesoKg?: number, alturaCm?: number): number | undefined {
  if (!pesoKg || !alturaCm) return undefined;
  const m = alturaCm / 100;
  return +(pesoKg / (m * m)).toFixed(1);
}

export function classificaImc(v?: number): { nome: string; cls: string } | undefined {
  if (v === undefined) return undefined;
  if (v < 18.5) return { nome: 'Baixo peso', cls: 't-at' };
  if (v < 25) return { nome: 'Peso adequado', cls: 't-ok' };
  if (v < 30) return { nome: 'Sobrepeso', cls: 't-at' };
  if (v < 35) return { nome: 'Obesidade grau I', cls: 't-no' };
  if (v < 40) return { nome: 'Obesidade grau II', cls: 't-no' };
  return { nome: 'Obesidade grau III', cls: 't-no' };
}

/** Lê "120/80" (aceita "12x8" e "12/8" como cmHg). */
export function lerPA(txt?: string): { sis: number; dia: number } | undefined {
  const m = (txt ?? '').replace(/\s/g, '').match(/^(\d{2,3})[/xX](\d{1,3})$/);
  if (!m) return undefined;
  let sis = Number(m[1]), dia = Number(m[2]);
  if (sis < 30) { sis *= 10; dia *= 10; }   // 12/8 → 120/80
  if (sis < 60 || sis > 300 || dia < 30 || dia > 200 || dia >= sis) return undefined;
  return { sis, dia };
}

/** Classificação da PA no consultório (Diretriz Brasileira de Hipertensão 2020). Vale a pior das duas. */
export function classificaPA(txt?: string): { nome: string; cls: string } | undefined {
  const pa = lerPA(txt);
  if (!pa) return undefined;
  const n = (s: number, d: number) => pa.sis >= s || pa.dia >= d;
  if (n(180, 110)) return { nome: 'HA estágio 3', cls: 't-no' };
  if (n(160, 100)) return { nome: 'HA estágio 2', cls: 't-no' };
  if (n(140, 90)) return { nome: 'HA estágio 1', cls: 't-at' };
  if (n(130, 85)) return { nome: 'Pré-hipertensão', cls: 't-at' };
  if (n(120, 80)) return { nome: 'PA normal', cls: 't-ok' };
  return { nome: 'PA ótima', cls: 't-ok' };
}

/**
 * Busca de CID por código ("i10", "I48"), pela descrição ("fibrila atrial") ou pela SITUAÇÃO em palavras do dia a dia
 * ("dor no peito", "pressão alta", "falta de ar") — cada CID tem `termos` com esses jeitos de falar. Sem acento.
 * Ordem: código → situação com a frase inteira → descrição → palavras soltas.
 */
export function buscarCid(lista: Cid[], termo: string, max = 8): Cid[] {
  const t = semAcento(termo).trim();
  if (!t) return [];
  const cod = t.replace(/[^a-z0-9]/g, '');
  const partes = t.split(/\s+/);
  const pontua = (c: Cid): number => {
    if (/^[a-z]\d/.test(cod) && c.codigo.toLowerCase().replace(/[^a-z0-9]/g, '').startsWith(cod)) return 100;
    const desc = semAcento(c.descricao);
    const termos = (c.termos ?? []).map(semAcento);
    const exato = termos.indexOf(t);
    if (exato >= 0) return 90 - exato;   // termo principal (o 1º da lista) vem antes
    if (termos.some((x) => x.startsWith(t))) return 80;
    if (termos.some((x) => x.includes(t))) return 70;
    if (desc.includes(t)) return 60;
    const tudo = desc + ' ' + termos.join(' ');
    if (partes.every((p) => tudo.includes(p))) return 40;
    return 0;
  };
  return lista.map((c, i) => ({ c, n: pontua(c), i })).filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n || a.i - b.i).slice(0, max).map((x) => x.c);
}

/** Texto de busca de cada apresentação: marca + laboratório ("cozaar organon", " ems"). */
const textoOpcoes = (m: Medicamento) => (m.opcoes ?? []).map((o) => semAcento(`${o.marca} ${o.laboratorio}`)).join(' | ');

/**
 * Busca de remédio pelo princípio ativo, pelo nome comercial OU pelo laboratório, sem acento e por partes
 * ("losar", "cozaar", "metopro succ", "ems", "losartana medley").
 */
export function buscarMedicamento(lista: Medicamento[], termo: string, max = 8): Medicamento[] {
  const partes = semAcento(termo).split(/\s+/).filter(Boolean);
  if (!partes.length) return [];
  const pontua = (m: Medicamento) => {
    const p = semAcento(m.principio), c = semAcento(m.comercial), labs = textoOpcoes(m) + ' ' + semAcento(m.laboratorio);
    if (!partes.every((x) => p.includes(x) || c.includes(x) || labs.includes(x))) return -1;
    return (p.startsWith(partes[0]) || c.startsWith(partes[0]) ? 2 : 0) + (m.laboratorio ? 1 : 0);
  };
  return lista.map((m) => [m, pontua(m)] as const).filter(([, n]) => n >= 0).sort((a, b) => b[1] - a[1]).slice(0, max).map(([m]) => m);
}

/** Qual apresentação mostrar já escolhida: a do laboratório/marca digitado; senão a de referência (ou a primeira). */
export function opcaoBuscada(m: Medicamento, termo: string): number {
  const partes = semAcento(termo).split(/\s+/).filter(Boolean);
  const ops = m.opcoes ?? [];
  const i = ops.findIndex((o) => { const t = semAcento(`${o.marca} ${o.laboratorio}`); return partes.some((x) => x.length >= 2 && t.split(/\s+/).some((w) => w.startsWith(x))); });
  return i >= 0 ? i : 0;
}

/** Nome do remédio na receita: princípio + dose + apresentação escolhida ("Losartana potássica 50 mg (Cozaar® · Organon)"). */
export function nomeNaReceita(m: Medicamento, dose: string, op?: { marca: string; laboratorio: string; tipo: string }): string {
  const base = `${m.principio} ${dose}`;
  if (!op) return base;
  return op.marca ? `${base} (${op.marca}® · ${op.laboratorio})` : `${base} (genérico · ${op.laboratorio})`;
}

/** Busca de exame por palavras do nome, sem acento ("eco", "holter", "colesterol"). Não repete os já escolhidos. */
export function buscarExame(lista: ExameCatalogo[], termo: string, escolhidos: string[] = [], max = 8): ExameCatalogo[] {
  const partes = semAcento(termo).split(/\s+/).filter(Boolean);
  if (!partes.length) return [];
  const ja = new Set(escolhidos.map(semAcento));
  return lista
    .filter((e) => !ja.has(semAcento(e.nome)) && partes.every((x) => semAcento(e.nome).includes(x)))
    .sort((a, b) => Number(semAcento(b.nome).startsWith(partes[0])) - Number(semAcento(a.nome).startsWith(partes[0])))
    .slice(0, max);
}
