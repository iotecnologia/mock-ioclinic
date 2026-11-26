// Ficha do paciente (SÓ CONSULTA): cabeçalho com o essencial, aba HISTÓRICO (retorno, exames, documentos e linha do
// tempo) e aba DADOS CADASTRAIS (só leitura). Editar o cadastro e agendar abrem POP-UP (regra do sistema).
// LGPD: a recepção vê só o histórico administrativo; o conteúdo clínico aparece só para a médica.
import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useDados } from '../componentes/Dados';
import { useSessao } from '../acesso/Sessao';
import { Avatar, Bloco, Vazio } from '../componentes/Comuns';
import { Icone } from '../componentes/Icone';
import { FormPaciente } from '../componentes/FormPaciente';
import { PacienteModal } from '../componentes/PacienteModal';
import { NovoAgendamento } from '../componentes/NovoAgendamento';
import { DetalheAgendamento } from '../componentes/DetalheAgendamento';
import { DetalheEvolucao, Reimprimir } from './ProntuarioPaciente';
import { examesPedidos, historico, idade, resumoPaciente, situacaoRetorno, type ItemHistorico } from '../regras/paciente';
import { NOME_DOC } from '../regras/documentos';
import { br, hoje, nomeMes } from '../util/datas';
import { linkWhats } from '../util/formato';

type Aba = 'historico' | 'dados';
type FiltroH = 'tudo' | 'agendamento' | 'clinico' | 'documento';
const ICONE: Record<ItemHistorico['tipo'], string> = { agendamento: 'calendario', pagamento: 'carteira', clinico: 'estetoscopio', documento: 'arquivo', cadastro: 'pacienteMais' };

export function PacienteFicha() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const { base } = useDados();
  const { usuario } = useSessao();
  const medica = usuario!.perfil === 'medica';
  const nav = useNavigate();
  const [aba, setAba] = useState<Aba>('historico');
  const [filtro, setFiltro] = useState<FiltroH>('tudo');
  const [editar, setEditar] = useState(false);   // pop-up "Editar cadastro"
  const [aberto, setAberto] = useState<ItemHistorico | null>(null);   // item do histórico aberto numa janela
  const p = base.pacientes.find((x) => x.id === id);
  if (!p) return <Vazio>Paciente não encontrado.</Vazio>;
  const hj = hoje();
  const r = resumoPaciente(p.id, base, hj);
  const itens = historico(p.id, base, usuario!.perfil).filter((i) => filtro === 'tudo' || i.tipo === filtro);
  // resumo do histórico: retorno, exames pedidos x feitos e documentos emitidos
  const ret = situacaoRetorno(p.id, base, hj);
  const exames = examesPedidos(p.id, base);
  const pendentes = exames.filter((e) => e.situacao === 'pendente').length;
  const docs = base.documentos.filter((d) => d.pacienteId === p.id).sort((x, y) => y.data.localeCompare(x.data));
  const agendar = params.get('agendar') === '1';
  const fecharAgendar = () => { params.delete('agendar'); setParams(params, { replace: true }); };

  // agrupa por mês/ano para a linha do tempo
  // cada item do histórico abre o detalhe AQUI MESMO (janela), sem trocar de página
  const abrirItem = (i: ItemHistorico) => { if (i.tipo === 'cadastro') setAba('dados'); else setAberto(i); };
  const atAberto = aberto?.atId ? base.atendimentos.find((x) => x.id === aberto.atId) : undefined;
  const docAberto = aberto?.docId ? base.documentos.find((x) => x.id === aberto.docId) : undefined;
  const grupos: { chave: string; itens: ItemHistorico[] }[] = [];
  for (const i of itens) {
    const chave = `${nomeMes(Number(i.data.slice(5, 7)) - 1)} de ${i.data.slice(0, 4)}`;
    const g = grupos[grupos.length - 1];
    if (g && g.chave === chave) g.itens.push(i); else grupos.push({ chave, itens: [i] });
  }

  return (
    <>
      <div className="ficha-cab bloco">
        <Avatar nome={p.nome} grande />
        <div className="fc-info">
          <h1>{p.nome}</h1>
          <div className="fc-linha">
            <span>{idade(p.nascimento, hj)} anos · nasc. {br(p.nascimento)}</span>
            <span className="mono">CPF {p.cpf}</span>
            <span className="mono">{p.telefone}</span>
            {p.consentimentoLgpd ? <span className="tag t-ok" title={`Aceito em ${p.consentimentoData ? br(p.consentimentoData) : ''}`}>termo LGPD aceito</span> : <span className="tag t-at">termo LGPD pendente</span>}
          </div>
        </div>
        <div className="fc-num"><b>{r.total}</b><span>atendimentos</span></div>
        <div className="fc-num"><b>{r.ultima ? br(r.ultima.data) : '—'}</b><span>última visita</span></div>
        <div className="fc-num"><b>{r.proximo ? br(r.proximo.data) : '—'}</b><span>{r.proximo ? 'próximo · ' + r.proximo.hora : 'sem agendamento'}</span></div>
        <div className="fc-acoes">
          <a className="btn2" href={linkWhats(p.telefone, `Olá, ${p.nome.split(' ')[0]}! Aqui é da clínica da ${base.clinica.medica}.`)} target="_blank" rel="noreferrer"><Icone n="zap" /> WhatsApp</a>
          {medica && <button type="button" className="btn2" onClick={() => nav('/prontuario/' + p.id)}><Icone n="estetoscopio" /> Atender</button>}
          <button type="button" className="btn2 pri" onClick={() => setParams({ agendar: '1' })}><Icone n="calendario" /> Novo agendamento</button>
        </div>
      </div>

      <div className="abas">
        <button type="button" className={aba === 'historico' ? 'sel' : ''} onClick={() => setAba('historico')}><Icone n="relogio" /> Histórico</button>
        <button type="button" className={aba === 'dados' ? 'sel' : ''} onClick={() => setAba('dados')}><Icone n="lista" /> Dados cadastrais</button>
      </div>

      {aba === 'historico' ? (<>
        <div className="hist-resumo fora">
          <div className="hr-card">
            <div className="hr-tit"><Icone n="calendario" /> Retorno</div>
            {ret.marcado ? <p>Marcado para <b>{br(ret.marcado.data)}</b> às {ret.marcado.hora}</p>
              : ret.indicado ? <p>Indicado para <b>{br(ret.indicado)}</b>{ret.gratisAte === ret.indicado && ret.dentroDoPrazo && <span className="hr-ok"> · sem custo</span>} · <span className="mut">ainda não marcado</span></p>
              : <p className="mut">Nenhum retorno indicado.</p>}
            {ret.gratisAte && ret.gratisAte !== ret.indicado && <p className={ret.dentroDoPrazo ? 'hr-ok' : 'mut'}>{ret.dentroDoPrazo ? `Retorno sem custo até ${br(ret.gratisAte)}` : `Prazo do retorno sem custo terminou em ${br(ret.gratisAte)}`}</p>}
            {!ret.marcado && <button type="button" className="lk" onClick={() => setParams({ agendar: '1' })}>Agendar retorno</button>}
          </div>
          <div className="hr-card">
            <div className="hr-tit"><Icone n="exame" /> Exames pedidos {pendentes > 0 && <span className="tag t-at">{pendentes} pendente{pendentes > 1 ? 's' : ''}</span>}</div>
            {exames.length === 0 ? <p className="mut">Nenhum exame pedido.</p> : (
              <ul className="hr-lista">
                {exames.slice(0, 4).map((e, k) => (
                  <li key={k} className={e.agId ? 'clic' : ''} onClick={() => e.agId && setAberto({ data: e.data!, tipo: 'agendamento', titulo: e.nome, agId: e.agId })}>
                    <span>{e.nome}</span>
                    <small className={'hr-' + e.situacao}>{e.situacao === 'feito' ? `feito ${br(e.data!).slice(0, 5)}` : e.situacao === 'agendado' ? `marcado ${br(e.data!).slice(0, 5)}` : e.situacao === 'fora' ? 'fora da clínica' : 'não feito'}</small>
                  </li>
                ))}
                {exames.length > 4 && <li className="mut peq">+ {exames.length - 4} na linha do tempo</li>}
              </ul>
            )}
          </div>
          {medica && (
            <div className="hr-card">
              <div className="hr-tit"><Icone n="arquivo" /> Documentos emitidos</div>
              {docs.length === 0 ? <p className="mut">Nenhum documento emitido.</p> : (
                <ul className="hr-lista">
                  {docs.slice(0, 4).map((d) => (
                    <li key={d.id} className="clic" title="Ver e reimprimir" onClick={() => setAberto({ data: d.data, tipo: 'documento', titulo: d.titulo, docId: d.id })}>
                      <span>{NOME_DOC[d.tipo]}</span><small>{br(d.data).slice(0, 5)} · reimprimir</small>
                    </li>
                  ))}
                  {docs.length > 4 && <li className="mut peq">+ {docs.length - 4} na linha do tempo</li>}
                </ul>
              )}
            </div>
          )}
        </div>
        <Bloco titulo="Linha do tempo" extra={
          <div className="segmentado peq">
            <button type="button" className={filtro === 'tudo' ? 'sel' : ''} onClick={() => setFiltro('tudo')}>Tudo</button>
            <button type="button" className={filtro === 'agendamento' ? 'sel' : ''} onClick={() => setFiltro('agendamento')}>Consultas e exames</button>
            {medica && <button type="button" className={filtro === 'clinico' ? 'sel' : ''} onClick={() => setFiltro('clinico')}>Registros da Dra.</button>}
            {medica && <button type="button" className={filtro === 'documento' ? 'sel' : ''} onClick={() => setFiltro('documento')}>Documentos</button>}
          </div>}>
          {!medica && <div className="aviso-lgpd"><Icone n="escudo" /> Conteúdo clínico (evolução, diagnóstico, conduta) visível só para a médica — LGPD, dado sensível de saúde.</div>}
          {grupos.length === 0 ? <Vazio>Nada para mostrar neste filtro.</Vazio> : (
            <div className="timeline">
              {grupos.map((g) => (
                <div key={g.chave} className="tl-grupo">
                  <div className="tl-mes">{g.chave}</div>
                  {g.itens.map((i, k) => (
                    <div key={k} className={'tl-item clic tl-' + i.tipo + (i.data > hj ? ' futuro' : '')} role="button" tabIndex={0}
                      title={i.tipo === 'cadastro' ? 'Ver dados cadastrais' : i.tipo === 'clinico' ? 'Ver a evolução' : i.tipo === 'documento' ? 'Ver o documento' : 'Ver o agendamento'}
                      onClick={() => abrirItem(i)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && abrirItem(i)}>
                      <span className="tl-dot"><Icone n={ICONE[i.tipo]} /></span>
                      <div className="tl-data mono">{br(i.data).slice(0, 5)}{i.hora && <small>{i.hora}</small>}</div>
                      <div className="tl-txt">
                        <b>{i.titulo}</b>
                        {i.detalhe && <p>{i.detalhe}</p>}
                      </div>
                      {i.status && i.tipo === 'agendamento' && <span className={'tag ' + i.statusCls}>{i.data > hj && i.status === 'Agendado' ? 'Agendado' : i.status}</span>}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </Bloco>
      </>) : (
        <Bloco titulo="Dados cadastrais" extra={<button type="button" className="btn2" onClick={() => setEditar(true)}><Icone n="editar" /> Editar cadastro</button>}>
          <FormPaciente key={p.id + JSON.stringify(p)} inicial={p} editando={false} aoMudar={() => {}} erros={{}} />
        </Bloco>
      )}
      {aberto?.agId && <DetalheAgendamento id={aberto.agId} fechar={() => setAberto(null)} />}
      {atAberto && <DetalheEvolucao a={atAberto} docs={base.documentos.filter((d) => d.pacienteId === p.id && d.data === atAberto.data)} abrirDoc={(d) => setAberto({ ...aberto!, atId: undefined, docId: d.id })} fechar={() => setAberto(null)} />}
      {docAberto && <Reimprimir d={docAberto} fechar={() => setAberto(null)} />}
      {editar && <PacienteModal paciente={p} fechar={() => setEditar(false)} />}
      {agendar && <NovoAgendamento pacienteId={p.id} fechar={fecharAgendar} />}
    </>
  );
}
