// Financeiro (só a médica): caixa do período (dia, semana, mês, trimestre, ano ou personalizado — o mesmo do
// Painel e dos Relatórios) — recebido, despesas, saldo e a receber;
// tabelas de receitas e despesas; lançar despesa e marcar como paga; recebido por forma de pagamento.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CategoriaDespesa, Despesa, FormaPagamento } from '../tipos/modelos';
import { useDados } from '../componentes/Dados';
import { Bloco, BotaoIcone, Contador, FiltroAtivo, Modal, Rolagem, TagStatus, TituloPagina, Vazio } from '../componentes/Comuns';
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

type Vista = 'tudo' | 'receitas' | 'despesas' | 'areceber';
const FORMA_IDS: FormaPagamento[] = ['pix', 'cartao_credito', 'cartao_debito', 'dinheiro'];

export function Financeiro() {
  const { base, acoes } = useDados();
  const nav = useNavigate();
  const hj = hoje();
  const [p] = usePeriodo();
  const [todasRec, setTodasRec] = useState(false);
  const [lancar, setLancar] = useState(false);
  // filtros ligados pelos cards, pelas formas de pagamento e pelas categorias
  const [vista, setVista] = useState<Vista>('tudo');
  const [forma, setForma] = useState<FormaPagamento | null>(null);
  const [cat, setCat] = useState<CategoriaDespesa | null>(null);
  const ver = (v: Vista) => { setVista((x) => (x === v ? 'tudo' : v)); setForma(null); setCat(null); };
  const { de, ate } = p;
  const dt = (d: string) => (de.slice(0, 4) === ate.slice(0, 4) ? br(d).slice(0, 5) : br(d));   // dd/mm (ou dd/mm/aaaa se passar de um ano)
  const r = resumoPeriodo(base, de, ate);
  const rec = recebimentos(base, de, ate).reverse().filter((x) => !forma || x.forma === forma);
  const desp = base.despesas.filter((d) => d.data >= de && d.data <= ate);
  const despVis = desp.filter((d) => !cat || d.categoria === cat);
  const formas = porForma(base, de, ate);
  const pendentes = base.agendamentos
    .filter((a) => a.data >= de && a.data <= ate && a.pagamento?.status === 'pendente' && ['chegou', 'em_atendimento', 'atendido'].includes(a.status))
    .sort((x, y) => y.data.localeCompare(x.data) || y.hora.localeCompare(x.hora));
  const nomeP = (id: string) => base.pacientes.find((p) => p.id === id)?.nome ?? '';
  const nomeS = (id: string) => base.servicos.find((s) => s.id === id)?.curto ?? id;
  const saldo = +(r.recebido - r.despesasPagas).toFixed(2);
  const mostra = (v: Vista) => vista === 'tudo' || vista === v;
  const filtroNome = forma ? FORMAS[forma] : cat ? cat : vista === 'receitas' ? 'receitas' : vista === 'despesas' ? 'despesas' : vista === 'areceber' ? 'a receber' : null;

  return (
    <>
      <TituloPagina titulo="Financeiro" sub={`Caixa · ${rotulo(p)}`}>
        <SeletorPeriodo />
        <BotaoIcone icone="mais" titulo="Lançar despesa" pri onClick={() => setLancar(true)} />
      </TituloPagina>

      <div className="contadores c4">
        <Contador icone="carteira" valor={moeda(r.recebido)} rotulo="recebido no período" sel={vista === 'receitas'} onClick={() => ver('receitas')} titulo="Filtrar: só as receitas recebidas" />
        <Contador icone="arquivo" valor={moeda(r.despesas)} rotulo="despesas do período" sel={vista === 'despesas'} onClick={() => ver('despesas')} titulo="Filtrar: só as despesas" />
        <Contador icone="grafico" valor={moeda(saldo)} rotulo="saldo (recebido − pago)" cls={saldo < 0 ? 'negativo' : ''} onClick={() => nav('/relatorios?tipo=fluxo')} titulo="Abrir o relatório de fluxo de caixa do período" />
        <Contador icone="relogio" valor={moeda(r.aReceber)} rotulo="a receber" cls={r.aReceber ? 'alerta' : ''} sel={vista === 'areceber'} onClick={() => ver('areceber')} titulo="Ver quem falta pagar" />
      </div>
      {filtroNome && <div className="barra"><FiltroAtivo nome={filtroNome} limpar={() => { setVista('tudo'); setForma(null); setCat(null); }} /></div>}

      <div className="grade2 fin">
        <div className="pilha">
          {mostra('areceber') && vista === 'areceber' && (
            <Bloco titulo={<><Icone n="relogio" /> A receber</>} extra={<span className="mut peq">{pendentes.length} pagamento{pendentes.length !== 1 ? 's' : ''} pendente{pendentes.length !== 1 ? 's' : ''}</span>}>
              {pendentes.length === 0 ? <Vazio>Nenhum pagamento pendente no período.</Vazio> : (
                <Rolagem>
                  <table className="tab">
                    <thead><tr><th>Data</th><th>Paciente</th><th>Serviço</th><th>Situação</th><th className="dir">Valor</th><th /></tr></thead>
                    <tbody>
                      {pendentes.map((a) => (
                        <tr key={a.id}><td className="mono">{dt(a.data)}</td><td>{nomeP(a.pacienteId)}</td><td>{nomeS(a.servicoId)}</td><td><TagStatus s={a.status} /></td><td className="dir mono">{moeda(a.pagamento!.valor)}</td>
                          <td className="acoes-linha"><BotaoIcone icone="calendario" titulo="Abrir a agenda do dia" cls="peq" onClick={() => nav('/agenda?data=' + a.data)} /></td></tr>
                      ))}
                    </tbody>
                  </table>
                </Rolagem>
              )}
            </Bloco>
          )}
          {mostra('receitas') && vista !== 'areceber' && (
            <Bloco titulo={<><Icone n="carteira" /> Receitas recebidas</>} extra={<span className="mut peq">{rec.length} pagamentos</span>}>
              {rec.length === 0 ? <Vazio>Nenhum recebimento {forma ? 'nesta forma de pagamento' : 'neste período'}.</Vazio> : (
                <>
                  <Rolagem>
                    <table className="tab">
                      <thead><tr><th>Data</th><th>Paciente</th><th>Serviço</th><th>Forma</th><th className="dir">Valor</th></tr></thead>
                      <tbody>
                        {(todasRec ? rec : rec.slice(0, LIMITE)).map((x) => (
                          <tr key={x.ag.id}><td className="mono">{dt(x.data)}</td><td>{nomeP(x.ag.pacienteId)}</td><td>{nomeS(x.ag.servicoId)}</td><td>{FORMAS[x.forma]}</td><td className="dir mono">{moeda(x.valor)}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </Rolagem>
                  {rec.length > LIMITE && <button type="button" className="ver-mais" onClick={() => setTodasRec(!todasRec)}>{todasRec ? 'mostrar menos' : `ver todos os ${rec.length}`}</button>}
                </>
              )}
            </Bloco>
          )}

          {mostra('despesas') && vista !== 'areceber' && !forma && (
            <Bloco titulo={<><Icone n="arquivo" /> Despesas{cat ? ` · ${cat}` : ''}</>} extra={<span className="mut peq">pagas {moeda(r.despesasPagas)} · a pagar {moeda(r.aPagar)}</span>}>
              {despVis.length === 0 ? <Vazio>Nenhuma despesa neste período.</Vazio> : (
                <Rolagem>
                  <table className="tab">
                    <thead><tr><th>Vencimento</th><th>Descrição</th><th>Categoria</th><th>Situação</th><th className="dir">Valor</th><th /></tr></thead>
                    <tbody>
                      {despVis.map((d) => (
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
                </Rolagem>
              )}
            </Bloco>
          )}
        </div>

        <div className="pilha lado">
          <Bloco titulo={<><Icone n="carteira" /> Recebido por forma de pagamento</>}>
            <div className="pad">
              <Proporcao fmt={moeda} sel={forma ? FORMA_IDS.indexOf(forma) : null}
                aoEscolher={(i) => { const f = FORMA_IDS[i]; setForma((x) => (x === f ? null : f)); setCat(null); setVista('receitas'); }}
                partes={FORMA_IDS.map((f) => ({ nome: FORMAS[f], valor: formas[f] }))} />
            </div>
          </Bloco>
          <Bloco titulo={<><Icone n="lista" /> Despesas por categoria</>}>
            <ul className="lista-cat">
              {CATEGORIAS.map((c) => ({ c, v: desp.filter((d) => d.categoria === c).reduce((t, d) => t + d.valor, 0) })).filter((x) => x.v > 0).sort((a, b) => b.v - a.v)
                .map((x) => <li key={x.c} className={'clic' + (cat === x.c ? ' sel' : '')} title={`Filtrar: ${x.c}`} onClick={() => { setCat((y) => (y === x.c ? null : x.c)); setForma(null); setVista('despesas'); }}><span>{x.c}</span><b className="mono">{moeda(x.v)}</b></li>)}
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
