// Consultório · atendimento do paciente (só a médica). O prontuário clínico completo fica no sistema da Dra. (Life Up);
// aqui fica o REGISTRO CURTO do atendimento (CID, observação, exames pedidos e retorno), os documentos com o logo
// da Dra. (atestado, receita, pedido de exames, comparecimento) e os atendimentos/documentos anteriores.
// Alergias, medicamentos e antecedentes NÃO ficam aqui: são do prontuário (Life Up).
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import type { Atendimento, Cid, Documento, TipoDocumento } from '../tipos/modelos';
import { useDados } from '../componentes/Dados';
import { Avatar, Bloco, Modal, TagStatus, Vazio } from '../componentes/Comuns';
import { Icone } from '../componentes/Icone';
import { CidBusca } from '../componentes/CidBusca';
import { ExameBusca } from '../componentes/Buscas';
import { ConteudoDoc, EmitirDocumento } from '../componentes/EmitirDocumento';
import { BaixarPdf, Folha, Imprimir } from '../componentes/Folha';
import { nomeArquivo } from '../util/pdf';
import { NovoAgendamento } from '../componentes/NovoAgendamento';
import { NOME_DOC } from '../regras/documentos';
import { idade } from '../regras/paciente';
import { br, hoje, somaDias } from '../util/datas';

const RETORNOS = [0, 30, 60, 90, 180, 365];
const DOCS: { tipo: TipoDocumento; nome: string; icone: string }[] = [
  { tipo: 'receita', nome: 'Receita', icone: 'lista' },
  { tipo: 'atestado', nome: 'Atestado', icone: 'imprimir' },
  { tipo: 'comparecimento', nome: 'Declaração de comparecimento', icone: 'relogio' },
  { tipo: 'pedido_exames', nome: 'Pedido de exames', icone: 'exame' },
];

/** Botão "Emitir documento ▾": abre a lista dos documentos com o nome escrito (no lugar de 4 ícones soltos). */
function MenuDocumentos({ escolher }: { escolher: (t: TipoDocumento) => void }) {
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => { if (caixa.current && !caixa.current.contains(e.target as Node)) setAberto(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAberto(false); };
    document.addEventListener('mousedown', fora); window.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', fora); window.removeEventListener('keydown', esc); };
  }, [aberto]);
  return (
    <div className="menu-doc" ref={caixa}>
      <button type="button" className="btn2" onClick={() => setAberto(!aberto)} aria-expanded={aberto}><Icone n="arquivo" /> Emitir documento <span className="seta-menu">▾</span></button>
      {aberto && (
        <div className="usu-pop" role="menu">
          {DOCS.map((d) => <button type="button" role="menuitem" key={d.tipo} onClick={() => { setAberto(false); escolher(d.tipo); }}><Icone n={d.icone} /> {d.nome}</button>)}
        </div>
      )}
    </div>
  );
}

type Form = { cid?: Cid; obs: string; exames: string[]; retornoDias: number };

export function ProntuarioPaciente() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { base } = useDados();
  const nav = useNavigate();
  const hj = hoje();
  const p = base.pacientes.find((x) => x.id === id);
  const agId = params.get('ag') ?? base.agendamentos.find((a) => a.pacienteId === id && a.data === hj && a.status !== 'cancelado' && base.servicos.find((s) => s.id === a.servicoId)?.tipo !== 'exame')?.id;
  const ag = base.agendamentos.find((a) => a.id === agId);
  const serv = ag && base.servicos.find((s) => s.id === ag.servicoId);
  const anteriores = base.atendimentos.filter((a) => a.pacienteId === id && a.agendamentoId !== agId).sort((x, y) => y.data.localeCompare(x.data));
  const salvo = base.atendimentos.find((a) => agId && a.agendamentoId === agId);
  const [doc, setDoc] = useState<TipoDocumento | null>(null);
  const [registrar, setRegistrar] = useState(false);
  const [retorno, setRetorno] = useState(false);
  const [verTodas, setVerTodas] = useState(false);
  const [reimp, setReimp] = useState<Documento | null>(null);
  const [evol, setEvol] = useState<Atendimento | null>(null);   // atendimento anterior aberto
  const [finalId, setFinalId] = useState<string | null>(null);
  if (!p) return <Vazio>Paciente não encontrado.</Vazio>;

  const docs = base.documentos.filter((d) => d.pacienteId === p.id).sort((x, y) => y.data.localeCompare(x.data));
  const finalizado: Atendimento | undefined = salvo ?? base.atendimentos.find((a) => a.id === finalId);
  const cidTxt = finalizado?.cid ? `${finalizado.cid} · ${finalizado.cidDescricao}` : undefined;

  return (
    <>
      <div className="ficha-cab bloco cab-atend">
        <Avatar nome={p.nome} grande />
        <div className="fc-info">
          <h1>{p.nome}</h1>
          <div className="fc-linha">
            <span>{idade(p.nascimento, hj)} anos · {p.sexo === 'F' ? 'feminino' : p.sexo === 'M' ? 'masculino' : 'outro'}</span>
            {p.telefone && <span className="mono">{p.telefone}</span>}
          </div>
        </div>
        {ag && serv && <div className="fc-num"><b className="mono">{ag.hora}</b><span>{serv.curto} · {ag.data === hj ? 'hoje' : br(ag.data)}</span></div>}
        {ag && <TagStatus s={ag.status} />}
        <div className="fc-acoes">
          <button type="button" className="btn2" onClick={() => nav('/pacientes/' + p.id)}><Icone n="usuarios" /> Ficha</button>
          <MenuDocumentos escolher={setDoc} />
          {!finalizado && <button type="button" className="btn2 pri" onClick={() => setRegistrar(true)}><Icone n="estetoscopio" /> Registrar atendimento</button>}
          {finalizado?.retornoDias && <button type="button" className="btn2 pri" onClick={() => setRetorno(true)}><Icone n="calendario" /> Agendar retorno</button>}
        </div>
      </div>

      <div className="grade2 pront">
        <Bloco titulo={<><Icone n="estetoscopio" /> {finalizado ? `Atendimento de ${br(finalizado.data)}` : ag && serv ? `Atendimento de hoje · ${serv.nome}` : 'Atendimento sem agendamento'}</>}
          extra={finalizado ? <span className="tag t-ok">finalizado</span> : <span className="tag t-at">a registrar</span>}>
          {finalizado ? (
            <div className="evol-lida">
              <dl>
                <dt>Hipótese diagnóstica</dt><dd>{finalizado.cid ? <><span className="mono">{finalizado.cid}</span> · {finalizado.cidDescricao}</> : <span className="mut">—</span>}</dd>
                <dt>Observação</dt><dd>{finalizado.conduta || <span className="mut">—</span>}</dd>
                <dt>Exames solicitados</dt><dd>{finalizado.examesSolicitados?.length ? finalizado.examesSolicitados.join(' · ') : <span className="mut">nenhum</span>}</dd>
                <dt>Retorno</dt><dd>{finalizado.retornoDias ? `em ${finalizado.retornoDias} dias (${br(somaDias(finalizado.data, finalizado.retornoDias))})` : <span className="mut">sem retorno marcado</span>}</dd>
              </dl>
            </div>
          ) : (
            <div className="a-registrar">
              <p>O atendimento ainda não foi registrado.</p>
              <p className="mut peq">Clique em <b>Registrar atendimento</b> para informar o CID, a observação, os exames pedidos e o retorno. O prontuário completo continua no sistema da Dra.</p>
            </div>
          )}
        </Bloco>

        <div className="pilha">
          <Bloco titulo={<><Icone n="relogio" /> Atendimentos anteriores</>} extra={anteriores.length > 3 && <button type="button" className="lk" onClick={() => setVerTodas(!verTodas)}>{verTodas ? 'ver menos' : `ver todos (${anteriores.length})`}</button>}>
            {anteriores.length === 0 ? <Vazio>Primeiro atendimento do paciente.</Vazio> : (
              <ul className="evols">
                {(verTodas ? anteriores : anteriores.slice(0, 3)).map((a) => (
                  <li key={a.id} className="clic" role="button" tabIndex={0} title="Ver o atendimento" onClick={() => setEvol(a)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setEvol(a)}>
                    <div className="ev-cab"><b className="mono">{br(a.data)}</b>{a.cid && <span>{a.cid} · {a.cidDescricao}</span>}</div>
                    {a.conduta && <p>{a.conduta}</p>}
                  </li>
                ))}
              </ul>
            )}
          </Bloco>
          <Bloco titulo={<><Icone n="arquivo" /> Documentos emitidos</>}>
            {docs.length === 0 ? <Vazio>Nenhum documento emitido.</Vazio> : (
              <ul className="lista-simples docs">
                {docs.slice(0, 6).map((d) => <li key={d.id}><button type="button" onClick={() => setReimp(d)} title="Ver e reimprimir"><Icone n="arquivo" /><span>{NOME_DOC[d.tipo]}<small>{br(d.data)}</small></span><Icone n="imprimir" /></button></li>)}
              </ul>
            )}
          </Bloco>
        </div>
      </div>

      {registrar && <RegistrarAtendimento pacienteId={p.id} agId={agId} fechar={() => setRegistrar(false)} salvo={(novoId) => { setFinalId(novoId); setRegistrar(false); }} />}
      {doc && <EmitirDocumento paciente={p} tipoInicial={doc} cid={cidTxt} exames={finalizado?.examesSolicitados ?? []} hora={ag?.hora} fechar={() => setDoc(null)} />}
      {retorno && finalizado?.retornoDias && <NovoAgendamento pacienteId={p.id} servicoId={finalizado.retornoDias <= 30 ? 'retorno' : 'consulta'} data={somaDias(hj, finalizado.retornoDias)} fechar={() => setRetorno(false)} />}
      {reimp && <Reimprimir d={reimp} fechar={() => setReimp(null)} />}
      {evol && !reimp && <DetalheEvolucao a={evol} docs={docs.filter((d) => d.data === evol.data)} abrirDoc={setReimp} fechar={() => setEvol(null)} />}
    </>
  );
}

/** POP-UP "Registrar atendimento": CID, observação, exames pedidos e retorno. Nada é obrigatório (o clínico fica no Life Up). */
function RegistrarAtendimento({ pacienteId, agId, fechar, salvo }: { pacienteId: string; agId?: string; fechar: () => void; salvo: (id: string) => void }) {
  const { base, acoes } = useDados();
  const [f, setF] = useState<Form>(() => ({ obs: '', exames: [], retornoDias: 30 }));
  const muda = (x: Partial<Form>) => setF((o) => ({ ...o, ...x }));
  const exClinica = base.servicos.filter((s) => s.tipo === 'exame').map((s) => s.nome);
  const finalizar = () => {
    const novo = acoes.finalizarAtendimento({
      agendamentoId: agId ?? 'avulso-' + Date.now(), pacienteId, data: hoje(),
      queixa: '', cid: f.cid?.codigo, cidDescricao: f.cid?.descricao,
      conduta: f.obs.trim(), examesSolicitados: f.exames, retornoDias: f.retornoDias || undefined,
    });
    salvo(novo.id);
  };
  return (
    <Modal titulo="Registrar atendimento" fechar={fechar} largo>
      <div className="form-pac form-atend">
        <section>
          <label>Hipótese diagnóstica (CID-10)<CidBusca valor={f.cid} aoEscolher={(c) => muda({ cid: c })} /></label>
          <label>Observação<textarea rows={3} value={f.obs} onChange={(e) => muda({ obs: e.target.value })} placeholder="Resumo curto do atendimento (o registro clínico completo fica no prontuário)" /></label>
        </section>
        <section>
          <h4>Exames solicitados</h4>
          <div className="chips-sel">
            {exClinica.map((x) => <button type="button" key={x} className={f.exames.includes(x) ? 'sel' : ''} onClick={() => muda({ exames: f.exames.includes(x) ? f.exames.filter((y) => y !== x) : [...f.exames, x] })}>{x}</button>)}
          </div>
          <ExameBusca escolhidos={f.exames.filter((x) => !exClinica.includes(x))} mudar={(l) => muda({ exames: [...f.exames.filter((x) => exClinica.includes(x)), ...l] })} />
          <div className="g g3 linha-ret">
            <label>Retorno<select value={f.retornoDias} onChange={(e) => muda({ retornoDias: Number(e.target.value) })}>{RETORNOS.map((d) => <option key={d} value={d}>{d === 0 ? 'Sem retorno marcado' : d === 365 ? 'Em 1 ano' : `Em ${d} dias`}</option>)}</select></label>
          </div>
        </section>
        <div className="rodape-modal">
          <button type="button" className="btn2" onClick={fechar}>Cancelar</button>
          <button type="button" className="btn2 pri" onClick={finalizar}><Icone n="check" /> Salvar e finalizar atendimento</button>
        </div>
      </div>
    </Modal>
  );
}

/** Atendimento anterior (clicado na lista): registro curto + documentos emitidos no mesmo dia; imprime ou baixa o resumo. */
export function DetalheEvolucao({ a, docs, abrirDoc, fechar }: { a: Atendimento; docs: Documento[]; abrirDoc: (d: Documento) => void; fechar: () => void }) {
  const { base } = useDados();
  const ag = base.agendamentos.find((x) => x.id === a.agendamentoId);
  const serv = ag && base.servicos.find((s) => s.id === ag.servicoId);
  const pac = base.pacientes.find((x) => x.id === a.pacienteId);
  const [imp, setImp] = useState(false);
  const [pdf, setPdf] = useState(false);
  // folha da evolução para imprimir/baixar (mesmo visual dos outros documentos, com assinatura da Dra.)
  const folha = (
    <Folha clinica={base.clinica} titulo="Resumo do atendimento" data={hoje()} paciente={pac}>
      <p><b>Atendimento:</b> {br(a.data)}{serv ? ` · ${serv.nome}` : ''}</p>
      {a.cid && <p><b>Hipótese diagnóstica:</b> {a.cid} · {a.cidDescricao}</p>}
      {a.conduta && <p><b>Observação:</b> {a.conduta}</p>}
      {!!a.examesSolicitados?.length && <p><b>Exames solicitados:</b> {a.examesSolicitados.join(' · ')}</p>}
      {!!a.retornoDias && <p><b>Retorno:</b> em {a.retornoDias} dias</p>}
    </Folha>
  );
  return (
    <Modal titulo={`Atendimento de ${br(a.data)}${serv ? ` · ${serv.nome}` : ''}`} fechar={fechar} largo>
      <div className="evol-lida">
        <dl>
          {a.cid && <><dt>Hipótese diagnóstica</dt><dd><span className="mono">{a.cid}</span> · {a.cidDescricao}</dd></>}
          {a.conduta && <><dt>Observação</dt><dd>{a.conduta}</dd></>}
          {!!a.examesSolicitados?.length && <><dt>Exames solicitados</dt><dd>{a.examesSolicitados.join(' · ')}</dd></>}
          {!!a.retornoDias && <><dt>Retorno</dt><dd>em {a.retornoDias} dias</dd></>}
        </dl>
        <div className="lbl-peq">Documentos emitidos neste dia</div>
        {docs.length === 0 ? <p className="mut peq">Nenhum documento emitido neste dia.</p> : (
          <ul className="lista-simples docs">
            {docs.map((d) => <li key={d.id}><button type="button" onClick={() => abrirDoc(d)} title="Ver, reimprimir ou baixar PDF"><Icone n="arquivo" /><span>{NOME_DOC[d.tipo]}<small>{br(d.data)}</small></span><Icone n="imprimir" /></button></li>)}
          </ul>
        )}
        <div className="rodape-modal">
          <button type="button" className="btn2" onClick={fechar}>Fechar</button>
          <button type="button" className="btn2" disabled={pdf} onClick={() => setPdf(true)}><Icone n="pdf" /> {pdf ? 'Gerando…' : 'Baixar PDF'}</button>
          <button type="button" className="btn2 pri" onClick={() => setImp(true)}><Icone n="imprimir" /> Imprimir resumo</button>
        </div>
      </div>
      {imp && <Imprimir aoTerminar={() => setImp(false)}>{folha}</Imprimir>}
      {pdf && <BaixarPdf nome={nomeArquivo('resumo-atendimento', pac?.nome, a.data)} aoTerminar={() => setPdf(false)}>{folha}</BaixarPdf>}
    </Modal>
  );
}

export function Reimprimir({ d, fechar }: { d: Documento; fechar: () => void }) {
  const { base } = useDados();
  const [imp, setImp] = useState(false);
  const [pdf, setPdf] = useState(false);
  const pac = base.pacientes.find((x) => x.id === d.pacienteId);
  const folha = <Folha clinica={base.clinica} titulo={d.titulo} data={d.data} hora={d.hora} paciente={pac}><ConteudoDoc d={d} /></Folha>;
  return (
    <Modal titulo={`${NOME_DOC[d.tipo]} · ${br(d.data)}`} fechar={fechar}>
      <div className="reimp">{folha}</div>
      <div className="rodape-modal">
        <button type="button" className="btn2" onClick={fechar}>Fechar</button>
        <button type="button" className="btn2" disabled={pdf} onClick={() => setPdf(true)}><Icone n="pdf" /> {pdf ? 'Gerando…' : 'Baixar PDF'}</button>
        <button type="button" className="btn2 pri" onClick={() => setImp(true)}><Icone n="imprimir" /> Reimprimir</button>
      </div>
      {imp && <Imprimir aoTerminar={() => setImp(false)}>{folha}</Imprimir>}
      {pdf && <BaixarPdf nome={nomeArquivo(NOME_DOC[d.tipo], pac?.nome, d.data)} aoTerminar={() => setPdf(false)}>{folha}</BaixarPdf>}
    </Modal>
  );
}
