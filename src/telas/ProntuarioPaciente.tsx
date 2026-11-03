// Histórico do paciente (só a médica). O prontuário clínico completo fica no sistema de prontuário da Dra. (Life Up);
// aqui fica o REGISTRO CURTO de cada atendimento (CID, observação, exames pedidos e retorno), os documentos com o logo
// da Dra. (atestado, receita, pedido de exames, comparecimento) e o resumo (alergias, medicamentos, antecedentes).
import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import type { Atendimento, Cid, Documento, ResumoClinico, TipoDocumento } from '../tipos/modelos';
import { useDados } from '../componentes/Dados';
import { Avatar, Bloco, BotaoIcone, Modal, TagStatus, Vazio } from '../componentes/Comuns';
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

const ANTECEDENTES = ['Hipertensão', 'Diabetes tipo 2', 'Dislipidemia', 'Tabagismo', 'Ex-tabagista', 'Obesidade', 'Sedentarismo', 'IAM prévio', 'AVC prévio', 'História familiar de DAC', 'Hipotireoidismo', 'Doença renal crônica'];
const RETORNOS = [0, 30, 60, 90, 180, 365];

type Form = { cid?: Cid; obs: string; exames: string[]; retornoDias: number };

export function ProntuarioPaciente() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { base, acoes } = useDados();
  const nav = useNavigate();
  const hj = hoje();
  const p = base.pacientes.find((x) => x.id === id);
  const agId = params.get('ag') ?? base.agendamentos.find((a) => a.pacienteId === id && a.data === hj && a.status !== 'cancelado' && base.servicos.find((s) => s.id === a.servicoId)?.tipo !== 'exame')?.id;
  const ag = base.agendamentos.find((a) => a.id === agId);
  const serv = ag && base.servicos.find((s) => s.id === ag.servicoId);
  const anteriores = base.atendimentos.filter((a) => a.pacienteId === id && a.agendamentoId !== agId).sort((x, y) => y.data.localeCompare(x.data));
  const salvo = base.atendimentos.find((a) => agId && a.agendamentoId === agId);
  const [f, setF] = useState<Form>(() => ({ obs: '', exames: [], retornoDias: 30 }));
  const [doc, setDoc] = useState<TipoDocumento | null>(null);
  const [retorno, setRetorno] = useState(false);
  const [verTodas, setVerTodas] = useState(false);
  const [reimp, setReimp] = useState<Documento | null>(null);
  const [evol, setEvol] = useState<Atendimento | null>(null);   // evolução anterior aberta
  const [finalId, setFinalId] = useState<string | null>(null);
  if (!p) return <Vazio>Paciente não encontrado.</Vazio>;

  const resumo = base.resumos.find((r) => r.pacienteId === p.id);
  const docs = base.documentos.filter((d) => d.pacienteId === p.id).sort((x, y) => y.data.localeCompare(x.data));
  const finalizado: Atendimento | undefined = salvo ?? base.atendimentos.find((a) => a.id === finalId);
  const muda = (x: Partial<Form>) => setF((o) => ({ ...o, ...x }));
  const exClinica = base.servicos.filter((s) => s.tipo === 'exame').map((s) => s.nome);
  const cidTxt = finalizado?.cid ? `${finalizado.cid} · ${finalizado.cidDescricao}` : f.cid ? `${f.cid.codigo} · ${f.cid.descricao}` : undefined;

  // registro curto: nada é obrigatório (o clínico completo fica no prontuário da Dra.)
  const finalizar = () => {
    const novo = acoes.finalizarAtendimento({
      agendamentoId: agId ?? 'avulso-' + Date.now(), pacienteId: p.id, data: hj,
      queixa: '', cid: f.cid?.codigo, cidDescricao: f.cid?.descricao,
      conduta: f.obs.trim(), examesSolicitados: f.exames, retornoDias: f.retornoDias || undefined,
    });
    setFinalId(novo.id);
  };

  return (
    <>
      <div className="ficha-cab bloco">
        <Avatar nome={p.nome} grande />
        <div className="fc-info">
          <h1>{p.nome}</h1>
          <div className="fc-linha">
            <span>{idade(p.nascimento, hj)} anos · {p.sexo === 'F' ? 'feminino' : p.sexo === 'M' ? 'masculino' : 'outro'}</span>
            {resumo && resumo.alergias && resumo.alergias !== 'Nenhuma conhecida'
              ? <span className="tag t-no" title="Alergia registrada">alergia: {resumo.alergias}</span>
              : <span className="tag t-fim">sem alergias conhecidas</span>}
            {resumo?.antecedentes.map((a) => <span key={a} className="tag t-in">{a}</span>)}
          </div>
        </div>
        {ag && serv && <div className="fc-num"><b className="mono">{ag.hora}</b><span>{serv.curto} · hoje</span></div>}
        {ag && <TagStatus s={ag.status} />}
        <div className="fc-acoes">
          <BotaoIcone icone="arquivo" titulo="Abrir ficha e histórico completo" onClick={() => nav('/pacientes/' + p.id)} />
          <BotaoIcone icone="imprimir" titulo="Atestado" onClick={() => setDoc('atestado')} />
          <BotaoIcone icone="lista" titulo="Receita" onClick={() => setDoc('receita')} />
          <BotaoIcone icone="exame" titulo="Pedido de exames" onClick={() => setDoc('pedido_exames')} />
          <BotaoIcone icone="relogio" titulo="Declaração de comparecimento" onClick={() => setDoc('comparecimento')} />
        </div>
      </div>

      <div className="grade2 pront">
        <Bloco titulo={<><Icone n="estetoscopio" /> {finalizado ? `Atendimento de ${br(finalizado.data)}` : ag ? `Atendimento de hoje · ${serv?.nome}` : 'Registro avulso (sem agendamento)'}</>}
          extra={finalizado && <span className="tag t-ok">finalizado</span>}>
          {finalizado ? (
            <div className="evol-lida">
              <dl>
                {finalizado.cid && <><dt>Hipótese diagnóstica</dt><dd><span className="mono">{finalizado.cid}</span> · {finalizado.cidDescricao}</dd></>}
                {finalizado.conduta && <><dt>Observação</dt><dd>{finalizado.conduta}</dd></>}
                {!!finalizado.examesSolicitados?.length && <><dt>Exames solicitados</dt><dd>{finalizado.examesSolicitados.join(' · ')}</dd></>}
                {!!finalizado.retornoDias && <><dt>Retorno</dt><dd>em {finalizado.retornoDias} dias</dd></>}
              </dl>
              <div className="pos-atend">
                <span>Próximos passos:</span>
                <button type="button" className="btn2" onClick={() => setDoc('receita')}><Icone n="lista" /> Receita</button>
                {!!finalizado.examesSolicitados?.length && <button type="button" className="btn2" onClick={() => setDoc('pedido_exames')}><Icone n="exame" /> Pedido de exames</button>}
                <button type="button" className="btn2" onClick={() => setDoc('atestado')}><Icone n="imprimir" /> Atestado</button>
                {!!finalizado.retornoDias && <button type="button" className="btn2 pri" onClick={() => setRetorno(true)}><Icone n="calendario" /> Agendar retorno ({finalizado.retornoDias} dias)</button>}
                <button type="button" className="btn2" onClick={() => nav('/hoje')}><Icone n="inicio" /> Voltar para Hoje</button>
              </div>
            </div>
          ) : (
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
                <span className="mut peq"><Icone n="escudo" /> Visível só para a médica · registro com data e autoria</span>
                <button type="button" className="btn2 pri" onClick={finalizar}><Icone n="check" /> Finalizar atendimento</button>
              </div>
            </div>
          )}
        </Bloco>

        <div className="pilha">
          <ResumoBloco key={p.id + (resumo?.atualizadoEm ?? '')} pacienteId={p.id} resumo={resumo} salvar={acoes.salvarResumo} />
          <Bloco titulo={<><Icone n="relogio" /> Atendimentos anteriores</>} extra={anteriores.length > 3 && <button type="button" className="lk" onClick={() => setVerTodas(!verTodas)}>{verTodas ? 'ver menos' : `ver todas (${anteriores.length})`}</button>}>
            {anteriores.length === 0 ? <Vazio>Primeiro atendimento do paciente.</Vazio> : (
              <ul className="evols">
                {(verTodas ? anteriores : anteriores.slice(0, 3)).map((a) => {
                  return (
                    <li key={a.id} className="clic" role="button" tabIndex={0} title="Ver o atendimento" onClick={() => setEvol(a)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setEvol(a)}>
                      <div className="ev-cab"><b className="mono">{br(a.data)}</b>{a.cid && <span>{a.cid} · {a.cidDescricao}</span>}</div>
                      {a.conduta && <p>{a.conduta}</p>}
                      {!!a.examesSolicitados?.length && <p className="mut">Exames: {a.examesSolicitados.join(' · ')}</p>}
                    </li>
                  );
                })}
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

      {doc && <EmitirDocumento paciente={p} tipoInicial={doc} cid={cidTxt} exames={finalizado?.examesSolicitados ?? f.exames} hora={ag?.hora} fechar={() => setDoc(null)} />}
      {retorno && finalizado?.retornoDias && <NovoAgendamento pacienteId={p.id} servicoId={finalizado.retornoDias <= 30 ? 'retorno' : 'consulta'} data={somaDias(hj, finalizado.retornoDias)} fechar={() => setRetorno(false)} />}
      {reimp && <Reimprimir d={reimp} fechar={() => setReimp(null)} />}
      {evol && !reimp && <DetalheEvolucao a={evol} docs={docs.filter((d) => d.data === evol.data)} abrirDoc={setReimp} fechar={() => setEvol(null)} />}
    </>
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

/** Resumo clínico: edição pelo lápis; Salvar/Descartar ficam visíveis e desabilitados até editar. */
function ResumoBloco({ pacienteId, resumo, salvar }: { pacienteId: string; resumo?: ResumoClinico; salvar: (r: ResumoClinico) => void }) {
  const ini = { alergias: resumo?.alergias ?? 'Nenhuma conhecida', meds: (resumo?.medicamentos ?? []).join('\n'), ant: resumo?.antecedentes ?? [] };
  const [ed, setEd] = useState(false);
  const [r, setR] = useState(ini);
  const ok = () => { salvar({ pacienteId, alergias: r.alergias.trim() || 'Nenhuma conhecida', medicamentos: r.meds.split('\n').map((x) => x.trim()).filter(Boolean), antecedentes: r.ant, atualizadoEm: hoje() }); setEd(false); };
  return (
    <Bloco titulo={<><Icone n="coracao" /> Resumo clínico</>} extra={
      <div className="acoes-pagina">
        <BotaoIcone icone="editar" titulo="Editar resumo clínico" cls="peq" onClick={() => setEd(true)} disabled={ed} />
        <BotaoIcone icone="descartar" titulo="Descartar" cls="peq" onClick={() => { setR(ini); setEd(false); }} disabled={!ed} />
        <BotaoIcone icone="salvar" titulo="Salvar" cls="peq" pri onClick={ok} disabled={!ed} />
      </div>}>
      <div className="resumo-cl">
        <label>Alergias<input disabled={!ed} value={r.alergias} onChange={(e) => setR({ ...r, alergias: e.target.value })} /></label>
        <label>Medicamentos em uso <small className="mut">(um por linha)</small><textarea disabled={!ed} rows={Math.max(2, r.meds.split('\n').length)} value={r.meds} onChange={(e) => setR({ ...r, meds: e.target.value })} placeholder="Nenhum" /></label>
        <div className="lbl">Antecedentes</div>
        <div className="chips-sel">
          {(ed ? ANTECEDENTES : r.ant).map((a) => <button type="button" key={a} disabled={!ed} className={r.ant.includes(a) ? 'sel' : ''} onClick={() => setR({ ...r, ant: r.ant.includes(a) ? r.ant.filter((x) => x !== a) : [...r.ant, a] })}>{a}</button>)}
          {!ed && !r.ant.length && <span className="mut peq">Nenhum registrado</span>}
        </div>
      </div>
    </Bloco>
  );
}
