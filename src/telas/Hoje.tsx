// Tela inicial: o que tem para fazer hoje. Recepção e Dra. veem a mesma agenda; cada uma com as suas ações.
// A Dra. vê também o "próximo paciente" em destaque. Nada de gráfico aqui: o BI fica em página própria.
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDados } from '../componentes/Dados';
import { useSessao } from '../acesso/Sessao';
import { Bloco, BotaoIcone, TagStatus, TituloPagina, Vazio } from '../componentes/Comuns';
import { Icone } from '../componentes/Icone';
import { LinhaAgendamento } from '../componentes/LinhaAgendamento';
import { NovoAgendamento } from '../componentes/NovoAgendamento';
import { aConfirmar, contagem, doDia, lembretesPendentes, proximoPaciente } from '../regras/agenda';
import { blocosLivres, situacaoDia } from '../regras/disponibilidade';
import { idadeTxt } from '../regras/paciente';
import { agoraMin, brCurto, extenso, hoje, nomeDiaCurto, somaDias } from '../util/datas';
import { linkWhats, moeda } from '../util/formato';
import { msgLembrete, msgRemarcar } from '../regras/mensagens';
import { useWhatsAuto } from '../componentes/WhatsAuto';

function saudacao() { const h = new Date().getHours(); return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; }

export function Hoje() {
  const { base, acoes } = useDados();
  const { usuario } = useSessao();
  const nav = useNavigate();
  const [novo, setNovo] = useState(false);
  const hj = hoje();
  const medica = usuario!.perfil === 'medica';
  const lista = doDia(base, hj);
  const c = contagem(lista);
  const sit = situacaoDia(hj, base);
  const livres = sit.aberto ? blocosLivres(hj, base, agoraMin()) : 0;
  const prox = medica ? proximoPaciente(lista, agoraMin()) : undefined;

  // próximos dias de atendimento (até 6)
  const proximos: string[] = [];
  for (let i = 1; proximos.length < 6 && i < 30; i++) { const d = somaDias(hj, i); if (situacaoDia(d, base).aberto) proximos.push(d); }
  const amanha = proximos[0];
  const confirmar = amanha ? aConfirmar(base, amanha) : [];
  const aReceber = lista.filter((a) => a.pagamento?.status === 'pendente' && ['chegou', 'em_atendimento', 'atendido'].includes(a.status));
  const nomeP = (id: string) => base.pacientes.find((p) => p.id === id)!;
  const nomeS = (id: string) => base.servicos.find((s) => s.id === id)!;
  const [auto] = useWhatsAuto();
  // WhatsApp automático: o lembrete do próximo dia de atendimento sai sozinho (no mock, simulado ao abrir a tela)
  const paraConfirmar = confirmar.filter((a) => a.whats?.resposta !== 'remarcar');   // quem pediu remarcar vai para a lista de cima
  const semLembrete = auto ? confirmar.filter((a) => !a.whats?.lembreteEm).map((a) => a.id) : [];
  useEffect(() => { if (semLembrete.length) acoes.enviarLembretes(semLembrete); }, [semLembrete.join()]); // eslint-disable-line react-hooks/exhaustive-deps
  const remarcar = base.agendamentos
    .filter((a) => a.whats?.resposta === 'remarcar' && !a.whats.resolvido && a.data >= hj && ['agendado', 'confirmado'].includes(a.status))
    .sort((x, y) => x.data.localeCompare(y.data) || x.hora.localeCompare(y.hora));
  const lemb = lembretesPendentes(base, hj, agoraMin());
  const horaLembrete = !auto && lemb.hora && lemb.lista.length > 0;
  const confirmaramZap = amanha ? doDia(base, amanha).filter((a) => a.whats?.resposta === 'confirmou').length : 0;

  return (
    <>
      <TituloPagina titulo={`${saudacao()}, ${usuario!.nome}`} sub={extenso(hj)}>
        <BotaoIcone icone="mais" titulo="Novo agendamento" pri onClick={() => setNovo(true)} />
      </TituloPagina>

      <div className="contadores">
        <div><Icone n="calendario" /><b>{c.total}</b><span>pacientes hoje</span></div>
        <div><Icone n="check" /><b>{c.confirmados}</b><span>confirmados</span></div>
        <div><Icone n="estetoscopio" /><b>{c.atendidos}</b><span>atendidos</span></div>
        <div><Icone n="relogio" /><b>{livres}</b><span>horários livres</span></div>
        <div className={c.aReceber ? 'alerta' : ''}><Icone n="carteira" /><b>{c.aReceber}</b><span>a receber</span></div>
      </div>

      {medica && prox && (() => {
        const p = nomeP(prox.pacienteId), s = nomeS(prox.servicoId);
        const ult = base.atendimentos.filter((a) => a.pacienteId === p.id).sort((x, y) => y.data.localeCompare(x.data))[0];
        return (
          <div className="proximo">
            <div className="px-rot">{prox.status === 'em_atendimento' ? 'Em atendimento agora' : prox.status === 'chegou' ? 'Aguardando na recepção' : 'Próximo paciente'}</div>
            <div className="px-corpo">
              <div className="px-hora mono">{prox.hora}</div>
              <div className="px-info">
                {p.situacao ? <span className="px-nome">{p.nome}</span> : <Link to={'/pacientes/' + p.id} className="px-nome">{p.nome}</Link>}
                <div className="mut">{idadeTxt(p, hj)} · {s.nome}{prox.encaixe ? ' · encaixe' : ''}</div>
                {ult ? <div className="px-ult"><Icone n="pulso" /> Última consulta {brCurto(ult.data)}: {ult.cid} · {ult.cidDescricao}{ult.pa ? ` · PA ${ult.pa}` : ''}</div> : <div className="px-ult"><Icone n="info" /> Primeira consulta na clínica</div>}
              </div>
              <TagStatus s={prox.status} />
              <div className="px-acoes">
                {p.situacao === 'pre' ? <span className="tag t-in" title="A recepção completa o cadastro quando o paciente chegar">pré-cadastro · aguardando chegada</span> : <>
                <BotaoIcone icone="arquivo" titulo="Ver histórico do paciente" onClick={() => nav('/pacientes/' + p.id)} />
                {prox.status !== 'em_atendimento'
                  ? <BotaoIcone icone="play" titulo="Chamar e abrir o prontuário" pri onClick={() => { acoes.mudarStatus(prox.id, 'em_atendimento'); if (s.tipo !== 'exame') nav(`/prontuario/${p.id}?ag=${prox.id}`); }} />
                  : s.tipo !== 'exame'
                    ? <BotaoIcone icone="estetoscopio" titulo="Abrir prontuário" pri onClick={() => nav(`/prontuario/${p.id}?ag=${prox.id}`)} />
                    : <BotaoIcone icone="check" titulo="Finalizar exame" pri onClick={() => acoes.mudarStatus(prox.id, 'atendido')} />}
                </>}
              </div>
            </div>
          </div>
        );
      })()}

      <div className="grade2">
        <Bloco titulo={<><Icone n="dia" /> Agenda de hoje</>} extra={<button type="button" className="lk" onClick={() => nav('/agenda')}>abrir agenda completa</button>}>
          {!sit.aberto ? <Vazio>{sit.motivo}. Veja ao lado os próximos dias.</Vazio>
            : lista.length === 0 ? <Vazio>Nenhum paciente agendado para hoje.</Vazio>
            : <div className="lista-ag">{lista.map((a) => <LinhaAgendamento key={a.id} ag={a} />)}</div>}
        </Bloco>

        <div className="pilha">
          <Bloco titulo={<><Icone n="semana" /> Próximos dias</>}>
            <ul className="prox-dias">
              {proximos.map((d) => {
                const l = doDia(base, d);
                const cons = l.filter((a) => nomeS(a.servicoId).tipo !== 'exame').length;
                return (
                  <li key={d}>
                    <button type="button" onClick={() => nav('/agenda?data=' + d)}>
                      <span className="pd-data"><b>{nomeDiaCurto(d)}</b>{brCurto(d)}</span>
                      <span className="pd-txt">{l.length ? <>{l.length} agendamento{l.length > 1 ? 's' : ''} <small>{cons} consulta{cons !== 1 ? 's' : ''} · {l.length - cons} exame{l.length - cons !== 1 ? 's' : ''}</small></> : <span className="mut">agenda livre</span>}</span>
                      <span className="pd-hora mono">{l[0]?.hora ?? ''}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Bloco>

          <Bloco titulo={<><Icone n="lista" /> Para fazer</>}>
            <ul className="tarefas">
              {horaLembrete && <li className="t-lembrete"><Icone n="zap" /><span><b>Hora de enviar os lembretes ({lemb.lista.length})</b><small>Clique no WhatsApp de cada paciente abaixo. Quando ele responder “1”, marque o ✓.</small></span></li>}
              {remarcar.length > 0 && <li className="t-cab alerta"><Icone n="alerta" /> Pediram para remarcar pelo WhatsApp ({remarcar.length})</li>}
              {remarcar.map((a) => {
                const p = nomeP(a.pacienteId), s = nomeS(a.servicoId);
                return (
                  <li key={'r' + a.id} className="tf-alerta">
                    <span className="mono">{a.data === hj ? a.hora : brCurto(a.data)}</span><span className="tf-nome">{p.nome}<small>{s.curto} · {a.hora}</small></span>
                    <a className="btn2 peq ic zap" href={linkWhats(p.telefone, msgRemarcar(base.clinica, p))} target="_blank" rel="noreferrer" title="Conversar no WhatsApp para remarcar" aria-label="Conversar no WhatsApp para remarcar"><Icone n="zap" /></a>
                    <BotaoIcone icone="calendario" titulo="Abrir a agenda do dia" cls="peq" onClick={() => nav('/agenda?data=' + a.data)} />
                    <BotaoIcone icone="check" titulo="Já tratei (remarcado ou mantido)" cls="peq verde" onClick={() => acoes.resolverRemarcar(a.id)} />
                  </li>
                );
              })}
              {auto && !paraConfirmar.length && confirmaramZap > 0 && <li className="t-cab">Confirmações de {amanha === somaDias(hj, 1) ? 'amanhã' : brCurto(amanha!)}<small className="t-sub">✅ {confirmaramZap} paciente{confirmaramZap > 1 ? 's' : ''} {confirmaramZap > 1 ? "confirmaram" : "confirmou"} pelo WhatsApp</small></li>}
              {paraConfirmar.length > 0 && <li className="t-cab">Confirmar {amanha && amanha === somaDias(hj, 1) ? 'amanhã' : brCurto(amanha!)} ({paraConfirmar.length}){auto && <small className="t-sub">lembrete automático pelo WhatsApp{confirmaramZap ? ` · ${confirmaramZap} já confirmaram ✅` : ''}</small>}</li>}
              {paraConfirmar.slice(0, 6).map((a) => {
                const p = nomeP(a.pacienteId), s = nomeS(a.servicoId);
                const w = a.whats;
                return (
                  <li key={a.id}>
                    <span className="mono">{a.hora}</span><span className="tf-nome">{p.nome}<small>{s.curto}
                      {w?.modo === 'auto' && w.lembreteEm && (w.resposta === 'remarcar' ? <em className="zap-st no"> · pediu remarcar</em> : w.processado ? <em className="zap-st"> · sem resposta</em> : <em className="zap-st"> · ⏳ aguardando resposta</em>)}
                      {w?.modo === 'manual' && w.lembreteEm && <em className="zap-st ok"> · lembrete enviado ✓</em>}
                    </small></span>
                    <a className={'btn2 peq ic zap' + (horaLembrete && !w?.lembreteEm ? ' pulsa' : '')} href={linkWhats(p.telefone, msgLembrete(base.clinica, p, s, a))} target="_blank" rel="noreferrer" title="Enviar lembrete pelo WhatsApp" aria-label="Enviar lembrete pelo WhatsApp"
                      onClick={() => !auto && acoes.registrarWhats(a.id, { modo: 'manual', lembreteEm: new Date().toISOString() })}><Icone n="zap" /></a>
                    <BotaoIcone icone="check" titulo="Marcar como confirmado" cls="peq verde" onClick={() => acoes.mudarStatus(a.id, 'confirmado')} />
                  </li>
                );
              })}
              {paraConfirmar.length > 6 && <li className="mut peq">+ {paraConfirmar.length - 6} na agenda</li>}
              {aReceber.length > 0 && <li className="t-cab">A receber hoje ({aReceber.length})</li>}
              {aReceber.map((a) => (
                <li key={a.id}><span className="mono">{a.hora}</span><span className="tf-nome">{nomeP(a.pacienteId).nome}<small>{nomeS(a.servicoId).curto}</small></span><b className="mono">{moeda(a.pagamento!.valor)}</b></li>
              ))}
              {!paraConfirmar.length && !aReceber.length && !remarcar.length && <li className="mut">Tudo em dia.</li>}
            </ul>
          </Bloco>
        </div>
      </div>
      {novo && <NovoAgendamento fechar={() => setNovo(false)} />}
    </>
  );
}
