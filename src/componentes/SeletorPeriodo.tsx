// Seletor de período compartilhado: Painel, Financeiro e Relatórios mostram SEMPRE o mesmo período.
// Escolheu "semana passada" no Financeiro → o Painel e os Relatórios abrem na mesma semana.
// Fica guardado só nesta aba do navegador (sessionStorage); ao entrar de novo, volta para o mês atual.
import { useSyncExternalStore } from 'react';
import { Icone } from './Icone';
import { ESCALAS, mover, periodoDe, periodoPadrao, rotulo, type Escala, type Periodo } from '../regras/periodo';
import { hoje } from '../util/datas';

const CHAVE = 'ioclinic:periodo';
let atual: Periodo = (() => {
  try { const s = sessionStorage.getItem(CHAVE); if (s) return JSON.parse(s) as Periodo; } catch { /* sem armazenamento */ }
  return periodoPadrao(hoje());
})();
const ouvintes = new Set<() => void>();
function definir(p: Periodo) {
  atual = p;
  try { sessionStorage.setItem(CHAVE, JSON.stringify(p)); } catch { /* sem armazenamento */ }
  ouvintes.forEach((f) => f());
}

/** Período escolhido (o mesmo nas três telas) e a função para trocar. */
export function usePeriodo(): [Periodo, (p: Periodo) => void] {
  const p = useSyncExternalStore((f) => { ouvintes.add(f); return () => ouvintes.delete(f); }, () => atual);
  return [p, definir];
}

export function SeletorPeriodo() {
  const [p, setP] = usePeriodo();
  const hj = hoje();
  const trocarEscala = (e: Escala) => {
    if (e === p.escala) return;
    if (e === 'personalizado') return setP({ escala: e, de: p.de, ate: p.ate });
    // mantém a referência: se hoje está no período atual, usa hoje; senão, o início do período
    setP(periodoDe(e, p.de <= hj && hj <= p.ate ? hj : p.de));
  };
  const prox = mover(p, 1);
  return (
    <div className="seletor-periodo">
      <div className="segmentado peq" role="tablist" aria-label="Escala do período">
        {ESCALAS.map((e) => <button type="button" key={e.id} role="tab" aria-selected={p.escala === e.id} className={p.escala === e.id ? 'sel' : ''} onClick={() => trocarEscala(e.id)}>{e.nome}</button>)}
      </div>
      {p.escala === 'personalizado' ? (
        <div className="per-livre">
          <label className="per">De<input type="date" value={p.de} max={p.ate} onChange={(e) => e.target.value && setP({ ...p, de: e.target.value })} /></label>
          <label className="per">Até<input type="date" value={p.ate} min={p.de} onChange={(e) => e.target.value && setP({ ...p, ate: e.target.value })} /></label>
        </div>
      ) : (
        <div className="nav-data">
          <button type="button" className="icone-btn" title="Período anterior" aria-label="Período anterior" onClick={() => setP(mover(p, -1))}><Icone n="esq" /></button>
          <button type="button" className="per-rot" title="Voltar para o período atual" onClick={() => setP(periodoDe(p.escala as Exclude<Escala, 'personalizado'>, hj))}>{rotulo(p)}</button>
          <button type="button" className="icone-btn" title="Próximo período" aria-label="Próximo período" onClick={() => setP(prox)} disabled={prox.de > hj}><Icone n="dir" /></button>
        </div>
      )}
    </div>
  );
}
