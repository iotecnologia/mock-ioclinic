// Detalhe de um agendamento numa janela, sem sair da tela (Agenda, Visão Geral, sino, Financeiro, ficha do paciente).
// Mostra paciente, serviço, horário, situação e pagamento; as ações ficam embaixo como BOTÕES COM O NOME ESCRITO
// (a próxima ação em destaque; Faltou/Cancelar à esquerda). Recepção: confirmar, chegou, faltou, cancelar, receber.
// Médica: iniciar e finalizar o atendimento, abrir o histórico. Pré-cadastro: o "Chegou" abre o cadastro completo.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { StatusAgendamento } from '../tipos/modelos';
import { useDados } from './Dados';
import { useSessao } from '../acesso/Sessao';
import { Modal, TagStatus } from './Comuns';
import { Icone } from './Icone';
import { Receber } from './Receber';
import { CompletarCadastro } from './LinhaAgendamento';
import { PROXIMOS } from '../regras/agenda';
import { idadeTxt } from '../regras/paciente';
import { br, hhmm, hoje, min, nomeDiaCurto } from '../util/datas';
import { moeda } from '../util/formato';

const ROTULO: Partial<Record<StatusAgendamento, { txt: string; icone: string }>> = {
  confirmado: { txt: 'Confirmar presença', icone: 'check' },
  chegou: { txt: 'Chegou', icone: 'porta' },
  em_atendimento: { txt: 'Iniciar atendimento', icone: 'play' },
  atendido: { txt: 'Finalizar atendimento', icone: 'check' },
  faltou: { txt: 'Faltou', icone: 'falta' },
  cancelado: { txt: 'Cancelar agendamento', icone: 'cancelar' },
};
const DA_MEDICA: StatusAgendamento[] = ['em_atendimento', 'atendido'];
const SECUNDARIAS: StatusAgendamento[] = ['faltou', 'cancelado'];

export function DetalheAgendamento({ id, fechar }: { id: string; fechar: () => void }) {
  const { base } = useDados();
  const ag = base.agendamentos.find((a) => a.id === id);
  if (!ag) return null;
  return <Modal titulo={`${nomeDiaCurto(ag.data)}, ${br(ag.data)} · ${ag.hora}`} fechar={fechar}><PainelAgendamento id={id} /></Modal>;
}

/** Conteúdo do detalhe (sempre atualizado: o status muda aqui dentro). */
export function PainelAgendamento({ id }: { id: string }) {
  const { base, acoes } = useDados();
  const { usuario } = useSessao();
  const nav = useNavigate();
  const [receber, setReceber] = useState(false);
  const [completar, setCompletar] = useState(false);
  const ag = base.agendamentos.find((a) => a.id === id);
  if (!ag) return null;
  const pac = base.pacientes.find((p) => p.id === ag.pacienteId)!;
  const serv = base.servicos.find((s) => s.id === ag.servicoId)!;
  const medica = usuario!.perfil === 'medica';
  const passos = PROXIMOS[ag.status].filter((s) => (medica ? DA_MEDICA.includes(s) : !DA_MEDICA.includes(s)));
  const principais = passos.filter((s) => !SECUNDARIAS.includes(s));
  const secundarias = passos.filter((s) => SECUNDARIAS.includes(s));
  const pg = ag.pagamento;
  const pend = pg?.status === 'pendente';
  const podeReceber = pend && ['chegou', 'em_atendimento', 'atendido'].includes(ag.status);
  const pre = pac.situacao === 'pre';
  const fazer = (s: StatusAgendamento) => {
    if (pre && s === 'chegou') { setCompletar(true); return; }        // chegou: completa o cadastro primeiro
    acoes.mudarStatus(ag.id, s);
    if (medica && s === 'em_atendimento' && serv.tipo !== 'exame') nav(`/prontuario/${pac.id}?ag=${ag.id}`);
  };
  const historico = medica && !pac.situacao && serv.tipo !== 'exame' && ag.status !== 'cancelado';
  const nada = !passos.length && !podeReceber && !historico;

  return (
    <div className="det-ag">
      <div className="det-pac">
        <div>
          <b>{pac.nome}</b>
          <small>{[(!pre || pac.nascimento) && idadeTxt(pac, hoje()), pac.telefone].filter(Boolean).join(' · ')}</small>
        </div>
        <TagStatus s={ag.status} />
      </div>
      <dl className="det-dados">
        <div><dt>Serviço</dt><dd><span className={'tipo tipo-' + serv.tipo}>{serv.nome}</span></dd></div>
        <div><dt>Horário</dt><dd className="mono">{ag.hora} às {hhmm(min(ag.hora) + ag.duracaoMin)}</dd></div>
        <div><dt>Pagamento</dt><dd>
          {!pg ? '—' : pg.status === 'isento' ? <span className="pg ok">retorno · sem custo</span>
            : pend ? <span className="pg pend">a receber {moeda(pg.valor)}</span> : <span className="pg ok">pago {moeda(pg.valor)}</span>}
        </dd></div>
        {(ag.encaixe || pre || ag.origem === 'whatsapp' || ag.whats?.resposta) && (
          <div><dt>Observações</dt><dd className="det-tags">
            {ag.encaixe && <span className="tag t-at">encaixe</span>}
            {pre && <span className="tag t-in">pré-cadastro · completar na chegada</span>}
            {ag.origem === 'whatsapp' && <span className="zap-tag ok">agendou pelo WhatsApp</span>}
            {ag.whats?.resposta === 'confirmou' && <span className="zap-tag ok">confirmou pelo WhatsApp</span>}
            {ag.whats?.resposta === 'remarcar' && !ag.whats.resolvido && <span className="zap-tag no">pediu para remarcar</span>}
          </dd></div>
        )}
      </dl>

      {nada ? <p className="mut peq det-fim">Nenhuma ação pendente para este agendamento.</p> : (
        <div className="det-acoes">
          <div className="det-sec">
            {secundarias.map((s) => <button type="button" key={s} className="btn2" onClick={() => fazer(s)}><Icone n={ROTULO[s]!.icone} /> {ROTULO[s]!.txt}</button>)}
          </div>
          <div className="det-pri">
            {historico && <button type="button" className="btn2" onClick={() => nav(`/prontuario/${pac.id}?ag=${ag.id}`)}><Icone n="estetoscopio" /> Atender no consultório</button>}
            {podeReceber && <button type="button" className={'btn2' + (principais.length ? '' : ' pri')} onClick={() => setReceber(true)}><Icone n="carteira" /> Receber {moeda(pg!.valor)}</button>}
            {[...principais].reverse().map((s) => <button type="button" key={s} className={'btn2' + (s === principais[0] ? ' pri' : '')} onClick={() => fazer(s)}><Icone n={ROTULO[s]!.icone} /> {ROTULO[s]!.txt}</button>)}
          </div>
        </div>
      )}
      {receber && <Receber ag={ag} fechar={() => setReceber(false)} />}
      {completar && <CompletarCadastro pac={pac} agId={ag.id} fechar={() => setCompletar(false)} />}
    </div>
  );
}
