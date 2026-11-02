// Financeiro (só a médica): caixa do período (dia, semana, mês, trimestre, ano ou personalizado — o mesmo do
// Painel e dos Relatórios) — recebido, despesas, saldo e a receber;
// tabelas de receitas e despesas; lançar despesa e marcar como paga; recebido por forma de pagamento.
import { useState } from 'react';
import type { CategoriaDespesa, Despesa } from '../tipos/modelos';
import { useDados } from '../componentes/Dados';
import { Bloco, BotaoIcone, Modal, TituloPagina, Vazio } from '../componentes/Comuns';
import { Icone } from '../componentes/Icone';
import { Proporcao } from '../componentes/Graficos';
import { FORMAS } from '../componentes/Receber';
import { SeletorPeriodo, usePeriodo } from '../componentes/SeletorPeriodo';
import { porForma, recebimentos, resumoPeriodo } from '../regras/financeiro';
import { rotulo } from '../regras/periodo';
import { br, hoje } from '../util/datas';
import { moeda } from '../util/formato';

export const CATEGORIAS: CategoriaDespesa[] = ['Aluguel e condomínio', 'Pessoal', 'Contas de consumo', 'Serviços', 'Material e insumos', 'Equipamentos', 'Impostos', 'Marketing', 'Outros'];
const LIMITE = 12;

export function Financeiro() {
  const { base, acoes } = useDados();
  const hj = hoje();
  const [p] = usePeriodo();
  const [todasRec, setTodasRec] = useState(false);
  const [lancar, setLancar] = useState(false);
  const { de, ate } = p;
  const dt = (d: string) => (de.slice(0, 4) === ate.slice(0, 4) ? br(d).slice(0, 5) : br(d));   // dd/mm (ou dd/mm/aaaa se passar de um ano)
  const r = resumoPeriodo(base, de, ate);
  const rec = recebimentos(base, de, ate).reverse();
  const desp = base.despesas.filter((d) => d.data >= de && d.data <= ate);
  const formas = porForma(base, de, ate);
  const nomeP = (id: string) => base.pacientes.find((p) => p.id === id)?.nome ?? '';
  const nomeS = (id: string) => base.servicos.find((s) => s.id === id)?.curto ?? id;
  const saldo = +(r.recebido - r.despesasPagas).toFixed(2);

  return (
    <>
      <TituloPagina titulo="Financeiro" sub={`Caixa · ${rotulo(p)}`}>
        <SeletorPeriodo />
        <BotaoIcone icone="mais" titulo="Lançar despesa" pri onClick={() => setLancar(true)} />
      </TituloPagina>

      <div className="contadores c4">
        <div><Icone n="carteira" /><b>{moeda(r.recebido)}</b><span>recebido no período</span></div>
        <div><Icone n="arquivo" /><b>{moeda(r.despesas)}</b><span>despesas do período</span></div>
        <div className={saldo < 0 ? 'negativo' : ''}><Icone n="grafico" /><b>{moeda(saldo)}</b><span>saldo (recebido − pago)</span></div>
        <div className={r.aReceber ? 'alerta' : ''}><Icone n="relogio" /><b>{moeda(r.aReceber)}</b><span>a receber</span></div>
      </div>

      <div className="grade2">
        <div className="pilha">
          <Bloco titulo={<><Icone n="carteira" /> Receitas recebidas</>} extra={<span className="mut peq">{rec.length} pagamentos</span>}>
            {rec.length === 0 ? <Vazio>Nenhum recebimento neste período.</Vazio> : (
              <>
                <table className="tab">
                  <thead><tr><th>Data</th><th>Paciente</th><th>Serviço</th><th>Forma</th><th className="dir">Valor</th></tr></thead>
                  <tbody>
                    {(todasRec ? rec : rec.slice(0, LIMITE)).map((x) => (
                      <tr key={x.ag.id}><td className="mono">{dt(x.data)}</td><td>{nomeP(x.ag.pacienteId)}</td><td>{nomeS(x.ag.servicoId)}</td><td>{FORMAS[x.forma]}</td><td className="dir mono">{moeda(x.valor)}</td></tr>
                    ))}
                  </tbody>
                </table>
                {rec.length > LIMITE && <button type="button" className="ver-mais" onClick={() => setTodasRec(!todasRec)}>{todasRec ? 'mostrar menos' : `ver todos os ${rec.length}`}</button>}
              </>
            )}
          </Bloco>

          <Bloco titulo={<><Icone n="arquivo" /> Despesas</>} extra={<span className="mut peq">pagas {moeda(r.despesasPagas)} · a pagar {moeda(r.aPagar)}</span>}>
            {desp.length === 0 ? <Vazio>Nenhuma despesa neste período.</Vazio> : (
              <table className="tab">
                <thead><tr><th>Vencimento</th><th>Descrição</th><th>Categoria</th><th>Situação</th><th className="dir">Valor</th><th /></tr></thead>
                <tbody>
                  {desp.map((d) => (
                    <tr key={d.id}>
                      <td className="mono">{dt(d.data)}</td><td>{d.descricao}</td><td className="mut">{d.categoria}</td>
                      <td>{d.status === 'paga' ? <span className="tag t-ok">paga</span> : <span className={'tag ' + (d.data < hj ? 't-no' : 't-at')}>{d.data < hj ? 'vencida' : 'a pagar'}</span>}</td>
                      <td className="dir mono">{moeda(d.valor)}</td>
                      <td className="acoes-linha">
                        {d.status === 'a_pagar' && <BotaoIcone icone="check" titulo="Marcar como paga" cls="peq verde" onClick={() => acoes.pagarDespesa(d.id)} />}
                        <BotaoIcone icone="x" titulo="Excluir lançamento" cls="peq" onClick={() => { if (confirm(`Excluir "${d.descricao}" (${moeda(d.valor)})?`)) acoes.excluirDespesa(d.id); }} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Bloco>
        </div>

        <div className="pilha">
          <Bloco titulo={<><Icone n="carteira" /> Recebido por forma de pagamento</>}>
            <div className="pad">
              <Proporcao fmt={moeda} partes={[
                { nome: FORMAS.pix, valor: formas.pix }, { nome: FORMAS.cartao_credito, valor: formas.cartao_credito },
                { nome: FORMAS.cartao_debito, valor: formas.cartao_debito }, { nome: FORMAS.dinheiro, valor: formas.dinheiro },
              ]} />
            </div>
          </Bloco>
          <Bloco titulo={<><Icone n="lista" /> Despesas por categoria</>}>
            <ul className="lista-cat">
              {CATEGORIAS.map((c) => ({ c, v: desp.filter((d) => d.categoria === c).reduce((t, d) => t + d.valor, 0) })).filter((x) => x.v > 0).sort((a, b) => b.v - a.v)
                .map((x) => <li key={x.c}><span>{x.c}</span><b className="mono">{moeda(x.v)}</b></li>)}
            </ul>
          </Bloco>
        </div>
      </div>
      {lancar && <LancarDespesa dataPadrao={de <= hj && hj <= ate ? hj : de} fechar={() => setLancar(false)} />}
    </>
  );
}

function LancarDespesa({ dataPadrao, fechar }: { dataPadrao: string; fechar: () => void }) {
  const { acoes } = useDados();
  const hj = hoje();
  const [d, setD] = useState({ descricao: '', categoria: 'Outros' as CategoriaDespesa, valor: '', data: dataPadrao, paga: false });
  const [erro, setErro] = useState('');
  const salvar = () => {
    const valor = Number(d.valor.replace(/\./g, '').replace(',', '.'));
    if (!d.descricao.trim()) return setErro('Informe a descrição.');
    if (!(valor > 0)) return setErro('Informe um valor maior que zero.');
    if (!d.data) return setErro('Informe o vencimento.');
    const nova: Omit<Despesa, 'id'> = { descricao: d.descricao.trim(), categoria: d.categoria, valor: +valor.toFixed(2), data: d.data, status: d.paga ? 'paga' : 'a_pagar', pagaEm: d.paga ? hj : undefined };
    acoes.lancarDespesa(nova);
    fechar();
  };
  return (
    <Modal titulo="Lançar despesa" fechar={fechar}>
      <div className="form-desp">
        <label>Descrição *<input autoFocus value={d.descricao} onChange={(e) => setD({ ...d, descricao: e.target.value })} placeholder="Ex.: conta de energia de outubro" /></label>
        <div className="g2">
          <label>Categoria<select value={d.categoria} onChange={(e) => setD({ ...d, categoria: e.target.value as CategoriaDespesa })}>{CATEGORIAS.map((c) => <option key={c}>{c}</option>)}</select></label>
          <label>Valor (R$) *<input inputMode="decimal" value={d.valor} onChange={(e) => setD({ ...d, valor: e.target.value.replace(/[^\d,.]/g, '') })} placeholder="0,00" /></label>
        </div>
        <div className="g2">
          <label>Vencimento *<input type="date" value={d.data} onChange={(e) => setD({ ...d, data: e.target.value })} /></label>
          <label className="chk-linha meio"><input type="checkbox" checked={d.paga} onChange={(e) => setD({ ...d, paga: e.target.checked })} /><span>Já está paga</span></label>
        </div>
        {erro && <div className="aviso"><Icone n="alerta" /> {erro}</div>}
        <div className="rodape-modal">
          <button type="button" className="btn2" onClick={fechar}>Voltar</button>
          <button type="button" className="btn2 pri" onClick={salvar}><Icone n="salvar" /> Lançar</button>
        </div>
      </div>
    </Modal>
  );
}
