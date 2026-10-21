// Painel (BI) — só a médica. Indicadores do mês com variação sobre o mês anterior
// (no mês corrente, compara com o MESMO período do mês anterior) e gráficos dos últimos 6 meses.
import { useState } from 'react';
import { useDados } from '../componentes/Dados';
import { Bloco, TituloPagina } from '../componentes/Comuns';
import { Icone } from '../componentes/Icone';
import { Barras, BarrasAgrupadas, BarrasH, Proporcao } from '../componentes/Graficos';
import { FORMAS } from '../componentes/Receber';
import { fimDoMes, mesDe, nomeMesCurto, nomeMesLongo, ocupacaoSemana, porForma, receitaPorServico, resumoMes, serieMensal, somaMes, variacao } from '../regras/financeiro';
import { hoje } from '../util/datas';
import { moeda } from '../util/formato';

const mil = (v: number) => (Math.abs(v) >= 1000 ? `R$ ${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil` : moeda(v));
const int = (v: number) => String(Math.round(v));
const pct = (v: number) => `${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;

/** Variação: seta + %. `bom` diz se subir é bom (receita) ou ruim (despesa, faltas). */
function Var({ v, bom }: { v: number | null; bom: 'subir' | 'descer' }) {
  if (v === null) return <small className="var neutro">sem comparação</small>;
  const melhor = bom === 'subir' ? v >= 0 : v <= 0;
  return <small className={'var ' + (Math.abs(v) < 0.5 ? 'neutro' : melhor ? 'melhor' : 'pior')}>{v > 0 ? '▲' : v < 0 ? '▼' : '='} {pct(Math.abs(v))}</small>;
}

export function Painel() {
  const { base } = useDados();
  const hj = hoje();
  const [mes, setMes] = useState(mesDe(hj));
  const { atual: a, anterior: b, parcial, ate } = resumoMes(base, mes, hj);
  const serie = serieMensal(base, mes, 6, hj);
  const de = `${mes}-01`, fim = parcial ? ate : fimDoMes(mes);
  const formas = porForma(base, de, fim);
  const servicos = receitaPorServico(base, de, fim);
  const ocup = ocupacaoSemana(base, `${somaMes(mes, -2)}-01`, fim);
  const comp = parcial ? `vs. mesmo período de ${nomeMesLongo(somaMes(mes, -1)).split(' ')[0]}` : `vs. ${nomeMesLongo(somaMes(mes, -1)).split(' ')[0]}`;

  const kpis = [
    { rot: 'Receita', val: moeda(a.recebido), v: variacao(a.recebido, b.recebido), bom: 'subir' as const, ic: 'carteira' },
    { rot: 'Despesas', val: moeda(a.despesas), v: variacao(a.despesas, b.despesas), bom: 'descer' as const, ic: 'arquivo' },
    { rot: 'Lucro', val: moeda(a.lucro), v: variacao(a.lucro, b.lucro), bom: 'subir' as const, ic: 'grafico' },
    { rot: 'Atendimentos', val: String(a.atendidos), v: variacao(a.atendidos, b.atendidos), bom: 'subir' as const, ic: 'estetoscopio' },
    { rot: 'Ticket médio', val: moeda(a.ticketMedio), v: variacao(a.ticketMedio, b.ticketMedio), bom: 'subir' as const, ic: 'orcamento' },
    { rot: 'Faltas', val: pct(a.taxaFaltas), v: variacao(a.taxaFaltas, b.taxaFaltas), bom: 'descer' as const, ic: 'falta' },
  ];

  return (
    <>
      <TituloPagina titulo="Painel" sub={`${nomeMesLongo(mes)}${parcial ? ` · até hoje · comparação ${comp}` : ` · ${comp}`}`}>
        <div className="nav-data">
          <button type="button" className="icone-btn" title="Mês anterior" aria-label="Mês anterior" onClick={() => setMes(somaMes(mes, -1))} disabled={mes <= somaMes(mesDe(hj), -11)}><Icone n="esq" /></button>
          <select className="sel-mes" value={mes} onChange={(e) => setMes(e.target.value)} aria-label="Mês" title="Escolher o mês">
            {Array.from({ length: 12 }, (_, i) => somaMes(mesDe(hj), -i)).map((m) => {
              const nome = nomeMesLongo(m);
              return <option key={m} value={m}>{nome[0].toUpperCase() + nome.slice(1)}{m === mesDe(hj) ? ' (atual)' : ''}</option>;
            })}
          </select>
          <button type="button" className="icone-btn" title="Próximo mês" aria-label="Próximo mês" onClick={() => setMes(somaMes(mes, 1))} disabled={mes >= mesDe(hj)}><Icone n="dir" /></button>
        </div>
      </TituloPagina>

      <div className="contadores c6">
        {kpis.map((k) => <div key={k.rot}><Icone n={k.ic} /><b>{k.val}</b><span>{k.rot} <Var v={k.v} bom={k.bom} /></span></div>)}
      </div>

      <div className="grade-bi">
        <Bloco titulo={<><Icone n="grafico" /> Receita x custo · últimos 6 meses</>} className="bi-largo">
          <div className="pad">
            <BarrasAgrupadas series={['Receita', 'Custo']} fmt={moeda} fmtEixo={mil}
              grupos={serie.map((s) => ({ rotulo: nomeMesCurto(s.mes) + (s.mes === mesDe(hj) ? '*' : ''), valores: [s.receita, s.despesa] }))} />
            {serie.some((s) => s.mes === mesDe(hj)) && <p className="nota">* mês em andamento: receita até hoje; custo com as despesas já lançadas do mês.</p>}
          </div>
        </Bloco>
        <Bloco titulo={<><Icone n="calendario" /> Agendamentos por mês</>}>
          <div className="pad">
            <Barras fmt={int} destacarUltimo={serie[serie.length - 1].mes === mesDe(hj)}
              dados={serie.map((s) => ({ rotulo: nomeMesCurto(s.mes), valor: s.agendados, nota: `${s.atendidos} atendidos` }))} />
          </div>
        </Bloco>
        <Bloco titulo={<><Icone n="carteira" /> Formas de pagamento</>}>
          <div className="pad">
            <Proporcao fmt={moeda} partes={[
              { nome: FORMAS.pix, valor: formas.pix }, { nome: FORMAS.cartao_credito, valor: formas.cartao_credito },
              { nome: FORMAS.cartao_debito, valor: formas.cartao_debito }, { nome: FORMAS.dinheiro, valor: formas.dinheiro },
            ]} />
          </div>
        </Bloco>
        <Bloco titulo={<><Icone n="estetoscopio" /> Receita por serviço</>}>
          <div className="pad"><BarrasH dados={servicos.map((s) => ({ rotulo: s.nome, valor: s.valor }))} fmt={moeda} /></div>
        </Bloco>
        <Bloco titulo={<><Icone n="semana" /> Ocupação da agenda por dia da semana</>} extra={<span className="mut peq">últimos 3 meses</span>}>
          <div className="pad"><BarrasH dados={ocup.map((o) => ({ rotulo: o.dia, valor: o.pct }))} fmt={pct} max={100} /></div>
        </Bloco>
      </div>
    </>
  );
}
