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

/** Busca de CID por código ("i10", "I48") ou por palavras da descrição, sem acento ("fibrila atrial"). */
export function buscarCid(lista: Cid[], termo: string, max = 8): Cid[] {
  const t = semAcento(termo);
  if (!t) return [];
  const cod = t.replace(/[^a-z0-9]/g, '');
  const partes = t.split(/\s+/);
  const porCodigo = lista.filter((c) => c.codigo.toLowerCase().replace(/[^a-z0-9]/g, '').startsWith(cod));
  const porTexto = lista.filter((c) => !porCodigo.includes(c) && partes.every((p) => semAcento(c.descricao).includes(p)));
  return [...porCodigo, ...porTexto].slice(0, max);
}

/** Busca de remédio pelo princípio ativo OU pelo nome comercial, sem acento e por partes ("losar", "cozaar", "metopro succ"). */
export function buscarMedicamento(lista: Medicamento[], termo: string, max = 8): Medicamento[] {
  const partes = semAcento(termo).split(/\s+/).filter(Boolean);
  if (!partes.length) return [];
  const pontua = (m: Medicamento) => {
    const p = semAcento(m.principio), c = semAcento(m.comercial);
    if (!partes.every((x) => p.includes(x) || c.includes(x))) return -1;
    return (p.startsWith(partes[0]) || c.startsWith(partes[0]) ? 2 : 0) + (m.laboratorio ? 1 : 0);
  };
  return lista.map((m) => [m, pontua(m)] as const).filter(([, n]) => n >= 0).sort((a, b) => b[1] - a[1]).slice(0, max).map(([m]) => m);
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
