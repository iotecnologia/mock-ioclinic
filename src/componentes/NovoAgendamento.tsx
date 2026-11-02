// Novo agendamento em passos (mesmo padrão do "Agendar passo a passo" do Analiza):
// 1 Paciente → 2 Serviço → 3 Dia e horário (só mostra o que está livre) → 4 Confirmar.
// Paciente novo: PRÉ-CADASTRO aqui mesmo (nome digitado na busca + WhatsApp). O cadastro completo é feito
// pela recepção quando ele chega; se faltar ou cancelar, o pré-cadastro é apagado (regras/paciente.ts).
// Dia sem horário livre: ENCAIXE em qualquer horário da grade (fica marcado na agenda).
import { useMemo, useState } from 'react';
import type { Agendamento, Paciente } from '../tipos/modelos';
import { useDados } from './Dados';
import { Modal } from './Comuns';
import { Icone } from './Icone';
import { CalendarioMes } from './CalendarioMes';
import { buscarPacientes, idadeTxt } from '../regras/paciente';
import { blocosLivres, horariosEncaixe, horariosLivres, situacaoDia } from '../regras/disponibilidade';
import { agoraMin, br, extenso, hoje, somaDias } from '../util/datas';
import { digitos, linkWhats, mascaraTelefone, moeda } from '../util/formato';

const PASSOS = ['Paciente', 'Serviço', 'Dia e horário', 'Confirmar'];
const PRE = '__pre';   // paciente ainda não gravado: o pré-cadastro só é salvo ao confirmar o agendamento

export function NovoAgendamento({ fechar, pacienteId, data, hora, servicoId }: { fechar: () => void; pacienteId?: string; data?: string; hora?: string; servicoId?: string }) {
  const { base, acoes } = useDados();
  const hj = hoje();
  const [passo, setPasso] = useState(pacienteId ? (servicoId ? 2 : 1) : 0);
  const [pac, setPac] = useState<string | undefined>(pacienteId);
  const [serv, setServ] = useState<string | undefined>(servicoId);
  const [dia, setDia] = useState<string>(() => {
    let d = data && data >= hj ? data : hj;
    const s0 = base.servicos.find((x) => x.id === servicoId);
    // retorno sugerido: vai para o primeiro dia (a partir da data sugerida) que tem horário
    if (s0) for (let i = 0; i < 90 && !horariosLivres(d, s0.duracaoMin, base, { agoraMin: d === hj ? agoraMin() : undefined }).length; i++) d = somaDias(d, 1);
    return d;
  });
  const [hr, setHr] = useState<string | undefined>(hora);
  const [busca, setBusca] = useState('');
  const [feito, setFeito] = useState<Agendamento | null>(null);
  const [pre, setPre] = useState<{ nome: string; telefone: string } | null>(null);   // formulário do pré-cadastro aberto
  const [preErro, setPreErro] = useState('');
  const [encaixe, setEncaixe] = useState(false);       // horário escolhido é encaixe
  const [verEncaixe, setVerEncaixe] = useState(false); // mostrando a grade de encaixe

  const preDados: Paciente | undefined = pac === PRE && pre
    ? { id: PRE, nome: pre.nome.trim(), telefone: pre.telefone, cpf: '', nascimento: '', sexo: 'O', consentimentoLgpd: false, criadoEm: hj, situacao: 'pre' }
    : undefined;
  const paciente = preDados ?? base.pacientes.find((p) => p.id === pac);
  const servico = base.servicos.find((s) => s.id === serv);
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
    setPre({ nome: soNumero ? '' : busca.trim(), telefone: soNumero ? mascaraTelefone(busca) : '' });
    setPreErro('');
  };
  const continuarPre = () => {
    if (!pre) return;
    if (pre.nome.trim().split(/\s+/).length < 2) return setPreErro('Informe nome e sobrenome.');
    if (digitos(pre.telefone).length < 10) return setPreErro('Informe o WhatsApp com DDD.');
    setPac(PRE); setPasso(1);
  };

  const confirmar = () => {
    let pacienteId = pac!;
    if (pac === PRE && preDados) {
      const { id: _id, criadoEm: _c, ...dados } = preDados;
      const novo = acoes.salvarPaciente(dados);
      pacienteId = novo.id; setPac(novo.id); setPre(null);
    }
    const a = acoes.agendar({ pacienteId, servicoId: serv!, data: dia, hora: hr!, duracaoMin: servico!.duracaoMin, ...(encaixe ? { encaixe: true } : {}) });
    setFeito(a);
  };

  if (feito && paciente && servico) {
    const msg = `Olá, ${paciente.nome.split(' ')[0]}! Seu agendamento na clínica da ${base.clinica.medica} está marcado: ${servico.nome}, ${extenso(feito.data)}, às ${feito.hora}.${servico.preparo ? ' Preparo: ' + servico.preparo : ''} Por favor, confirme respondendo esta mensagem.`;
    return (
      <Modal titulo="Agendamento feito" fechar={fechar}>
        <div className="feito">
          <div className="feito-ok"><Icone n="check" /></div>
          <h3>{paciente.nome}</h3>
          <p>{servico.nome}<br /><b>{extenso(feito.data)} · {feito.hora}</b></p>
          {(feito.encaixe || paciente.situacao === 'pre') && <p className="feito-tags">{feito.encaixe && <span className="tag t-at">encaixe</span>}{paciente.situacao === 'pre' && <span className="tag t-in">pré-cadastro · completar na chegada</span>}</p>}
          {servico.preparo && <div className="preparo"><Icone n="info" /> {servico.preparo}</div>}
          <div className="rodape-modal centro">
            <a className="btn2 zap" href={linkWhats(paciente.telefone, msg)} target="_blank" rel="noreferrer"><Icone n="zap" /> Enviar confirmação</a>
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
            <label>WhatsApp *<input autoFocus={!!pre.nome} value={pre.telefone} inputMode="tel" onChange={(e) => setPre({ ...pre, telefone: mascaraTelefone(e.target.value) })} placeholder="(19) 90000-0000" onKeyDown={(e) => e.key === 'Enter' && continuarPre()} /></label>
          </div>
          <p className="mut peq">Pré-cadastro: só nome e WhatsApp, para confirmar a consulta. CPF, nascimento, endereço e o termo LGPD são preenchidos pela recepção quando o paciente chegar. Se ele faltar ou cancelar, o pré-cadastro é apagado.</p>
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
            {base.servicos.map((s) => (
              <button type="button" key={s.id} className={'opcao serv tipo-' + s.tipo + (serv === s.id ? ' sel' : '')} onClick={() => {
                setServ(s.id);
                const cabe = !!hora && horariosLivres(dia, s.duracaoMin, base, { agoraMin: dia === hj ? agoraMin() : undefined }).includes(hora);
                setHr(cabe ? hora : undefined); setEncaixe(false); setVerEncaixe(false); setPasso(cabe ? 3 : 2);
                if (!cabe) {
                  // vai direto para o primeiro dia (a partir do escolhido) que tem horário para este serviço
                  for (let i = 0, d = dia; i < 90; i++, d = somaDias(d, 1)) {
                    if (horariosLivres(d, s.duracaoMin, base, { agoraMin: d === hj ? agoraMin() : undefined }).length) { setDia(d); break; }
                  }
                }
              }}>
                <span className="nm">{s.nome}</span>
                <span className="det">{s.duracaoMin} min · {s.valor ? moeda(s.valor) : 'sem custo'}</span>
              </button>
            ))}
          </div>
          {serv === 'retorno' && !consultaRecente && <div className="aviso"><Icone n="alerta" /> Este paciente não tem consulta nos últimos 30 dias. Confira se é mesmo retorno.</div>}
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
            <div><span>Serviço</span><b>{servico.nome}</b><small>{servico.duracaoMin} min</small></div>
            <div><span>Quando</span><b>{br(dia)} · {hr}{encaixe && <span className="tag t-at">encaixe</span>}</b><small>{extenso(dia)}</small></div>
            <div><span>Valor</span><b>{servico.valor ? moeda(servico.valor) : 'Sem custo'}</b><small>{servico.valor ? `PIX/dinheiro: ${moeda(servico.valor * (1 - base.clinica.descontoPix / 100))}` : 'retorno em até 30 dias'}</small></div>
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
