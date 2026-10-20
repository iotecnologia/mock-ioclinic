// Calendário do mês com a disponibilidade de cada dia (bolinha verde = tem horário livre).
import { useState } from 'react';
import { deIso, iso, nomeMes } from '../util/datas';
import { Icone } from './Icone';

export interface InfoDia { aberto: boolean; livres: number; motivo?: string }

export function CalendarioMes({ selecionado, aoEscolher, info, minimo }: {
  selecionado: string; aoEscolher: (d: string) => void; info: (d: string) => InfoDia; minimo?: string;
}) {
  const [ref, setRef] = useState(() => { const d = deIso(selecionado); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const ano = ref.getFullYear(), mes = ref.getMonth();
  const inicio = new Date(ano, mes, 1).getDay();
  const dias = new Date(ano, mes + 1, 0).getDate();
  const celulas: (string | null)[] = [...Array(inicio).fill(null), ...Array.from({ length: dias }, (_, i) => iso(new Date(ano, mes, i + 1)))];
  const hojeIso = iso(new Date());
  return (
    <div className="cal">
      <div className="cal-cab">
        <b>{nomeMes(mes)[0].toUpperCase() + nomeMes(mes).slice(1)} {ano}</b>
        <div>
          <button type="button" className="icone-btn" title="Mês anterior" aria-label="Mês anterior" onClick={() => setRef(new Date(ano, mes - 1, 1))}><Icone n="esq" /></button>
          <button type="button" className="icone-btn" title="Próximo mês" aria-label="Próximo mês" onClick={() => setRef(new Date(ano, mes + 1, 1))}><Icone n="dir" /></button>
        </div>
      </div>
      <div className="cal-grade">
        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((x, i) => <span key={i} className="cal-sem">{x}</span>)}
        {celulas.map((d, i) => {
          if (!d) return <span key={i} />;
          const inf = info(d);
          const passado = minimo ? d < minimo : false;
          const cls = ['cal-dia', d === selecionado && 'sel', d === hojeIso && 'hoje', !inf.aberto && 'fechado', passado && 'passado'].filter(Boolean).join(' ');
          const dica = !inf.aberto ? inf.motivo : passado ? 'Data passada' : `${inf.livres} horário(s) livre(s)`;
          return (
            <button type="button" key={d} className={cls} title={dica} disabled={passado || (!!minimo && !inf.aberto)} onClick={() => aoEscolher(d)}>
              {Number(d.slice(8))}
              {inf.aberto && !passado && d >= hojeIso && <i className={inf.livres > 0 ? 'livre' : 'cheio'} />}
            </button>
          );
        })}
      </div>
      <div className="cal-leg"><span><i className="livre" /> tem horário</span><span><i className="cheio" /> lotado</span><span><i className="fech" /> fechado</span></div>
    </div>
  );
}
