// Gráficos simples em HTML/CSS (sem biblioteca externa). Cada barra mostra o valor ao passar o mouse (data-tip).
// Cores: paleta validada para daltonismo (tema claro e escuro) em estilos/gestao.css (--s1 … --s4).
import type { ReactNode } from 'react';

type Fmt = (v: number) => string;
const escala = (max: number) => {
  if (max <= 0) return 1;
  const pot = 10 ** Math.floor(Math.log10(max));
  const passo = [1, 2, 2.5, 5, 10].map((m) => m * pot).find((p) => max / p <= 4) ?? pot * 10;
  return Math.ceil(max / passo) * passo;
};

function Eixo({ topo, fmt }: { topo: number; fmt: Fmt }) {
  return (
    <div className="gr-eixo" aria-hidden="true">
      {[1, 0.5, 0].map((f) => <span key={f} style={{ bottom: `${f * 100}%` }}>{fmt(topo * f)}</span>)}
    </div>
  );
}

export function Legenda({ itens }: { itens: { nome: string; s: number }[] }) {
  return <div className="gr-leg">{itens.map((i) => <span key={i.nome}><i className={'s' + i.s} />{i.nome}</span>)}</div>;
}

/** Barras agrupadas (ex.: receita x custo por mês). Uma série por cor, legenda sempre visível. */
export function BarrasAgrupadas({ grupos, series, fmt, fmtEixo }: {
  grupos: { rotulo: string; valores: number[] }[]; series: string[]; fmt: Fmt; fmtEixo?: Fmt;
}) {
  const topo = escala(Math.max(0, ...grupos.flatMap((g) => g.valores)));
  return (
    <figure className="gr">
      <Legenda itens={series.map((nome, i) => ({ nome, s: i + 1 }))} />
      <div className="gr-area">
        <Eixo topo={topo} fmt={fmtEixo ?? fmt} />
        <div className="gr-plot">
          {grupos.map((g) => (
            <div key={g.rotulo} className="gr-grupo">
              <div className="gr-barras">
                {g.valores.map((v, i) => <div key={i} className={'gr-barra s' + (i + 1)} style={{ height: `${(v / topo) * 100}%` }} data-tip={`${series[i]} · ${g.rotulo}: ${fmt(v)}`} />)}
              </div>
              <span className="gr-rot">{g.rotulo}</span>
            </div>
          ))}
        </div>
      </div>
    </figure>
  );
}

/** Barras verticais de uma série só (o título do bloco diz o que é; sem legenda). */
export function Barras({ dados, fmt, destacarUltimo }: { dados: { rotulo: string; valor: number; nota?: string }[]; fmt: Fmt; destacarUltimo?: boolean }) {
  const topo = escala(Math.max(0, ...dados.map((d) => d.valor)));
  return (
    <figure className="gr">
      <div className="gr-area">
        <Eixo topo={topo} fmt={fmt} />
        <div className="gr-plot">
          {dados.map((d, i) => (
            <div key={d.rotulo} className="gr-grupo">
              <div className="gr-barras">
                <div className={'gr-barra s1' + (destacarUltimo && i === dados.length - 1 ? ' parcial' : '')} style={{ height: `${(d.valor / topo) * 100}%` }} data-tip={`${d.rotulo}: ${fmt(d.valor)}${d.nota ? ' · ' + d.nota : ''}`}>
                  <b className="gr-val">{fmt(d.valor)}</b>
                </div>
              </div>
              <span className="gr-rot">{d.rotulo}</span>
            </div>
          ))}
        </div>
      </div>
    </figure>
  );
}

/** Barras horizontais com valor no fim (ex.: receita por serviço, ocupação por dia). */
export function BarrasH({ dados, fmt, max }: { dados: { rotulo: string; valor: number }[]; fmt: Fmt; max?: number }) {
  const topo = max ?? Math.max(1, ...dados.map((d) => d.valor));
  return (
    <figure className="gr-h">
      {dados.map((d) => (
        <div key={d.rotulo} className="gr-h-linha" data-tip={`${d.rotulo}: ${fmt(d.valor)}`}>
          <span className="gr-h-rot">{d.rotulo}</span>
          <div className="gr-h-trilho"><div className="gr-h-barra s1" style={{ width: `${(d.valor / topo) * 100}%` }} /></div>
          <span className="gr-h-val mono">{fmt(d.valor)}</span>
        </div>
      ))}
    </figure>
  );
}

/** Proporção (barra 100% empilhada) com legenda que mostra valor e %. */
export function Proporcao({ partes, fmt, rodape }: { partes: { nome: string; valor: number }[]; fmt: Fmt; rodape?: ReactNode }) {
  const total = partes.reduce((t, p) => t + p.valor, 0) || 1;
  return (
    <figure className="gr-prop">
      <div className="gr-prop-barra">
        {partes.map((p, i) => p.valor > 0 && <div key={p.nome} className={'s' + (i + 1)} style={{ width: `${(p.valor / total) * 100}%` }} data-tip={`${p.nome}: ${fmt(p.valor)} (${Math.round((p.valor / total) * 100)}%)`} />)}
      </div>
      <ul className="gr-prop-leg">
        {partes.map((p, i) => (
          <li key={p.nome}><i className={'s' + (i + 1)} /><span>{p.nome}</span><b className="mono">{fmt(p.valor)}</b><small>{Math.round((p.valor / total) * 100)}%</small></li>
        ))}
      </ul>
      {rodape}
    </figure>
  );
}
