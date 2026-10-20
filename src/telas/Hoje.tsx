// Tela inicial: o que tem para fazer hoje. Recepção e Dra. veem a mesma agenda; cada uma com as suas ações.
// A Dra. vê também o "próximo paciente" em destaque. Nada de gráfico aqui: o BI fica em página própria.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDados } from '../componentes/Dados';
import { useSessao } from '../acesso/Sessao';
import { Bloco, BotaoIcone, TagStatus, TituloPagina, Vazio } from '../componentes/Comuns';
import { Icone } from '../componentes/Icone';
import { LinhaAgendamento } from '../componentes/LinhaAgendamento';
import { NovoAgendamento } from '../componentes/NovoAgendamento';
import { aConfirmar, contagem, doDia, proximoPaciente } from '../regras/agenda';
import { situacaoDia } from '../regras/disponibilidade';
import { idade } from '../regras/paciente';
import { agoraMin, brCurto, extenso, hoje, nomeDiaCurto, somaDias } from '../util/datas';
import { linkWhats, moeda } from '../util/formato';

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
  const prox = medica ? proximoPaciente(lista, agoraMin()) : undefined;

  // próximos dias de atendimento (até 6)
  const proximos: string[] = [];
  for (let i = 1; proximos.length < 6 && i < 30; i++) { const d = somaDias(hj, i); if (situacaoDia(d, base).aberto) proximos.push(d); }
  const amanha = proximos[0];
  const confirmar = amanha ? aConfirmar(base, amanha) : [];
  const aReceber = lista.filter((a) => a.pagamento?.status === 'pendente' && ['chegou', 'em_atendimento', 'atendido'].includes(a.status));
  const nomeP = (id: string) => base.pacientes.find((p) => p.id === id)!;
  const nomeS = (id: string) => base.servicos.find((s) => s.id === id)!;

  return (
    <>
      <TituloPagina titulo={`${saudacao()}, ${usuario!.nome}`} sub={extenso(hj)}>
        <BotaoIcone icone="pacienteMais" titulo="Novo paciente" onClick={() => nav('/pacientes/novo')} />
        <BotaoIcone icone="mais" titulo="Novo agendamento" pri onClick={() => setNovo(true)} />
      </TituloPagina>

      <div className="contadores">
        <div><Icone n="calendario" /><b>{c.total}</b><span>pacientes hoje</span></div>
        <div><Icone n="porta" /><b>{c.aguardando}</b><span>na recepção</span></div>
        <div><Icone n="check" /><b>{c.atendidos}</b><span>atendidos</span></div>
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
                <Link to={'/pacientes/' + p.id} className="px-nome">{p.nome}</Link>
                <div className="mut">{idade(p.nascimento, hj)} anos · {s.nome}</div>
                {ult ? <div className="px-ult"><Icone n="pulso" /> Última consulta {brCurto(ult.data)}: {ult.cid} · {ult.cidDescricao}{ult.pa ? ` · PA ${ult.pa}` : ''}</div> : <div className="px-ult"><Icone n="info" /> Primeira consulta na clínica</div>}
              </div>
              <TagStatus s={prox.status} />
              <div className="px-acoes">
                <BotaoIcone icone="arquivo" titulo="Ver histórico do paciente" onClick={() => nav('/pacientes/' + p.id)} />
                {prox.status !== 'em_atendimento'
                  ? <BotaoIcone icone="play" titulo="Chamar / iniciar atendimento" pri onClick={() => acoes.mudarStatus(prox.id, 'em_atendimento')} />
                  : <BotaoIcone icone="check" titulo="Finalizar atendimento" pri onClick={() => acoes.mudarStatus(prox.id, 'atendido')} />}
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
              {confirmar.length > 0 && <li className="t-cab">Confirmar {amanha && amanha === somaDias(hj, 1) ? 'amanhã' : brCurto(amanha!)} ({confirmar.length})</li>}
              {confirmar.slice(0, 5).map((a) => {
                const p = nomeP(a.pacienteId), s = nomeS(a.servicoId);
                const msg = `Olá, ${p.nome.split(' ')[0]}! Confirmando seu horário na clínica da ${base.clinica.medica}: ${s.nome}, ${extenso(a.data)}, às ${a.hora}. Podemos confirmar?`;
                return (
                  <li key={a.id}>
                    <span className="mono">{a.hora}</span><span className="tf-nome">{p.nome}<small>{s.curto}</small></span>
                    <a className="btn2 peq ic zap" href={linkWhats(p.telefone, msg)} target="_blank" rel="noreferrer" title="Enviar confirmação pelo WhatsApp" aria-label="Enviar confirmação pelo WhatsApp"><Icone n="zap" /></a>
                    <BotaoIcone icone="check" titulo="Marcar como confirmado" cls="peq verde" onClick={() => acoes.mudarStatus(a.id, 'confirmado')} />
                  </li>
                );
              })}
              {confirmar.length > 5 && <li className="mut peq">+ {confirmar.length - 5} na agenda</li>}
              {aReceber.length > 0 && <li className="t-cab">A receber hoje ({aReceber.length})</li>}
              {aReceber.map((a) => (
                <li key={a.id}><span className="mono">{a.hora}</span><span className="tf-nome">{nomeP(a.pacienteId).nome}<small>{nomeS(a.servicoId).curto}</small></span><b className="mono">{moeda(a.pagamento!.valor)}</b></li>
              ))}
              {!confirmar.length && !aReceber.length && <li className="mut">Tudo em dia.</li>}
            </ul>
          </Bloco>
        </div>
      </div>
      {novo && <NovoAgendamento fechar={() => setNovo(false)} />}
    </>
  );
}
