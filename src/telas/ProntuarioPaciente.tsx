// Prontuário do paciente (só a médica).
// Esquerda: atendimento de hoje (queixa, sinais vitais com IMC e classificação da PA, exame físico, CID, conduta).
// Direita: resumo clínico (alergias, medicamentos, antecedentes), evoluções anteriores e documentos emitidos.
import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import type { Atendimento, Cid, Documento, ResumoClinico, TipoDocumento } from '../tipos/modelos';
import { useDados } from '../componentes/Dados';
import { Avatar, Bloco, BotaoIcone, Modal, TagStatus, Vazio } from '../componentes/Comuns';
import { Icone } from '../componentes/Icone';
import { CidBusca } from '../componentes/CidBusca';
import { ConteudoDoc, EmitirDocumento } from '../componentes/EmitirDocumento';
import { Folha, Imprimir } from '../componentes/Folha';
import { NovoAgendamento } from '../componentes/NovoAgendamento';
import { classificaImc, classificaPA, imc } from '../regras/prontuario';
import { NOME_DOC } from '../regras/documentos';
import { idade } from '../regras/paciente';
import { br, hoje, somaDias } from '../util/datas';

const EXAME_NORMAL = 'BEG, corado, hidratado, eupneico. ACV: RCR 2T, BNF, sem sopros. AR: MV+ sem RA. Extremidades sem edema, pulsos presentes.';
const ANTECEDENTES = ['Hipertensão', 'Diabetes tipo 2', 'Dislipidemia', 'Tabagismo', 'Ex-tabagista', 'Obesidade', 'Sedentarismo', 'IAM prévio', 'AVC prévio', 'História familiar de DAC', 'Hipotireoidismo', 'Doença renal crônica'];
const RETORNOS = [0, 30, 60, 90, 180, 365];

type Form = { queixa: string; hda: string; pa: string; fc: string; peso: string; altura: string; exameFisico: string; cid?: Cid; conduta: string; exames: string[]; retornoDias: number };

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
  const ultimo = anteriores[0];
  const salvo = base.atendimentos.find((a) => agId && a.agendamentoId === agId);
  const [f, setF] = useState<Form>(() => ({
    queixa: '', hda: '', pa: '', fc: '', peso: ultimo?.pesoKg ? String(ultimo.pesoKg) : '', altura: ultimo?.alturaCm ? String(ultimo.alturaCm) : '',
    exameFisico: '', conduta: '', exames: [], retornoDias: 30,
  }));
  const [erros, setErros] = useState<Record<string, string>>({});
  const [doc, setDoc] = useState<TipoDocumento | null>(null);
  const [retorno, setRetorno] = useState(false);
  const [verTodas, setVerTodas] = useState(false);
  const [reimp, setReimp] = useState<Documento | null>(null);
  const [finalId, setFinalId] = useState<string | null>(null);
  if (!p) return <Vazio>Paciente não encontrado.</Vazio>;

  const resumo = base.resumos.find((r) => r.pacienteId === p.id);
  const docs = base.documentos.filter((d) => d.pacienteId === p.id).sort((x, y) => y.data.localeCompare(x.data));
  const finalizado: Atendimento | undefined = salvo ?? base.atendimentos.find((a) => a.id === finalId);
  const v = finalizado
    ? { pa: finalizado.pa ?? '', peso: finalizado.pesoKg, altura: finalizado.alturaCm }
    : { pa: f.pa, peso: Number(f.peso.replace(',', '.')) || undefined, altura: Number(f.altura) || undefined };
  const vImc = imc(v.peso, v.altura);
  const cImc = classificaImc(vImc);
  const cPa = classificaPA(v.pa);
  const muda = (x: Partial<Form>) => setF((o) => ({ ...o, ...x }));
  const exClinica = base.servicos.filter((s) => s.tipo === 'exame').map((s) => s.nome);
  const cidTxt = finalizado?.cid ? `${finalizado.cid} · ${finalizado.cidDescricao}` : f.cid ? `${f.cid.codigo} · ${f.cid.descricao}` : undefined;

  const finalizar = () => {
    const e: Record<string, string> = {};
    if (!f.queixa.trim()) e.queixa = 'Informe a queixa principal.';
    if (f.pa && !classificaPA(f.pa)) e.pa = 'Use o formato 120/80.';
    if (!f.conduta.trim()) e.conduta = 'Informe a conduta.';
    setErros(e);
    if (Object.keys(e).length) return;
    const novo = acoes.finalizarAtendimento({
      agendamentoId: agId ?? 'avulso-' + Date.now(), pacienteId: p.id, data: hj,
      queixa: f.queixa.trim(), hda: f.hda.trim() || undefined, pa: f.pa || undefined, fc: Number(f.fc) || undefined,
      pesoKg: v.peso, alturaCm: v.altura, cid: f.cid?.codigo, cidDescricao: f.cid?.descricao,
      exameFisico: f.exameFisico.trim() || undefined, conduta: f.conduta.trim(), examesSolicitados: f.exames, retornoDias: f.retornoDias || undefined,
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
        <Bloco titulo={<><Icone n="estetoscopio" /> {finalizado ? `Atendimento de ${br(finalizado.data)}` : ag ? `Atendimento de hoje · ${serv?.nome}` : 'Evolução avulsa (sem agendamento)'}</>}
          extra={finalizado && <span className="tag t-ok">finalizado</span>}>
          {finalizado ? (
            <div className="evol-lida">
              <div className="sinais">
                {finalizado.pa && <div><span>PA</span><b className="mono">{finalizado.pa}</b>{cPa && <em className={'tag ' + cPa.cls}>{cPa.nome}</em>}</div>}
                {finalizado.fc && <div><span>FC</span><b className="mono">{finalizado.fc} bpm</b></div>}
                {finalizado.pesoKg && <div><span>Peso</span><b className="mono">{finalizado.pesoKg} kg</b></div>}
                {vImc && <div><span>IMC</span><b className="mono">{vImc}</b>{cImc && <em className={'tag ' + cImc.cls}>{cImc.nome}</em>}</div>}
              </div>
              <dl>
                <dt>Queixa principal</dt><dd>{finalizado.queixa}</dd>
                {finalizado.hda && <><dt>História da doença atual</dt><dd>{finalizado.hda}</dd></>}
                {finalizado.exameFisico && <><dt>Exame físico</dt><dd>{finalizado.exameFisico}</dd></>}
                {finalizado.cid && <><dt>Hipótese diagnóstica</dt><dd><span className="mono">{finalizado.cid}</span> · {finalizado.cidDescricao}</dd></>}
                <dt>Conduta</dt><dd>{finalizado.conduta}</dd>
                {!!finalizado.examesSolicitados?.length && <><dt>Exames solicitados</dt><dd>{finalizado.examesSolicitados.join(' · ')}</dd></>}
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
                <label>Queixa principal *<input value={f.queixa} onChange={(e) => muda({ queixa: e.target.value })} placeholder="Ex.: palpitações há 2 meses" />{erros.queixa && <span className="erro-campo">{erros.queixa}</span>}</label>
                <label>História da doença atual<textarea rows={2} value={f.hda} onChange={(e) => muda({ hda: e.target.value })} /></label>
              </section>
              <section>
                <h4>Sinais vitais</h4>
                <div className="g g4">
                  <label>PA (mmHg)<input className="mono" value={f.pa} onChange={(e) => muda({ pa: e.target.value })} placeholder="120/80" />{cPa && <em className={'tag ' + cPa.cls}>{cPa.nome}</em>}{erros.pa && <span className="erro-campo">{erros.pa}</span>}</label>
                  <label>FC (bpm)<input className="mono" inputMode="numeric" value={f.fc} onChange={(e) => muda({ fc: e.target.value.replace(/\D/g, '').slice(0, 3) })} placeholder="72" /></label>
                  <label>Peso (kg)<input className="mono" inputMode="decimal" value={f.peso} onChange={(e) => muda({ peso: e.target.value })} /></label>
                  <label>Altura (cm)<input className="mono" inputMode="numeric" value={f.altura} onChange={(e) => muda({ altura: e.target.value.replace(/\D/g, '').slice(0, 3) })} /></label>
                </div>
                {vImc && <div className="imc">IMC <b className="mono">{vImc}</b> {cImc && <em className={'tag ' + cImc.cls}>{cImc.nome}</em>}</div>}
              </section>
              <section>
                <label>Exame físico
                  <div className="com-atalho">
                    <textarea rows={2} value={f.exameFisico} onChange={(e) => muda({ exameFisico: e.target.value })} />
                    <button type="button" className="btn2 peq" onClick={() => muda({ exameFisico: EXAME_NORMAL })} title="Preencher com exame físico normal">Normal</button>
                  </div>
                </label>
                <label>Hipótese diagnóstica (CID-10)<CidBusca valor={f.cid} aoEscolher={(c) => muda({ cid: c })} /></label>
                <label>Conduta *<textarea rows={3} value={f.conduta} onChange={(e) => muda({ conduta: e.target.value })} placeholder="Medicação, orientações, encaminhamentos" />{erros.conduta && <span className="erro-campo">{erros.conduta}</span>}</label>
              </section>
              <section>
                <h4>Exames solicitados</h4>
                <div className="chips-sel">
                  {exClinica.map((x) => <button type="button" key={x} className={f.exames.includes(x) ? 'sel' : ''} onClick={() => muda({ exames: f.exames.includes(x) ? f.exames.filter((y) => y !== x) : [...f.exames, x] })}>{x}</button>)}
                </div>
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
          <Bloco titulo={<><Icone n="relogio" /> Evoluções anteriores</>} extra={anteriores.length > 3 && <button type="button" className="lk" onClick={() => setVerTodas(!verTodas)}>{verTodas ? 'ver menos' : `ver todas (${anteriores.length})`}</button>}>
            {anteriores.length === 0 ? <Vazio>Primeiro atendimento do paciente.</Vazio> : (
              <ul className="evols">
                {(verTodas ? anteriores : anteriores.slice(0, 3)).map((a) => {
                  const i = imc(a.pesoKg, a.alturaCm);
                  return (
                    <li key={a.id}>
                      <div className="ev-cab"><b className="mono">{br(a.data)}</b>{a.cid && <span>{a.cid} · {a.cidDescricao}</span>}</div>
                      <div className="ev-sinais mono">{[a.pa && `PA ${a.pa}`, a.fc && `FC ${a.fc}`, a.pesoKg && `${a.pesoKg} kg`, i && `IMC ${i}`].filter(Boolean).join(' · ')}</div>
                      <p>{a.queixa}</p>
                      <p className="mut">{a.conduta}</p>
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
    </>
  );
}

function Reimprimir({ d, fechar }: { d: Documento; fechar: () => void }) {
  const { base } = useDados();
  const [imp, setImp] = useState(false);
  return (
    <Modal titulo={`${NOME_DOC[d.tipo]} · ${br(d.data)}`} fechar={fechar}>
      <div className="reimp"><Folha clinica={base.clinica} titulo={d.titulo} data={d.data}><ConteudoDoc d={d} /></Folha></div>
      <div className="rodape-modal"><button type="button" className="btn2" onClick={fechar}>Fechar</button><button type="button" className="btn2 pri" onClick={() => setImp(true)}><Icone n="imprimir" /> Reimprimir</button></div>
      {imp && <Imprimir aoTerminar={() => setImp(false)}><Folha clinica={base.clinica} titulo={d.titulo} data={d.data}><ConteudoDoc d={d} /></Folha></Imprimir>}
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
