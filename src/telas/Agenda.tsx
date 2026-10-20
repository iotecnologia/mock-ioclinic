// Agenda: visão do DIA (horários livres e ocupados, com "+" no horário livre) e da SEMANA (grade seg–sáb).
// Ao lado, o calendário do mês mostra quais dias ainda têm horário.
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Agendamento } from '../tipos/modelos';
import { useDados } from '../componentes/Dados';
import { Bloco, BotaoIcone, Modal, TituloPagina, Vazio } from '../componentes/Comuns';
import { Icone } from '../componentes/Icone';
import { CalendarioMes } from '../componentes/CalendarioMes';
import { LinhaAgendamento } from '../componentes/LinhaAgendamento';
import { NovoAgendamento } from '../componentes/NovoAgendamento';
import { blocosLivres, faixasDoDia, gradeDoDia, situacaoDia } from '../regras/disponibilidade';
import { doDia } from '../regras/agenda';
import { agoraMin, br, brCurto, extenso, hhmm, hoje, inicioSemana, min, nomeDiaCurto, somaDias } from '../util/datas';

type Visao = 'dia' | 'semana';

export function Agenda() {
  const { base } = useDados();
  const [params, setParams] = useSearchParams();
  const hj = hoje();
  const data = params.get('data') ?? hj;
  const visao: Visao = params.get('visao') === 'semana' ? 'semana' : 'dia';
  const ir = (d: string, v: Visao = visao) => setParams({ data: d, visao: v }, { replace: true });
  const [novo, setNovo] = useState<{ data?: string; hora?: string } | null>(null);
  const [detalhe, setDetalhe] = useState<Agendamento | null>(null);
  const passo = visao === 'semana' ? 7 : 1;
  const lista = doDia(base, data);
  const sit = situacaoDia(data, base);
  const livres = sit.aberto ? blocosLivres(data, base, data === hj ? agoraMin() : undefined) : 0;
  const futuros = [...base.feriados.map((f) => ({ data: f.data, txt: f.nome, tipo: 'Feriado' })), ...base.bloqueios.map((b) => ({ data: b.data, txt: b.motivo, tipo: 'Bloqueio' }))]
    .filter((x) => x.data >= hj).sort((a, b) => a.data.localeCompare(b.data)).slice(0, 4);

  return (
    <>
      <TituloPagina titulo="Agenda" sub={visao === 'dia' ? extenso(data) : `Semana de ${br(inicioSemana(data))} a ${br(somaDias(inicioSemana(data), 5))}`}>
        <div className="nav-data">
          <button type="button" className="icone-btn" title={visao === 'dia' ? 'Dia anterior' : 'Semana anterior'} aria-label="Anterior" onClick={() => ir(somaDias(data, -passo))}><Icone n="esq" /></button>
          <button type="button" className="btn2 peq" onClick={() => ir(hj)} disabled={data === hj}>Hoje</button>
          <button type="button" className="icone-btn" title={visao === 'dia' ? 'Próximo dia' : 'Próxima semana'} aria-label="Próximo" onClick={() => ir(somaDias(data, passo))}><Icone n="dir" /></button>
        </div>
        <div className="segmentado">
          <button type="button" className={visao === 'dia' ? 'sel' : ''} onClick={() => ir(data, 'dia')} title="Visão do dia"><Icone n="dia" /> Dia</button>
          <button type="button" className={visao === 'semana' ? 'sel' : ''} onClick={() => ir(data, 'semana')} title="Visão da semana"><Icone n="semana" /> Semana</button>
        </div>
        <BotaoIcone icone="mais" titulo="Novo agendamento" pri onClick={() => setNovo({ data })} />
      </TituloPagina>

      {visao === 'dia' ? (
        <div className="grade2">
          <Bloco
            titulo={<><Icone n="dia" /> Horários de {nomeDiaCurto(data).toLowerCase()}, {brCurto(data)}</>}
            extra={sit.aberto && <div className="chips-cab"><span className="tag t-ok">{livres} livres</span><span className="tag t-in">{lista.length} agendados</span></div>}
          >
            {!sit.aberto ? <Vazio>{sit.motivo}</Vazio> : (
              <div className="grade-dia">
                {gradeDoDia(data, base).map((l) => {
                  if (l.tipo === 'intervalo') return <div key={'i' + l.hora} className="gd-intervalo mono">{l.hora} – {l.ate} · intervalo</div>;
                  if (l.tipo === 'ocupado') return <LinhaAgendamento key={l.ag.id} ag={l.ag} />;
                  const passou = data < hj || (data === hj && min(l.hora) <= agoraMin());
                  return (
                    <div key={'l' + l.hora} className={'gd-livre' + (passou ? ' passou' : '')}>
                      <span className="mono">{l.hora}</span><span>{passou ? 'horário passado' : 'Horário livre'}</span>
                      {!passou && <BotaoIcone icone="mais" titulo={`Agendar às ${l.hora}`} cls="peq livre" onClick={() => setNovo({ data, hora: l.hora })} />}
                    </div>
                  );
                })}
              </div>
            )}
          </Bloco>
          <div className="pilha">
            <div className="bloco cal-bloco">
              <CalendarioMes key={data.slice(0, 7)} selecionado={data} aoEscolher={(d) => ir(d)}
                info={(d) => { const s = situacaoDia(d, base); return { ...s, livres: s.aberto && d >= hj ? blocosLivres(d, base, d === hj ? agoraMin() : undefined) : 0 }; }} />
            </div>
            <Bloco titulo={<><Icone n="alerta" /> Feriados e bloqueios</>}>
              <ul className="feed">
                {futuros.map((x) => <li key={x.data}><span className="dot"><Icone n="calendario" /></span><div><b>{br(x.data)}</b> · {x.txt}<small>{x.tipo} · agenda fechada</small></div></li>)}
              </ul>
            </Bloco>
          </div>
        </div>
      ) : (
        <Semana data={data} abrir={setDetalhe} irDia={(d) => ir(d, 'dia')} />
      )}

      {novo && <NovoAgendamento data={novo.data} hora={novo.hora} fechar={() => setNovo(null)} />}
      {detalhe && <Modal titulo={`${br(detalhe.data)} · ${detalhe.hora}`} fechar={() => setDetalhe(null)}><DetalheAg id={detalhe.id} /></Modal>}
    </>
  );
}

/** Mostra a linha sempre atualizada (o status muda dentro do modal). */
function DetalheAg({ id }: { id: string }) {
  const { base } = useDados();
  const ag = base.agendamentos.find((a) => a.id === id)!;
  return <div className="lista-ag"><LinhaAgendamento ag={ag} /></div>;
}

const ALT = 34; // px por 30 min
function Semana({ data, abrir, irDia }: { data: string; abrir: (a: Agendamento) => void; irDia: (d: string) => void }) {
  const { base } = useDados();
  const ini = inicioSemana(data);
  const dias = Array.from({ length: 6 }, (_, i) => somaDias(ini, i));
  const todas = dias.flatMap((d) => faixasDoDia(d, base));
  const abre = todas.length ? Math.min(...todas.map((f) => f.inicio)) : 8 * 60;
  const fecha = todas.length ? Math.max(...todas.map((f) => f.fim)) : 18 * 60;
  const linhas = Array.from({ length: (fecha - abre) / 30 }, (_, i) => abre + i * 30);
  const hj = hoje();
  return (
    <div className="bloco semana">
      <div className="sem-cab">
        <span />
        {dias.map((d) => <button type="button" key={d} className={'sem-dia' + (d === hj ? ' hoje' : '')} onClick={() => irDia(d)} title="Abrir o dia"><b>{nomeDiaCurto(d)}</b>{brCurto(d)}</button>)}
      </div>
      <div className="sem-corpo" style={{ height: linhas.length * ALT }}>
        <div className="sem-horas">{linhas.map((m) => <span key={m} className="mono" style={{ height: ALT }}>{m % 60 === 0 ? hhmm(m) : ''}</span>)}</div>
        {dias.map((d) => {
          const sit = situacaoDia(d, base);
          const faixas = faixasDoDia(d, base);
          return (
            <div key={d} className={'sem-col' + (sit.aberto ? '' : ' fechada')}>
              {linhas.map((m) => <div key={m} className={'sem-cel' + (faixas.some((f) => m >= f.inicio && m < f.fim) ? '' : ' fora')} style={{ height: ALT }} />)}
              {!sit.aberto && <div className="sem-motivo">{sit.motivo}</div>}
              {doDia(base, d).map((a) => {
                const p = base.pacientes.find((x) => x.id === a.pacienteId)!;
                const s = base.servicos.find((x) => x.id === a.servicoId)!;
                return (
                  <button type="button" key={a.id} className={'sem-ag tipo-' + s.tipo + ' st-' + a.status + (a.duracaoMin <= 30 ? ' curto' : '')} style={{ top: ((min(a.hora) - abre) / 30) * ALT + 1, height: (a.duracaoMin / 30) * ALT - 2 }} onClick={() => abrir(a)} title={`${a.hora} · ${p.nome} · ${s.nome}`}>
                    <span className="mono">{a.hora}</span> {p.nome.split(' ')[0]} {p.nome.split(' ').slice(-1)[0][0]}.<small>{a.duracaoMin <= 30 ? '· ' : ''}{s.curto}</small>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
      <div className="sem-leg"><span><i className="tipo-consulta" /> consulta</span><span><i className="tipo-retorno" /> retorno</span><span><i className="tipo-exame" /> exame</span></div>
    </div>
  );
}
