// Orçamento particular (mesmo padrão do Orçamento do Analiza/RCC):
// 1 Serviços → 2 Paciente (opcional) → 3 Forma de pagamento. Cartão parcelado ou PIX/dinheiro com desconto.
// Saídas: imprimir (preto no branco), WhatsApp, copiar texto e, com paciente escolhido, agendar.
import { useState } from 'react';
import type { Paciente } from '../tipos/modelos';
import { useDados } from '../componentes/Dados';
import { useSessao } from '../acesso/Sessao';
import { Bloco, BotaoIcone, TituloPagina, Vazio } from '../componentes/Comuns';
import { Icone } from '../componentes/Icone';
import { Folha, Imprimir } from '../componentes/Folha';
import { NovoAgendamento } from '../componentes/NovoAgendamento';
import { calcular, limiteDesconto, type FormaOrc, type ItemOrc } from '../regras/orcamento';
import { buscarPacientes, idade } from '../regras/paciente';
import { br, hoje, somaDias } from '../util/datas';
import { linkWhats, moeda, semAcento } from '../util/formato';

export function Orcamento() {
  const { base } = useDados();
  const { usuario } = useSessao();
  const hj = hoje();
  const c = base.clinica;
  const [itens, setItens] = useState<ItemOrc[]>([]);
  const [busca, setBusca] = useState('');
  const [pac, setPac] = useState<Paciente | null>(null);
  const [nomeLivre, setNomeLivre] = useState('');
  const [buscaPac, setBuscaPac] = useState('');
  const [forma, setForma] = useState<FormaOrc>('cartao');
  const [extra, setExtra] = useState(0);
  const [imp, setImp] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [agendar, setAgendar] = useState(false);
  const lim = limiteDesconto(usuario!.perfil, c);
  const r = calcular(itens, base.servicos, forma, extra, c);
  const rCartao = calcular(itens, base.servicos, 'cartao', extra, c);
  const rPix = calcular(itens, base.servicos, 'pix', extra, c);
  const validade = somaDias(hj, c.validadeOrcamentoDias);
  const nome = pac?.nome ?? nomeLivre.trim();
  const pagos = base.servicos.filter((s) => s.valor > 0);
  const sugest = busca.trim() ? pagos.filter((s) => semAcento(s.nome).includes(semAcento(busca))) : pagos;
  const add = (id: string) => { setItens((l) => (l.some((i) => i.servicoId === id) ? l.map((i) => (i.servicoId === id ? { ...i, qtd: i.qtd + 1 } : i)) : [...l, { servicoId: id, qtd: 1 }])); setBusca(''); };
  const qtd = (id: string, d: number) => setItens((l) => l.map((i) => (i.servicoId === id ? { ...i, qtd: i.qtd + d } : i)).filter((i) => i.qtd > 0));
  const limpar = () => { setItens([]); setPac(null); setNomeLivre(''); setExtra(0); setForma('cartao'); };
  const resPac = buscaPac.trim().length >= 2 ? buscarPacientes(base.pacientes, buscaPac).slice(0, 5) : [];

  const texto = [
    `*Orçamento · ${c.medica}* (${c.especialidade})`,
    nome ? `Paciente: ${nome}` : '',
    '',
    ...r.linhas.map((l) => `• ${l.s.nome}${l.qtd > 1 ? ` (x${l.qtd})` : ''}: ${moeda(l.valor)}`),
    '',
    r.descExtra ? `Desconto: -${moeda(r.descExtra)}` : '',
    `*Cartão:* ${moeda(rCartao.total)} em até ${rCartao.vezes}x de ${moeda(rCartao.parcela)}`,
    `*PIX ou dinheiro:* ${moeda(rPix.total)} (${c.descontoPix}% de desconto)`,
    `Válido até ${br(validade)}.`,
  ].filter((x, i, l) => x !== '' || (i > 0 && l[i - 1] !== '')).join('\n').trim();
  const copiar = async () => { try { await navigator.clipboard.writeText(texto.replace(/\*/g, '')); setCopiado(true); setTimeout(() => setCopiado(false), 1800); } catch { /* sem permissão */ } };
  const vazio = itens.length === 0;

  const folha = (
    <Folha clinica={c} titulo="Orçamento" data={hj} assinatura={false} paciente={nome ? { nome, cpf: pac?.cpf } : undefined}>
      <table>
        <thead><tr><th>Serviço</th><th className="n">Qtd</th><th className="n">Valor</th></tr></thead>
        <tbody>
          {r.linhas.map((l) => <tr key={l.s.id}><td>{l.s.nome}</td><td className="n">{l.qtd}</td><td className="n">{moeda(l.valor)}</td></tr>)}
          {r.descExtra > 0 && <tr><td>Desconto</td><td /><td className="n">-{moeda(r.descExtra)}</td></tr>}
        </tbody>
      </table>
      <p>Cartão: {moeda(rCartao.total)} em até {rCartao.vezes}x de {moeda(rCartao.parcela)}.</p>
      <p>PIX ou dinheiro: {moeda(rPix.total)} ({c.descontoPix}% de desconto).</p>
      <p className="fl-nota">Orçamento válido até {br(validade)}. Valores para atendimento particular.</p>
    </Folha>
  );

  return (
    <>
      <TituloPagina titulo="Orçamento" sub="Escolha os serviços. O sistema calcula cartão e PIX ao mesmo tempo.">
        <BotaoIcone icone="limpar" titulo="Limpar orçamento" onClick={limpar} disabled={vazio && !nome} />
        <BotaoIcone icone="imprimir" titulo="Imprimir orçamento" onClick={() => setImp(true)} disabled={vazio} />
        <a className={'btn2 ic zap' + (vazio || !pac ? ' desab' : '')} href={vazio || !pac ? undefined : linkWhats(pac.telefone, texto)} target="_blank" rel="noreferrer"
          title={pac ? 'Enviar pelo WhatsApp do paciente' : 'Escolha um paciente cadastrado para enviar pelo WhatsApp'} aria-label="Enviar pelo WhatsApp" aria-disabled={vazio || !pac}><Icone n="zap" /></a>
        <BotaoIcone icone={copiado ? 'check' : 'copiar'} titulo={copiado ? 'Copiado!' : 'Copiar texto do orçamento'} onClick={copiar} disabled={vazio} />
        <BotaoIcone icone="calendario" titulo={pac ? 'Agendar para este paciente' : 'Escolha um paciente cadastrado para agendar'} pri onClick={() => setAgendar(true)} disabled={vazio || !pac} />
      </TituloPagina>

      <div className="grade2 orc">
        <div className="pilha">
          <Bloco titulo={<><span className="passo">1</span> Serviços</>}>
            <div className="pad">
              <div className="f-busca"><Icone n="busca" /><input type="text" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Digite o serviço… ex.: eco, holter" aria-label="Buscar serviço" /></div>
              <div className="sug-serv">
                {sugest.map((s) => <button type="button" key={s.id} onClick={() => add(s.id)}><Icone n="mais" /> {s.curto}<small>{moeda(s.valor)}</small></button>)}
              </div>
            </div>
            {vazio ? <Vazio>Nenhum serviço ainda. Clique nos serviços acima.</Vazio> : (
              <table className="tab">
                <thead><tr><th>Serviço</th><th>Duração</th><th>Qtd</th><th className="dir">Valor</th></tr></thead>
                <tbody>
                  {r.linhas.map((l) => (
                    <tr key={l.s.id}>
                      <td>{l.s.nome}</td>
                      <td className="mut">{l.s.duracaoMin} min</td>
                      <td><div className="qtd"><button type="button" className="icone-btn" title="Menos" aria-label="Menos" onClick={() => qtd(l.s.id, -1)}><Icone n="menos" /></button><span className="mono">{l.qtd}</span><button type="button" className="icone-btn" title="Mais" aria-label="Mais" onClick={() => qtd(l.s.id, 1)}><Icone n="mais" /></button></div></td>
                      <td className="dir mono">{moeda(l.valor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Bloco>

          <Bloco titulo={<><span className="passo">2</span> Paciente <small className="mut">opcional · aparece no orçamento impresso e no WhatsApp</small></>}>
            <div className="pad">
              {pac ? (
                <div className="escolhido"><Icone n="medico" /> {pac.nome} <span className="mut">· {idade(pac.nascimento, hj)} anos · {pac.telefone}</span>
                  <button type="button" className="icone-btn" title="Trocar paciente" aria-label="Trocar paciente" onClick={() => setPac(null)}><Icone n="x" /></button></div>
              ) : (
                <div className="g2">
                  <div className="rel">
                    <div className="f-busca"><Icone n="busca" /><input type="text" value={buscaPac} onChange={(e) => setBuscaPac(e.target.value)} placeholder="Paciente cadastrado: nome, CPF ou telefone" aria-label="Buscar paciente" /></div>
                    {resPac.length > 0 && <div className="busca-res">{resPac.map((p) => <button type="button" key={p.id} onClick={() => { setPac(p); setBuscaPac(''); setNomeLivre(''); }}><b>{p.nome}</b><small>{idade(p.nascimento, hj)} anos · {p.telefone}</small></button>)}</div>}
                  </div>
                  <input type="text" value={nomeLivre} onChange={(e) => setNomeLivre(e.target.value)} placeholder="Ou só o nome (paciente novo)" aria-label="Nome do paciente" />
                </div>
              )}
            </div>
          </Bloco>
        </div>

        <Bloco titulo={<><span className="passo">3</span> Forma de pagamento</>}>
          <div className="formas">
            <button type="button" className={'forma' + (forma === 'cartao' ? ' sel' : '')} onClick={() => setForma('cartao')}>
              <span className="radio" /><div><span>Cartão</span><b>{moeda(rCartao.total)}</b><small>em até {rCartao.vezes}x de {moeda(rCartao.parcela)}</small></div>
            </button>
            <button type="button" className={'forma' + (forma === 'pix' ? ' sel' : '')} onClick={() => setForma('pix')}>
              <span className="radio" /><div><span>PIX ou dinheiro</span><b>{moeda(rPix.total)}</b><small className="verde">{c.descontoPix}% de desconto</small></div>
            </button>
          </div>
          <div className="desc-extra">
            <span>Desconto extra</span>
            <input type="number" min={0} max={lim} value={extra} onChange={(e) => setExtra(Math.min(lim, Math.max(0, Number(e.target.value))))} aria-label="Desconto extra em porcentagem" />
            <span>%</span><small className="mut">{lim >= 100 ? 'sem limite' : `até ${lim}%`}</small>
          </div>
          <div className="total-orc">
            <div><span>Total</span><b className="mono">{moeda(r.total)}</b></div>
            <small>{vazio ? 'Adicione serviços para calcular' : forma === 'cartao' ? `em até ${r.vezes}x de ${moeda(r.parcela)}` : `à vista · economia de ${moeda(r.descPix + r.descExtra)}`}</small>
            <div className="valid"><Icone n="calendario" /> Válido por {c.validadeOrcamentoDias} dias · até {br(validade)}</div>
          </div>
          <div className="regra-pg">
            <b>Regra de pagamento da clínica</b>
            <div>{c.parcelas.map((p, i) => <span key={i}>{p.ate === null ? `Acima de ${moeda(c.parcelas[i - 1]?.ate ?? 0)}` : i === 0 ? `Até ${moeda(p.ate)}` : `${moeda(c.parcelas[i - 1].ate ?? 0)} a ${moeda(p.ate)}`}: até {p.vezes}x</span>)}<span>PIX/dinheiro: {c.descontoPix}% off</span></div>
            <small className="mut">Valores ilustrativos do mock — ajustar em dados/servicos.json e dados/clinica.json.</small>
          </div>
        </Bloco>
      </div>

      {imp && <Imprimir aoTerminar={() => setImp(false)}>{folha}</Imprimir>}
      {agendar && pac && <NovoAgendamento pacienteId={pac.id} servicoId={itens[0]?.servicoId} fechar={() => setAgendar(false)} />}
    </>
  );
}
