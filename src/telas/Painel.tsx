// Painel (BI) — só a médica. Indicadores do período escolhido (dia, semana, mês, trimestre, ano ou personalizado)
// com variação sobre o período anterior — se o período ainda não terminou, compara a parte que já passou com a
// mesma parte do anterior — e gráficos de evolução. Mesmo período e mesmas contas do Financeiro e dos Relatórios.
import { useDados } from '../componentes/Dados';
import { Bloco, TituloPagina } from '../componentes/Comuns';
import { Icone } from '../componentes/Icone';
import { Barras, BarrasAgrupadas, BarrasH, Proporcao } from '../componentes/Graficos';
import { FORMAS } from '../componentes/Receber';
import { SeletorPeriodo, usePeriodo } from '../componentes/SeletorPeriodo';
import { ocupacaoSemana, porForma, receitaPorServico, resumoPeriodo, serieEvolucao, variacao } from '../regras/financeiro';
import { comparacao, dias, nomeEvolucao, rotulo, rotuloCurto, ultimos } from '../regras/periodo';
import { hoje, somaDias } from '../util/datas';
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
  const [p] = usePeriodo();
  // valores: o período inteiro (iguais ao Financeiro e aos Relatórios)
  const a = resumoPeriodo(base, p.de, p.ate);
  // variação: compara partes equivalentes (período em andamento → só até hoje)
  const cmp = comparacao(p, hj);
  const ca = resumoPeriodo(base, cmp.atual.de, cmp.atual.ate);
  const cb = resumoPeriodo(base, cmp.anterior.de, cmp.anterior.ate);
  const serie = serieEvolucao(base, ultimos(p).map((x) => ({ de: x.de, ate: x.ate, rotulo: rotuloCurto(x) + (x.de <= hj && hj < x.ate ? '*' : '') })));
  const formas = porForma(base, p.de, p.ate);
  const servicos = receitaPorServico(base, p.de, p.ate);
  // ocupação: o período escolhido; se for curto (menos de 4 semanas), as 4 semanas que terminam nele
  const ateOc = p.ate < hj ? p.ate : hj;
  const curto = dias(p.de, ateOc) < 27;
  const ocup = ocupacaoSemana(base, curto ? somaDias(ateOc, -27) : p.de, ateOc);
  const emAndamento = serie.some((s) => s.rotulo.endsWith('*'));

  const kpis = [
    { rot: 'Receita', val: moeda(a.recebido), v: variacao(ca.recebido, cb.recebido), bom: 'subir' as const, ic: 'carteira' },
    { rot: 'Despesas', val: moeda(a.despesas), v: variacao(ca.despesas, cb.despesas), bom: 'descer' as const, ic: 'arquivo' },
    { rot: 'Lucro', val: moeda(a.lucro), v: variacao(ca.lucro, cb.lucro), bom: 'subir' as const, ic: 'grafico' },
    { rot: 'Atendimentos', val: String(a.atendidos), v: variacao(ca.atendidos, cb.atendidos), bom: 'subir' as const, ic: 'estetoscopio' },
    { rot: 'Ticket médio', val: moeda(a.ticketMedio), v: variacao(ca.ticketMedio, cb.ticketMedio), bom: 'subir' as const, ic: 'orcamento' },
    { rot: 'Faltas', val: pct(a.taxaFaltas), v: variacao(ca.taxaFaltas, cb.taxaFaltas), bom: 'descer' as const, ic: 'falta' },
  ];

  return (
    <>
      <TituloPagina titulo="Painel" sub={`${rotulo(p)} · ${cmp.parcial ? 'variação até hoje × mesma parte do período anterior' : 'variação × período anterior'}`}>
        <SeletorPeriodo />
      </TituloPagina>

      <div className="contadores c6">
        {kpis.map((k) => <div key={k.rot}><Icone n={k.ic} /><b>{k.val}</b><span>{k.rot} <Var v={k.v} bom={k.bom} /></span></div>)}
      </div>

      <div className="grade-bi">
        <Bloco titulo={<><Icone n="grafico" /> Receita x custo · {nomeEvolucao(p)}</>} className="bi-largo">
          <div className="pad">
            <BarrasAgrupadas series={['Receita', 'Custo']} fmt={moeda} fmtEixo={mil}
              grupos={serie.map((s) => ({ rotulo: s.rotulo, valores: [s.receita, s.despesa] }))} />
            {emAndamento && <p className="nota">* período em andamento: receita recebida até hoje; custo com as despesas lançadas no período.</p>}
          </div>
        </Bloco>
        <Bloco titulo={<><Icone n="calendario" /> Agendamentos · {nomeEvolucao(p)}</>}>
          <div className="pad">
            <Barras fmt={int} destacarUltimo={serie[serie.length - 1].rotulo.endsWith('*')}
              dados={serie.map((s) => ({ rotulo: s.rotulo.replace('*', ''), valor: s.agendados, nota: `${s.atendidos} atendidos` }))} />
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
        <Bloco titulo={<><Icone n="semana" /> Ocupação da agenda por dia da semana</>} extra={<span className="mut peq">{curto ? 'últimas 4 semanas do período' : 'no período'}</span>}>
          <div className="pad"><BarrasH dados={ocup.map((o) => ({ rotulo: o.dia, valor: o.pct }))} fmt={pct} max={100} /></div>
        </Bloco>
      </div>
    </>
  );
}
