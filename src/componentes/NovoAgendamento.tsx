// Novo agendamento em passos (mesmo padrão do "Agendar passo a passo" do Analiza):
// 1 Paciente → 2 Serviço → 3 Dia e horário (só mostra o que está livre) → 4 Confirmar.
// Paciente novo: PRÉ-CADASTRO aqui mesmo (nome digitado na busca + WhatsApp). O cadastro completo é feito
// pela recepção quando ele chega; se faltar ou cancelar, o pré-cadastro é apagado (regras/paciente.ts).
// Dia sem horário livre: ENCAIXE em qualquer horário da grade (fica marcado na agenda).
// VÁRIOS SERVIÇOS de uma vez (ex.: Consulta + ECG + Eco): ficam em SEQUÊNCIA no mesmo dia; o sistema só mostra
// horários em que todos cabem seguidos, e cria uma linha na agenda para cada serviço.
import { useMemo, useState } from 'react';
import type { Agendamento, Paciente, Servico } from '../tipos/modelos';
import { useDados } from './Dados';
import { Modal } from './Comuns';
import { Icone } from './Icone';
import { CalendarioMes } from './CalendarioMes';
import { buscarPacientes, idade, idadeTxt } from '../regras/paciente';
import { blocosLivres, horariosEncaixe, horariosLivres, situacaoDia } from '../regras/disponibilidade';
import { agoraMin, br, extenso, hhmm, hoje, min, somaDias } from '../util/datas';
import { digitos, linkWhats, mascaraTelefone, moeda } from '../util/formato';
import { msgAgendamento } from '../regras/mensagens';
import { useWhatsAuto } from './WhatsAuto';

const PASSOS = ['Paciente', 'Serviço', 'Dia e horário', 'Confirmar'];
const PRE = '__pre';   // paciente ainda não gravado: o pré-cadastro só é salvo ao confirmar o agendamento

export function NovoAgendamento({ fechar, pacienteId, data, hora, servicoId, servicoIds, aoAgendar }: { fechar: () => void; pacienteId?: string; data?: string; hora?: string; servicoId?: string; servicoIds?: string[]; aoAgendar?: (a: Agendamento) => void }) {
  const { base, acoes } = useDados();
  const hj = hoje();
  const [auto] = useWhatsAuto();
  const inicial = servicoIds?.length ? servicoIds : servicoId ? [servicoId] : [];
  const [passo, setPasso] = useState(pacienteId ? (inicial.length ? 2 : 1) : 0);
  const [pac, setPac] = useState<string | undefined>(pacienteId);
  const [servs, setServs] = useState<string[]>(inicial);   // serviços escolhidos, na ordem em que acontecem
  const serv = servs.length ? servs.join('+') : undefined;
  const durDe = (ids: string[]) => ids.reduce((t, id) => t + (base.servicos.find((x) => x.id === id)?.duracaoMin ?? 0), 0);
  const [dia, setDia] = useState<string>(() => {
    let d = data && data >= hj ? data : hj;
    const dur0 = durDe(inicial);
    // vai para o primeiro dia (a partir da data sugerida) em que todos os serviços cabem
    if (dur0) for (let i = 0; i < 90 && !horariosLivres(d, dur0, base, { agoraMin: d === hj ? agoraMin() : undefined }).length; i++) d = somaDias(d, 1);
    return d;
  });
  const [hr, setHr] = useState<string | undefined>(hora);
  const [busca, setBusca] = useState('');
  const [feito, setFeito] = useState<Agendamento | null>(null);
  const [feitos, setFeitos] = useState<Agendamento[]>([]);
  const [pre, setPre] = useState<{ nome: string; telefone: string; nascimento: string } | null>(null);   // formulário do pré-cadastro aberto
  const [preErro, setPreErro] = useState('');
  const [encaixe, setEncaixe] = useState(false);       // horário escolhido é encaixe
  const [verEncaixe, setVerEncaixe] = useState(false); // mostrando a grade de encaixe

  const preDados: Paciente | undefined = pac === PRE && pre
    ? { id: PRE, nome: pre.nome.trim(), telefone: pre.telefone, cpf: '', nascimento: pre.nascimento, sexo: 'O', consentimentoLgpd: false, criadoEm: hj, situacao: 'pre' }
    : undefined;
  const paciente = preDados ?? base.pacientes.find((p) => p.id === pac);
  // os serviços escolhidos viram um "serviço combinado" (duração e valor somados) para achar o horário em sequência
  const escolhidos = servs.map((id) => base.servicos.find((s) => s.id === id)!).filter(Boolean);
  const servico: Servico | undefined = escolhidos.length <= 1 ? escolhidos[0] : {
    ...escolhidos[0], id: serv!, nome: escolhidos.map((s) => s.nome).join(' + '), curto: escolhidos.map((s) => s.curto).join(' + '),
    duracaoMin: durDe(servs), valor: escolhidos.reduce((t, s) => t + s.valor, 0),
    preparo: escolhidos.filter((s) => s.preparo).map((s) => (escolhidos.length > 1 ? `${s.curto}: ${s.preparo}` : s.preparo)).join(' · ') || undefined,
  };
  /** Horário de cada serviço na sequência, a partir do horário escolhido. */
  const sequencia = (inicio: string) => {
    let t = min(inicio);
    return escolhidos.map((s) => { const h = hhmm(t); t += s.duracaoMin; return { s, hora: h }; });
  };
  const livres = useMemo(
    () => (servico ? horariosLivres(dia, servico.duracaoMin, base, { agoraMin: dia === hj ? agoraMin() : undefined }) : []),
    [servico, dia, base, hj],
  );
  // retorno: houve consulta nos últimos 30 dias?
  const consultaRecente = paciente && base.agendamentos.some((a) => a.pacienteId === paciente.id && a.servicoId === 'consulta' && a.status === 'atendido' && a.data >= somaDias(hj, -30));
  const ok = [!!paciente, !!serv, !!hr && (encaixe || livres.includes(hr)), true];
  const sit = situacaoDia(dia, base);
  const encaixes = sit.aberto && verEncaixe ? horariosEncaixe(dia, base, dia === hj ? agoraMin() : undefined) : [];
  const mudaDia = (d: string) => { setDia(d); setHr(undefined); setEncaixe(false); setVerEncaixe(false); };

  // abre o pré-cadastro já com o que foi digitado na busca (nome, ou telefone se digitou só números)
  const abrirPre = () => {
    const soNumero = /^[\d\s()+-]+$/.test(busca.trim()) && digitos(busca).length >= 8;
    setPre({ nome: soNumero ? '' : busca.trim(), telefone: soNumero ? mascaraTelefone(busca) : '', nascimento: '' });
    setPreErro('');
  };
  const continuarPre = () => {
    if (!pre) return;
    if (pre.nome.trim().split(/\s+/).length < 2) return setPreErro('Informe nome e sobrenome.');
    if (digitos(pre.telefone).length < 10) return setPreErro('Informe o WhatsApp com DDD.');
    if (!pre.nascimento) return setPreErro('Informe a data de nascimento (para saber a idade do paciente).');
    if (pre.nascimento > hj || pre.nascimento < '1900-01-01') return setPreErro('Data de nascimento inválida.');
    setPac(PRE); setPasso(1);
  };

  const confirmar = () => {
    let pacienteId = pac!;
    if (pac === PRE && preDados) {
      const { id: _id, criadoEm: _c, ...dados } = preDados;
      const novo = acoes.salvarPaciente(dados);
      pacienteId = novo.id; setPac(novo.id); setPre(null);
    }
    // uma linha na agenda para cada serviço, em sequência
    const criados = sequencia(hr!).map(({ s, hora: h }) => acoes.agendar({
      pacienteId, servicoId: s.id, data: dia, hora: h, duracaoMin: s.duracaoMin, ...(encaixe ? { encaixe: true } : {}),
      // WhatsApp automático ligado: a confirmação "sai" junto com o agendamento (no mock, simulado)
      ...(auto ? { whats: { modo: 'auto' as const, confirmacaoEm: new Date().toISOString() } } : {}),
    }));
    setFeito(criados[0]); setFeitos(criados);
    aoAgendar?.(criados[0]);
  };

  if (feito && paciente && servico) {
    const msg = msgAgendamento(base.clinica, paciente, servico, feito);
    const atual = base.agendamentos.find((x) => x.id === feito.id) ?? feito;
    const w = atual.whats;
    return (
      <Modal titulo="Agendamento feito" fechar={fechar}>
        <div className="feito">
          <div className="feito-ok"><Icone n="check" /></div>
          <h3>{paciente.nome}</h3>
          {feitos.length > 1
            ? <p><b>{extenso(feito.data)}</b><br />{feitos.map((f) => <span key={f.id} className="feito-seq"><b className="mono">{f.hora}</b> {base.servicos.find((s) => s.id === f.servicoId)?.nome}</span>)}</p>
            : <p>{servico.nome}<br /><b>{extenso(feito.data)} · {feito.hora}</b></p>}
          {(feito.encaixe || paciente.situacao === 'pre') && <p className="feito-tags">{feito.encaixe && <span className="tag t-at">encaixe</span>}{paciente.situacao === 'pre' && <span className="tag t-in">pré-cadastro · completar na chegada</span>}</p>}
          {w?.modo === 'auto' ? (
            <div className="whats-env">
              <div className="whats-st"><Icone n="zap" /> Confirmação enviada automaticamente para {paciente.telefone}
                {w.resposta === 'confirmou' ? <span className="tag t-ok">paciente confirmou ✅</span>
                  : w.resposta === 'remarcar' ? <span className="tag t-no">pediu para remarcar</span>
                  : <span className="tag t-in">aguardando resposta…</span>}
              </div>
              <div className="bolha-whats">{msg}</div>
              <small className="mut">Demonstração: no sistema final o envio é real, pela API oficial do WhatsApp Business.</small>
            </div>
          ) : (
            <>
              <div className="bolha-whats">{msg}</div>
              {w?.confirmacaoEm && <div className="certo-peq"><Icone n="check" /> WhatsApp aberto para envio. A resposta do paciente chega no WhatsApp da clínica.</div>}
            </>
          )}
          <div className="rodape-modal centro">
            {w?.modo !== 'auto' && <a className="btn2 zap" href={linkWhats(paciente.telefone, msg)} target="_blank" rel="noreferrer" onClick={() => feitos.forEach((f) => acoes.registrarWhats(f.id, { modo: 'manual', confirmacaoEm: new Date().toISOString() }))}><Icone n="zap" /> Enviar confirmação</a>}
            <button type="button" className="btn2" onClick={fechar}>Fechar</button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal titulo="Novo agendamento" fechar={fechar} largo>
      <div className="passos">
        {PASSOS.map((p, i) => (
          <button type="button" key={p} className={(i === passo ? 'atual' : '') + (i < passo && ok[i] ? ' ok' : '')} disabled={i > 0 && !ok.slice(0, i).every(Boolean)} onClick={() => setPasso(i)}>
            <span className="n">{i < passo && ok[i] ? <Icone n="check" /> : i + 1}</span>{p}
          </button>
        ))}
      </div>

      {passo === 0 && !pre && (() => {
        const achados = buscarPacientes(base.pacientes.filter((p) => p.situacao !== 'removido'), busca).slice(0, busca ? 8 : 6);
        return (
          <div className="etapa">
            <div className="f-busca"><Icone n="busca" /><input type="text" autoFocus value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome, CPF ou telefone do paciente" /></div>
            <div className="lista-pac">
              {achados.map((p) => (
                <button type="button" key={p.id} className={'pac-op' + (pac === p.id ? ' sel' : '')} onClick={() => { setPac(p.id); setPasso(1); }}>
                  <b>{p.nome}</b><small>{idadeTxt(p, hj)} · {p.telefone}</small>
                </button>
              ))}
            </div>
            {busca.trim().length >= 2 && !achados.length && <div className="aviso"><Icone n="info" /> Nenhum paciente com “{busca.trim()}”. Faça o pré-cadastro: o cadastro completo é feito quando ele chegar.</div>}
            <button type="button" className={'btn2' + (busca.trim().length >= 2 && !achados.length ? ' pri' : '')} onClick={abrirPre}>
              <Icone n="pacienteMais" /> {busca.trim().length >= 2 && !/^[\d\s()+-]+$/.test(busca.trim()) ? `Pré-cadastrar “${busca.trim()}”` : 'Pré-cadastrar paciente novo'}
            </button>
          </div>
        );
      })()}

      {passo === 0 && pre && (
        <div className="etapa">
          <div className="form-pre">
            <label>Nome completo *<input autoFocus={!pre.nome} value={pre.nome} onChange={(e) => setPre({ ...pre, nome: e.target.value })} /></label>
            <label>WhatsApp *<input autoFocus={!!pre.nome} value={pre.telefone} inputMode="tel" onChange={(e) => setPre({ ...pre, telefone: mascaraTelefone(e.target.value) })} placeholder="(19) 90000-0000" /></label>
            <label>Data de nascimento *<input type="date" value={pre.nascimento} max={hj} onChange={(e) => setPre({ ...pre, nascimento: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && continuarPre()} />{pre.nascimento && pre.nascimento <= hj && <small className="mut">{idade(pre.nascimento, hj)} anos</small>}</label>
          </div>
          <p className="mut peq">Pré-cadastro: nome, WhatsApp (para confirmar a consulta) e data de nascimento (idade). CPF, endereço e o termo LGPD são preenchidos pela recepção quando o paciente chegar. Se ele faltar ou cancelar, o pré-cadastro é apagado.</p>
          {preErro && <div className="aviso"><Icone n="alerta" /> {preErro}</div>}
          <div className="rodape-modal">
            <button type="button" className="btn2" onClick={() => { setPre(null); if (pac === PRE) setPac(undefined); }}><Icone n="volta" /> Voltar à busca</button>
            <button type="button" className="btn2 pri" onClick={continuarPre}><Icone n="check" /> Continuar</button>
          </div>
        </div>
      )}

      {passo === 1 && (
        <div className="etapa">
          {paciente && <div className="escolhido"><Icone n="medico" /> {paciente.nome}{paciente.situacao === 'pre' && <span className="tag t-in">pré-cadastro</span>}{consultaRecente && <span className="tag t-ok">consulta nos últimos 30 dias · retorno sem custo</span>}</div>}
          <div className="opcoes">
            {base.servicos.map((s) => {
              const ordem = servs.indexOf(s.id);
              return (
                <button type="button" key={s.id} className={'opcao serv tipo-' + s.tipo + (ordem >= 0 ? ' sel' : '')} aria-pressed={ordem >= 0}
                  title={ordem >= 0 ? 'Tirar este serviço' : 'Adicionar este serviço'}
                  onClick={() => { setServs((l) => (l.includes(s.id) ? l.filter((x) => x !== s.id) : [...l, s.id])); setHr(undefined); setEncaixe(false); setVerEncaixe(false); }}>
                  {ordem >= 0 && <span className="ordem-serv">{ordem + 1}</span>}
                  <span className="nm">{s.nome}</span>
                  <span className="det">{s.duracaoMin} min · {s.valor ? moeda(s.valor) : 'sem custo'}</span>
                </button>
              );
            })}
          </div>
          {servs.includes('retorno') && !consultaRecente && <div className="aviso"><Icone n="alerta" /> Este paciente não tem consulta nos últimos 30 dias. Confira se é mesmo retorno.</div>}
          <div className="rodape-modal">
            <span className="mut peq">{servico ? <>{servs.length} serviço{servs.length > 1 ? 's' : ''} · {servico.duracaoMin >= 60 ? `${Math.floor(servico.duracaoMin / 60)}h${servico.duracaoMin % 60 ? String(servico.duracaoMin % 60).padStart(2, '0') : ''}` : `${servico.duracaoMin} min`} · <b>{servico.valor ? moeda(servico.valor) : 'sem custo'}</b>{servs.length > 1 && ' · em sequência no mesmo dia'}</> : 'Escolha um ou mais serviços'}</span>
            <button type="button" className="btn2 pri" disabled={!servs.length} onClick={() => {
              const dur = durDe(servs);
              const cabe = !!hora && horariosLivres(dia, dur, base, { agoraMin: dia === hj ? agoraMin() : undefined }).includes(hora);
              setHr(cabe ? hora : undefined); setPasso(cabe ? 3 : 2);
              if (!cabe) {
                // vai direto para o primeiro dia (a partir do escolhido) em que todos os serviços cabem em sequência
                for (let i = 0, d = dia; i < 90; i++, d = somaDias(d, 1)) {
                  if (horariosLivres(d, dur, base, { agoraMin: d === hj ? agoraMin() : undefined }).length) { setDia(d); break; }
                }
              }
            }}><Icone n="check" /> Continuar</button>
          </div>
        </div>
      )}

      {passo === 2 && servico && (
        <div className="etapa duas">
          <CalendarioMes
            selecionado={dia} minimo={hj}
            aoEscolher={mudaDia}
            info={(d) => { const s = situacaoDia(d, base); return { ...s, livres: s.aberto ? (servico ? horariosLivres(d, servico.duracaoMin, base, { agoraMin: d === hj ? agoraMin() : undefined }).length : blocosLivres(d, base)) : 0 }; }}
          />
          <div>
            <div className="dia-tit">{extenso(dia)}</div>
            {!sit.aberto ? <div className="aviso"><Icone n="alerta" /> {sit.motivo}</div>
              : livres.length === 0 ? (
                <>
                  <div className="aviso"><Icone n="alerta" /> Sem horário livre para {servico.curto.toLowerCase()} ({servico.duracaoMin} min) neste dia.</div>
                  {!verEncaixe
                    ? <button type="button" className="btn2 pri encaixe-btn" onClick={() => setVerEncaixe(true)}><Icone n="mais" /> Encaixe</button>
                    : encaixes.length === 0 ? <div className="aviso"><Icone n="info" /> O horário de atendimento deste dia já terminou.</div>
                    : <>
                      <div className="lbl-peq">Encaixe · escolha o horário (pode coincidir com outro paciente)</div>
                      <div className="horas">{encaixes.map((h) => <button type="button" key={h} className={'hora mono encaixe' + (hr === h ? ' sel' : '')} onClick={() => { setHr(h); setEncaixe(true); setPasso(3); }}>{h}</button>)}</div>
                    </>}
                </>
              )
              : <div className="horas">{livres.map((h) => <button type="button" key={h} className={'hora mono' + (hr === h && !encaixe ? ' sel' : '')} onClick={() => { setHr(h); setEncaixe(false); setPasso(3); }}>{h}</button>)}</div>}
            <p className="mut peq">{verEncaixe ? 'O encaixe fica marcado na agenda.' : `Mostrando só horários em que ${servico.curto.toLowerCase()} de ${servico.duracaoMin} min cabe inteiro, sem sobrepor outro paciente e sem atravessar o almoço.`}</p>
          </div>
        </div>
      )}

      {passo === 3 && paciente && servico && hr && (
        <div className="etapa">
          <div className="resumo-ag">
            <div><span>Paciente</span><b>{paciente.nome}</b><small>{idadeTxt(paciente, hj)} · {paciente.telefone}</small></div>
            {escolhidos.length > 1
              ? <div><span>Serviços</span><b>{escolhidos.length} em sequência</b><small>{sequencia(hr).map((x) => `${x.hora} ${x.s.curto}`).join(' · ')}</small></div>
              : <div><span>Serviço</span><b>{servico.nome}</b><small>{servico.duracaoMin} min</small></div>}
            <div><span>Quando</span><b>{br(dia)} · {hr}{escolhidos.length > 1 && ` às ${hhmm(min(hr) + servico.duracaoMin)}`}{encaixe && <span className="tag t-at">encaixe</span>}</b><small>{extenso(dia)}</small></div>
            <div><span>Valor</span><b>{servico.valor ? moeda(servico.valor) : 'Sem custo'}</b><small>{servico.valor ? 'PIX, dinheiro ou cartão' : 'retorno em até 30 dias'}</small></div>
          </div>
          {servico.preparo && <div className="preparo"><Icone n="info" /> <b>Preparo:</b> {servico.preparo}</div>}
          <div className="rodape-modal">
            <button type="button" className="btn2" onClick={() => setPasso(2)}><Icone n="volta" /> Voltar</button>
            <button type="button" className="btn2 pri" onClick={confirmar}><Icone n="check" /> Agendar</button>
          </div>
        </div>
      )}
    </Modal>
  );
}
