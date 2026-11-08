// Agenda: um lugar só para escolher a data — o calendário fixo à esquerda (com "Hoje" no cabeçalho).
// À direita, a grade do dia (ou da semana), com "Dia | Semana" no canto da própria grade.
// Topo só com o título e o "Novo agendamento". Horário livre é uma linha discreta ("+ Agendar" ao passar o mouse).
import { useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Agendamento } from '../tipos/modelos';
import { useDados } from '../componentes/Dados';
import { Bloco, Modal, TagStatus, TituloPagina } from '../componentes/Comuns';
import { Icone } from '../componentes/Icone';
import { CalendarioMes } from '../componentes/CalendarioMes';
import { LinhaAgendamento } from '../componentes/LinhaAgendamento';
import { NovoAgendamento } from '../componentes/NovoAgendamento';
import { blocosLivres, faixasDoDia, gradeDoDia, situacaoDia } from '../regras/disponibilidade';
import { doDia } from '../regras/agenda';
import { agoraMin, br, brCurto, hhmm, hoje, inicioSemana, min, nomeDiaCurto, somaDias } from '../util/datas';

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
  const lista = doDia(base, data);
  const sit = situacaoDia(data, base);
  const livres = sit.aberto ? blocosLivres(data, base, data === hj ? agoraMin() : undefined) : 0;
  // próximos feriados e bloqueios (embaixo do calendário; clicar abre o dia)
  const fechados = [...base.feriados.map((f) => ({ data: f.data, txt: f.nome, tipo: 'Feriado' })), ...base.bloqueios.map((b) => ({ data: b.data, txt: b.motivo, tipo: 'Bloqueio' }))]
    .filter((x) => x.data >= hj).sort((a, b) => a.data.localeCompare(b.data)).slice(0, 4);
  const info = (d: string) => { const x = situacaoDia(d, base); return { ...x, livres: x.aberto && d >= hj ? blocosLivres(d, base, d === hj ? agoraMin() : undefined) : 0 }; };
  const trocaVisao = (
    <div className="segmentado peq">
      <button type="button" className={visao === 'dia' ? 'sel' : ''} onClick={() => ir(data, 'dia')} title="Ver o dia"><Icone n="dia" /> Dia</button>
      <button type="button" className={visao === 'semana' ? 'sel' : ''} onClick={() => ir(data, 'semana')} title="Ver a semana"><Icone n="semana" /> Semana</button>
    </div>
  );

  return (
    <>
      <TituloPagina titulo="Agenda">
        <button type="button" className="btn2 pri" onClick={() => setNovo({ data })}><Icone n="mais" /> Novo agendamento</button>
      </TituloPagina>

      <div className="agenda-lay">
        <div className="bloco cal-bloco agenda-cal">
          <CalendarioMes key={data.slice(0, 7)} selecionado={data} aoEscolher={(d) => ir(d)} irHoje={() => ir(hj)} info={info} />
          {fechados.length > 0 && (
            <div className="cal-fech">
              <div className="cal-fech-tit"><Icone n="alerta" /> Feriados e bloqueios</div>
              {fechados.map((x) => (
                <button type="button" key={x.data} className={x.data === data ? 'sel' : ''} onClick={() => ir(x.data)} title={`${x.tipo} · agenda fechada · abrir o dia`}>
                  <span className="mono">{brCurto(x.data)}</span><span className="cf-txt">{x.txt}</span><small>{x.tipo}</small>
                </button>
              ))}
            </div>
          )}
        </div>
      {visao === 'dia' ? (
        <Bloco className="agenda-grade"
          titulo={<><Icone n="dia" /> {data === hj ? 'Hoje' : nomeDiaCurto(data)}, {brCurto(data)}</>}
          extra={<div className="chips-cab">{sit.aberto && <>
            <button type="button" className={'tag t-in' + (soVer === 'agendados' ? ' sel' : '')} title={soVer === 'agendados' ? 'Mostrar tudo' : 'Mostrar só os agendados'} aria-pressed={soVer === 'agendados'} onClick={() => setSoVer((x) => (x === 'agendados' ? null : 'agendados'))}>{lista.length} agendados</button>
            <button type="button" className={'tag t-ok' + (soVer === 'livres' ? ' sel' : '')} title={soVer === 'livres' ? 'Mostrar tudo' : 'Mostrar só os horários livres'} aria-pressed={soVer === 'livres'} onClick={() => setSoVer((x) => (x === 'livres' ? null : 'livres'))}>{livres} livres</button>
          </>}{trocaVisao}</div>}
        >
          {!sit.aberto ? <div className="faixa-fechado"><Icone n="alerta" /> {sit.motivo} · agenda fechada neste dia</div> : (
            <div className="periodos">
              {faixasDoDia(data, base).map((f) => {
                const linhas = gradeDoDia(data, base).filter((l) => l.tipo !== 'intervalo' && min(l.hora) >= f.inicio && min(l.hora) < f.fim);
                const ags = linhas.flatMap((l) => (l.tipo === 'ocupado' ? [l.ag] : []));
                const livresP = linhas.filter((l) => l.tipo === 'livre' && !(data < hj || (data === hj && min(l.hora) <= agoraMin()))).map((l) => l.hora);
                const nome = f.inicio < 12 * 60 ? 'Manhã' : f.inicio < 18 * 60 ? 'Tarde' : 'Noite';
                return (
                  <section key={f.inicio} className="periodo">
                    <div className="per-cab"><b>{nome}</b><span className="mono">{hhmm(f.inicio)}–{hhmm(f.fim)}</span><small>{ags.length} agendado{ags.length !== 1 ? 's' : ''} · {livresP.length} livre{livresP.length !== 1 ? 's' : ''}</small></div>
                    {soVer !== 'livres' && ags.map((ag) => <LinhaLimpa key={ag.id} ag={ag} abrir={() => setDetalhe(ag)} />)}
                    {soVer !== 'agendados' && (livresP.length > 0
                      ? <div className="per-livres"><span>Livres</span>{livresP.map((h) => <button type="button" key={h} className="hora-livre mono" title={`Agendar às ${h}`} onClick={() => setNovo({ data, hora: h })}>{h}</button>)}</div>
                      : <div className="per-livres mut">Sem horário livre neste período.</div>)}
                  </section>
                );
              })}
            </div>
          )}
        </Bloco>
      ) : (
        <Semana data={data} abrir={setDetalhe} irDia={(d) => ir(d, 'dia')} troca={trocaVisao} />
      )}
      </div>

      {novo && <NovoAgendamento data={novo.data} hora={novo.hora} fechar={() => setNovo(null)} />}
      {detalhe && <Modal titulo={`${br(detalhe.data)} · ${detalhe.hora}`} fechar={() => setDetalhe(null)}><DetalheAg id={detalhe.id} /></Modal>}
    </>
  );
}

/** Linha limpa da Agenda do dia: só hora, paciente, serviço e situação. Clicar abre o detalhe com as ações. */
function LinhaLimpa({ ag, abrir }: { ag: Agendamento; abrir: () => void }) {
  const { base } = useDados();
  const p = base.pacientes.find((x) => x.id === ag.pacienteId)!;
  const s = base.servicos.find((x) => x.id === ag.servicoId)!;
  return (
    <button type="button" className={'linha-limpa st-' + ag.status} onClick={abrir} title="Abrir: confirmar, chegou, receber, cancelar…">
      <span className="mono">{ag.hora}</span>
      <i className={'ll-barra tipo-' + s.tipo} />
      <span className="ll-nome">{p.nome}</span>
      <span className={'ll-serv tipo tipo-' + s.tipo}>{s.curto}</span>
      <TagStatus s={ag.status} />
    </button>
  );
}

/** Mostra a linha sempre atualizada (o status muda dentro do modal). */
function DetalheAg({ id }: { id: string }) {
  const { base } = useDados();
  const ag = base.agendamentos.find((a) => a.id === id)!;
  return <div className="lista-ag"><LinhaAgendamento ag={ag} /></div>;
}

const ALT = 34; // px por 30 min
function Semana({ data, abrir, irDia, troca }: { data: string; abrir: (a: Agendamento) => void; irDia: (d: string) => void; troca: ReactNode }) {
  const { base } = useDados();
  const ini = inicioSemana(data);
  const dias = Array.from({ length: 6 }, (_, i) => somaDias(ini, i));
  const todas = dias.flatMap((d) => faixasDoDia(d, base));
  const abre = todas.length ? Math.min(...todas.map((f) => f.inicio)) : 8 * 60;
  const fecha = todas.length ? Math.max(...todas.map((f) => f.fim)) : 18 * 60;
  const linhas = Array.from({ length: (fecha - abre) / 30 }, (_, i) => abre + i * 30);
  const hj = hoje();
  return (
    <Bloco className="agenda-grade" titulo={<><Icone n="semana" /> Semana de {brCurto(ini)} a {brCurto(somaDias(ini, 5))}</>} extra={<div className="chips-cab">{troca}</div>}>
    <div className="semana">
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
    </Bloco>
  );
}
