// Agenda: visão do DIA (horários livres e ocupados) e da SEMANA (grade seg–sáb).
// Padrão dos sistemas de agendamento: UM controle de data no topo (‹ Hoje › + a data, que abre o calendário do mês),
// a grade ocupa a largura toda e o horário livre é uma linha discreta (o "+ Agendar" aparece ao passar o mouse).
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Agendamento } from '../tipos/modelos';
import { useDados } from '../componentes/Dados';
import { Bloco, Modal, TituloPagina } from '../componentes/Comuns';
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
  const [soVer, setSoVer] = useState<'livres' | 'agendados' | null>(null);   // filtro dos chips do dia
  const passo = visao === 'semana' ? 7 : 1;
  const lista = doDia(base, data);
  const sit = situacaoDia(data, base);
  const livres = sit.aberto ? blocosLivres(data, base, data === hj ? agoraMin() : undefined) : 0;
  const rotulo = visao === 'dia'
    ? extenso(data).replace(/ de \d{4}$/, '')
    : `${brCurto(inicioSemana(data))} a ${brCurto(somaDias(inicioSemana(data), 5))}`;
  const futuros = [...base.feriados.map((f) => ({ data: f.data, txt: f.nome, tipo: 'Feriado' })), ...base.bloqueios.map((b) => ({ data: b.data, txt: b.motivo, tipo: 'Bloqueio' }))]
    .filter((x) => x.data >= hj).sort((a, b) => a.data.localeCompare(b.data)).slice(0, 3);

  return (
    <>
      <TituloPagina titulo="Agenda">
        <div className="nav-data">
          <button type="button" className="icone-btn" title={visao === 'dia' ? 'Dia anterior' : 'Semana anterior'} aria-label="Anterior" onClick={() => ir(somaDias(data, -passo))}><Icone n="esq" /></button>
          <button type="button" className="btn2 peq" onClick={() => ir(hj)} disabled={data === hj}>Hoje</button>
          <button type="button" className="icone-btn" title={visao === 'dia' ? 'Próximo dia' : 'Próxima semana'} aria-label="Próximo" onClick={() => ir(somaDias(data, passo))}><Icone n="dir" /></button>
          <EscolherData rotulo={rotulo} data={data} ir={(d) => ir(d)} futuros={futuros} />
        </div>
        <div className="segmentado">
          <button type="button" className={visao === 'dia' ? 'sel' : ''} onClick={() => ir(data, 'dia')} title="Visão do dia"><Icone n="dia" /> Dia</button>
          <button type="button" className={visao === 'semana' ? 'sel' : ''} onClick={() => ir(data, 'semana')} title="Visão da semana"><Icone n="semana" /> Semana</button>
        </div>
        <button type="button" className="btn2 pri" onClick={() => setNovo({ data })}><Icone n="mais" /> Novo agendamento</button>
      </TituloPagina>

      {visao === 'dia' ? (
        <Bloco
          titulo={<><Icone n="dia" /> {data === hj ? 'Hoje' : nomeDiaCurto(data)}, {brCurto(data)}</>}
          extra={sit.aberto && <div className="chips-cab">
            <button type="button" className={'tag t-in' + (soVer === 'agendados' ? ' sel' : '')} title={soVer === 'agendados' ? 'Mostrar tudo' : 'Mostrar só os agendados'} aria-pressed={soVer === 'agendados'} onClick={() => setSoVer((x) => (x === 'agendados' ? null : 'agendados'))}>{lista.length} agendados</button>
            <button type="button" className={'tag t-ok' + (soVer === 'livres' ? ' sel' : '')} title={soVer === 'livres' ? 'Mostrar tudo' : 'Mostrar só os horários livres'} aria-pressed={soVer === 'livres'} onClick={() => setSoVer((x) => (x === 'livres' ? null : 'livres'))}>{livres} livres</button>
          </div>}
        >
          {!sit.aberto ? <div className="faixa-fechado"><Icone n="alerta" /> {sit.motivo} · agenda fechada neste dia</div> : (
            <div className="grade-dia">
              {gradeDoDia(data, base).map((l) => {
                if (soVer && l.tipo === 'intervalo') return null;
                if (soVer === 'livres' && l.tipo === 'ocupado') return null;
                if (soVer === 'agendados' && l.tipo === 'livre') return null;
                if (l.tipo === 'intervalo') return <div key={'i' + l.hora} className="gd-intervalo mono">{l.hora} – {l.ate} · intervalo</div>;
                if (l.tipo === 'ocupado') return <LinhaAgendamento key={l.ag.id} ag={l.ag} />;
                const passou = data < hj || (data === hj && min(l.hora) <= agoraMin());
                if (passou) return <div key={'l' + l.hora} className="gd-livre passou"><span className="mono">{l.hora}</span><span>horário passado</span></div>;
                return (
                  <button type="button" key={'l' + l.hora} className="gd-livre" title={`Agendar às ${l.hora}`} onClick={() => setNovo({ data, hora: l.hora })}>
                    <span className="mono">{l.hora}</span><span className="gd-txt">livre</span><span className="gd-mais"><Icone n="mais" /> Agendar</span>
                  </button>
                );
              })}
            </div>
          )}
        </Bloco>
      ) : (
        <Semana data={data} abrir={setDetalhe} irDia={(d) => ir(d, 'dia')} />
      )}

      {novo && <NovoAgendamento data={novo.data} hora={novo.hora} fechar={() => setNovo(null)} />}
      {detalhe && <Modal titulo={`${br(detalhe.data)} · ${detalhe.hora}`} fechar={() => setDetalhe(null)}><DetalheAg id={detalhe.id} /></Modal>}
    </>
  );
}

/** A data no topo: clicando, abre o calendário do mês (com os dias livres/lotados/fechados) e os próximos feriados e bloqueios. */
function EscolherData({ rotulo, data, ir, futuros }: { rotulo: string; data: string; ir: (d: string) => void; futuros: { data: string; txt: string; tipo: string }[] }) {
  const { base } = useDados();
  const hj = hoje();
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
    <div className="escolher-data" ref={caixa}>
      <button type="button" className={'ed-btn' + (aberto ? ' ativo' : '')} onClick={() => setAberto(!aberto)} title="Escolher a data no calendário" aria-expanded={aberto}>
        <Icone n="calendario" /> {rotulo}
      </button>
      {aberto && (
        <div className="ed-pop" role="dialog" aria-label="Calendário">
          <CalendarioMes key={data.slice(0, 7)} selecionado={data} aoEscolher={(d) => { ir(d); setAberto(false); }}
            info={(d) => { const s = situacaoDia(d, base); return { ...s, livres: s.aberto && d >= hj ? blocosLivres(d, base, d === hj ? agoraMin() : undefined) : 0 }; }} />
          {futuros.length > 0 && (
            <ul className="ed-fech">
              {futuros.map((x) => <li key={x.data}><b>{br(x.data)}</b> {x.txt}<small>{x.tipo} · agenda fechada</small></li>)}
            </ul>
          )}
        </div>
      )}
    </div>
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
                  <button type="button" key={a.id} className={'sem-ag tipo-' + s.tipo + ' st-' + a.status + (a.duracaoMin <= 30 ? ' curto' : '') + (a.encaixe ? ' encaixe' : '')} style={{ top: ((min(a.hora) - abre) / 30) * ALT + 1, height: (a.duracaoMin / 30) * ALT - 2 }} onClick={() => abrir(a)} title={`${a.hora} · ${p.nome} · ${s.nome}${a.encaixe ? ' · encaixe' : ''}`}>
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
