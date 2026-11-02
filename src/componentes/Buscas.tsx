// Buscas do prontuário: remédio (com marca de referência e laboratório) e exame.
// Mesmo padrão das outras buscas: fundo branco, contorno só com foco, lista abaixo do campo.
import { useState } from 'react';
import type { ExameCatalogo, Medicamento } from '../tipos/modelos';
import { Icone } from './Icone';
import { buscarExame, buscarMedicamento, nomeNaReceita, opcaoBuscada } from '../regras/prontuario';
import medicamentos from '../dados/medicamentos.json';
import exames from '../dados/exames.json';

const MEDS = medicamentos as Medicamento[];
const EXAMES = exames as ExameCatalogo[];

/**
 * Busca de remédio (princípio ativo, marca ou laboratório): mostra as apresentações — referência e genéricos com o
 * laboratório de cada um —, a Dra. escolhe a apresentação e clica na dose. A posologia padrão vem junto (editável depois).
 */
export function MedicamentoBusca({ aoEscolher }: { aoEscolher: (m: Medicamento, dose: string, nome: string) => void }) {
  const [t, setT] = useState('');
  const [aberta, setAberta] = useState(false);
  const [escolhida, setEscolhida] = useState<Record<string, number>>({});   // apresentação escolhida por remédio
  const res = buscarMedicamento(MEDS, t);
  const opDe = (m: Medicamento) => escolhida[m.id] ?? opcaoBuscada(m, t);
  const escolher = (m: Medicamento, dose: string) => { aoEscolher(m, dose, nomeNaReceita(m, dose, m.opcoes?.[opDe(m)])); setT(''); setAberta(false); setEscolhida({}); };
  return (
    <div className="busca-cat">
      <Icone n="busca" />
      <input type="text" value={t} placeholder="Buscar remédio: princípio ativo, marca ou laboratório (ex.: losartana, Selozok, EMS)"
        onChange={(e) => { setT(e.target.value); setAberta(true); }} onFocus={() => setAberta(true)} onBlur={() => setTimeout(() => setAberta(false), 150)}
        onKeyDown={(e) => { if (e.key === 'Enter' && res[0]) { e.preventDefault(); escolher(res[0], res[0].doses[0]); } }} />
      {aberta && t.trim() && (
        <div className="busca-res cat-res">
          {res.length ? res.map((m) => (
            <div key={m.id} className="med-op">
              <div className="med-nome"><b>{m.principio}</b>
                <small>{m.grupo}{m.via !== 'Uso oral' ? ` · ${m.via}` : ''}</small>
              </div>
              {(m.opcoes?.length ?? 0) > 0 ? (
                <div className="med-labs" role="radiogroup" aria-label={`Apresentação de ${m.principio}`}>
                  {m.opcoes!.map((o, i) => (
                    <button type="button" key={i} role="radio" aria-checked={opDe(m) === i} className={opDe(m) === i ? 'sel' : ''}
                      onMouseDown={(e) => { e.preventDefault(); setEscolhida((x) => ({ ...x, [m.id]: i })); }}
                      title={o.tipo === 'referencia' ? 'Medicamento de referência' : 'Medicamento genérico'}>
                      {o.marca ? <>{o.marca}<sup>®</sup></> : 'Genérico'} · {o.laboratorio}{o.tipo === 'referencia' && <em> ref.</em>}
                    </button>
                  ))}
                </div>
              ) : <small className="mut">laboratório não cadastrado</small>}
              <div className="med-doses">
                {m.doses.map((d) => <button type="button" key={d} onMouseDown={(e) => { e.preventDefault(); escolher(m, d); }} title={`Adicionar ${m.principio} ${d}`}>{d}</button>)}
              </div>
            </div>
          )) : <div className="vazio">Nenhum remédio encontrado. Digite à mão na linha da receita.</div>}
          <div className="cat-nota">Base de exemplo · conferir sempre com a bula. Na versão final: tabela oficial ANVISA/CMED.</div>
        </div>
      )}
    </div>
  );
}

/** Busca de exame + lista dos escolhidos (com X para tirar). */
export function ExameBusca({ escolhidos, mudar }: { escolhidos: string[]; mudar: (l: string[]) => void }) {
  const [t, setT] = useState('');
  const [aberta, setAberta] = useState(false);
  const res = buscarExame(EXAMES, t, escolhidos);
  const add = (nome: string) => { mudar([...escolhidos, nome]); setT(''); };
  return (
    <div className="exame-busca">
      <div className="busca-cat">
        <Icone n="busca" />
        <input type="text" value={t} placeholder="Buscar exame (ex.: eco, holter, colesterol, troponina)"
          onChange={(e) => { setT(e.target.value); setAberta(true); }} onFocus={() => setAberta(true)} onBlur={() => setTimeout(() => setAberta(false), 150)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (res[0]) add(res[0].nome); else if (t.trim()) add(t.trim()); } }} />
        {aberta && t.trim() && (
          <div className="busca-res cat-res">
            {res.map((x) => <button type="button" key={x.nome} onMouseDown={(e) => { e.preventDefault(); add(x.nome); }}><b>{x.nome}</b><small>{x.grupo}</small></button>)}
            {!res.length && <button type="button" onMouseDown={(e) => { e.preventDefault(); add(t.trim()); }}><b>Adicionar “{t.trim()}”</b><small>exame fora da lista</small></button>}
          </div>
        )}
      </div>
      {escolhidos.length > 0 && (
        <div className="escolhidos">
          {escolhidos.map((x) => <span key={x} className="chip-esc">{x}<button type="button" title="Tirar" aria-label={`Tirar ${x}`} onClick={() => mudar(escolhidos.filter((y) => y !== x))}><Icone n="x" /></button></span>)}
        </div>
      )}
    </div>
  );
}
