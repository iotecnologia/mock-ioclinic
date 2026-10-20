// Uma linha da agenda (Hoje e Agenda): hora, paciente, serviço, status, pagamento e ações do perfil.
// Recepção: confirmar, chegou, faltou, cancelar, receber. Médica: iniciar e finalizar o atendimento.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Agendamento, StatusAgendamento } from '../tipos/modelos';
import { useDados } from './Dados';
import { useSessao } from '../acesso/Sessao';
import { BotaoIcone, TagStatus } from './Comuns';
import { Icone } from './Icone';
import { Receber } from './Receber';
import { PROXIMOS } from '../regras/agenda';
import { idade } from '../regras/paciente';
import { hhmm, hoje, min } from '../util/datas';
import { moeda } from '../util/formato';

const ACAO: Record<StatusAgendamento, { icone: string; titulo: string; cls: string }> = {
  confirmado: { icone: 'check', titulo: 'Confirmar presença', cls: 'verde' },
  chegou: { icone: 'porta', titulo: 'Paciente chegou', cls: 'amar' },
  em_atendimento: { icone: 'play', titulo: 'Chamar / iniciar atendimento', cls: 'roxo' },
  atendido: { icone: 'check', titulo: 'Finalizar atendimento', cls: 'verde' },
  faltou: { icone: 'falta', titulo: 'Marcar falta', cls: '' },
  cancelado: { icone: 'cancelar', titulo: 'Cancelar agendamento', cls: '' },
  agendado: { icone: 'info', titulo: '', cls: '' },
};
const DA_MEDICA: StatusAgendamento[] = ['em_atendimento', 'atendido'];

export function LinhaAgendamento({ ag, compacta }: { ag: Agendamento; compacta?: boolean }) {
  const { base, acoes } = useDados();
  const { usuario } = useSessao();
  const [receber, setReceber] = useState(false);
  const nav = useNavigate();
  const pac = base.pacientes.find((p) => p.id === ag.pacienteId)!;
  const serv = base.servicos.find((s) => s.id === ag.servicoId)!;
  const medica = usuario!.perfil === 'medica';
  const passos = PROXIMOS[ag.status].filter((s) => (medica ? DA_MEDICA.includes(s) : !DA_MEDICA.includes(s)));
  const pend = ag.pagamento?.status === 'pendente';
  const podeReceber = !medica && pend && ['chegou', 'em_atendimento', 'atendido'].includes(ag.status);
  return (
    <div className={'linha-ag st-' + ag.status + (compacta ? ' compacta' : '')}>
      <div className="la-hora mono">{ag.hora}<small>{hhmm(min(ag.hora) + ag.duracaoMin)}</small></div>
      <div className={'la-barra tipo-' + serv.tipo} />
      <div className="la-info">
        <Link to={'/pacientes/' + pac.id} className="la-nome">{pac.nome}</Link>
        <div className="la-sub">
          <span className={'tipo tipo-' + serv.tipo}>{serv.curto}</span>
          <span className="mut">{idade(pac.nascimento, hoje())} anos</span>
          {ag.pagamento && ag.pagamento.status !== 'isento' && (
            <span className={pend ? 'pg pend' : 'pg ok'} title={pend ? 'Pagamento pendente' : 'Pago'}>{pend ? 'a receber ' + moeda(ag.pagamento.valor) : 'pago'}</span>
          )}
          {ag.pagamento?.status === 'isento' && <span className="pg ok">retorno · sem custo</span>}
        </div>
      </div>
      <TagStatus s={ag.status} />
      <div className="la-acoes">
        {passos.map((s) => (
          <BotaoIcone key={s} icone={ACAO[s].icone} titulo={ACAO[s].titulo} cls={'peq ' + ACAO[s].cls}
            onClick={() => { acoes.mudarStatus(ag.id, s); if (medica && s === 'em_atendimento' && serv.tipo !== 'exame') nav(`/prontuario/${pac.id}?ag=${ag.id}`); }} />
        ))}
        {medica && serv.tipo !== 'exame' && ag.status !== 'cancelado' && <BotaoIcone icone="estetoscopio" titulo="Abrir prontuário" cls="peq" onClick={() => nav(`/prontuario/${pac.id}?ag=${ag.id}`)} />}
        {podeReceber && <button type="button" className="btn2 peq ic sec" title="Receber pagamento" aria-label="Receber pagamento" onClick={() => setReceber(true)}><Icone n="carteira" /></button>}
      </div>
      {receber && <Receber ag={ag} fechar={() => setReceber(false)} />}
    </div>
  );
}
