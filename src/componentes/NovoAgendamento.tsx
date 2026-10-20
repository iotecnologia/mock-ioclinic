// Novo agendamento em passos (mesmo padrão do "Agendar passo a passo" do Analiza):
// 1 Paciente → 2 Serviço → 3 Dia e horário (só mostra o que está livre) → 4 Confirmar.
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Agendamento } from '../tipos/modelos';
import { useDados } from './Dados';
import { Modal } from './Comuns';
import { Icone } from './Icone';
import { CalendarioMes } from './CalendarioMes';
import { buscarPacientes, idade } from '../regras/paciente';
import { blocosLivres, horariosLivres, situacaoDia } from '../regras/disponibilidade';
import { agoraMin, br, extenso, hoje, somaDias } from '../util/datas';
import { linkWhats, moeda } from '../util/formato';

const PASSOS = ['Paciente', 'Serviço', 'Dia e horário', 'Confirmar'];

export function NovoAgendamento({ fechar, pacienteId, data, hora, servicoId }: { fechar: () => void; pacienteId?: string; data?: string; hora?: string; servicoId?: string }) {
  const { base, acoes } = useDados();
  const nav = useNavigate();
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

  const paciente = base.pacientes.find((p) => p.id === pac);
  const servico = base.servicos.find((s) => s.id === serv);
  const livres = useMemo(
    () => (servico ? horariosLivres(dia, servico.duracaoMin, base, { agoraMin: dia === hj ? agoraMin() : undefined }) : []),
    [servico, dia, base, hj],
  );
  // retorno: houve consulta nos últimos 30 dias?
  const consultaRecente = paciente && base.agendamentos.some((a) => a.pacienteId === paciente.id && a.servicoId === 'consulta' && a.status === 'atendido' && a.data >= somaDias(hj, -30));
  const ok = [!!pac, !!serv, !!hr && livres.includes(hr), true];

  const confirmar = () => {
    const a = acoes.agendar({ pacienteId: pac!, servicoId: serv!, data: dia, hora: hr!, duracaoMin: servico!.duracaoMin });
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

      {passo === 0 && (
        <div className="etapa">
          <div className="f-busca"><Icone n="busca" /><input type="text" autoFocus value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome, CPF ou telefone do paciente" /></div>
          <div className="lista-pac">
            {buscarPacientes(base.pacientes, busca).slice(0, busca ? 8 : 6).map((p) => (
              <button type="button" key={p.id} className={'pac-op' + (pac === p.id ? ' sel' : '')} onClick={() => { setPac(p.id); setPasso(1); }}>
                <b>{p.nome}</b><small>{idade(p.nascimento, hj)} anos · {p.telefone}</small>
              </button>
            ))}
          </div>
          <button type="button" className="btn2" onClick={() => { fechar(); nav('/pacientes/novo'); }}><Icone n="pacienteMais" /> Paciente novo? Cadastrar</button>
        </div>
      )}

      {passo === 1 && (
        <div className="etapa">
          {paciente && <div className="escolhido"><Icone n="medico" /> {paciente.nome}{consultaRecente && <span className="tag t-ok">consulta nos últimos 30 dias · retorno sem custo</span>}</div>}
          <div className="opcoes">
            {base.servicos.map((s) => (
              <button type="button" key={s.id} className={'opcao serv tipo-' + s.tipo + (serv === s.id ? ' sel' : '')} onClick={() => {
                setServ(s.id);
                const cabe = !!hora && horariosLivres(dia, s.duracaoMin, base, { agoraMin: dia === hj ? agoraMin() : undefined }).includes(hora);
                setHr(cabe ? hora : undefined); setPasso(cabe ? 3 : 2);
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
            aoEscolher={(d) => { setDia(d); setHr(undefined); }}
            info={(d) => { const s = situacaoDia(d, base); return { ...s, livres: s.aberto ? (servico ? horariosLivres(d, servico.duracaoMin, base, { agoraMin: d === hj ? agoraMin() : undefined }).length : blocosLivres(d, base)) : 0 }; }}
          />
          <div>
            <div className="dia-tit">{extenso(dia)}</div>
            {!situacaoDia(dia, base).aberto ? <div className="aviso"><Icone n="alerta" /> {situacaoDia(dia, base).motivo}</div>
              : livres.length === 0 ? <div className="aviso"><Icone n="alerta" /> Sem horário livre para {servico.curto.toLowerCase()} ({servico.duracaoMin} min) neste dia.</div>
              : <div className="horas">{livres.map((h) => <button type="button" key={h} className={'hora mono' + (hr === h ? ' sel' : '')} onClick={() => { setHr(h); setPasso(3); }}>{h}</button>)}</div>}
            <p className="mut peq">Mostrando só horários em que {servico.curto.toLowerCase()} de {servico.duracaoMin} min cabe inteiro, sem sobrepor outro paciente e sem atravessar o almoço.</p>
          </div>
        </div>
      )}

      {passo === 3 && paciente && servico && hr && (
        <div className="etapa">
          <div className="resumo-ag">
            <div><span>Paciente</span><b>{paciente.nome}</b><small>{idade(paciente.nascimento, hj)} anos · {paciente.telefone}</small></div>
            <div><span>Serviço</span><b>{servico.nome}</b><small>{servico.duracaoMin} min</small></div>
            <div><span>Quando</span><b>{br(dia)} · {hr}</b><small>{extenso(dia)}</small></div>
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
