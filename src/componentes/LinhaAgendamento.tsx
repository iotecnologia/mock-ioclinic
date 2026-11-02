// Uma linha da agenda (Hoje e Agenda): hora, paciente, serviço, status, pagamento e ações do perfil.
// Recepção: confirmar, chegou, faltou, cancelar, receber. Médica: iniciar e finalizar o atendimento.
// Pré-cadastro: o "chegou" abre o cadastro completo — só vira paciente quando a recepção salva o cadastro.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Agendamento, Paciente, StatusAgendamento } from '../tipos/modelos';
import { useDados } from './Dados';
import { useSessao } from '../acesso/Sessao';
import { BotaoIcone, Modal, TagStatus } from './Comuns';
import { FormPaciente, validar } from './FormPaciente';
import { Icone } from './Icone';
import { Receber } from './Receber';
import { PROXIMOS } from '../regras/agenda';
import { idadeTxt } from '../regras/paciente';
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
  const [completar, setCompletar] = useState(false);
  const nav = useNavigate();
  const pac = base.pacientes.find((p) => p.id === ag.pacienteId)!;
  const serv = base.servicos.find((s) => s.id === ag.servicoId)!;
  const medica = usuario!.perfil === 'medica';
  const passos = PROXIMOS[ag.status].filter((s) => (medica ? DA_MEDICA.includes(s) : !DA_MEDICA.includes(s)));
  const pend = ag.pagamento?.status === 'pendente';
  const podeReceber = !medica && pend && ['chegou', 'em_atendimento', 'atendido'].includes(ag.status);
  const pre = pac.situacao === 'pre';
  const anonimo = pac.situacao === 'removido';
  return (
    <div className={'linha-ag st-' + ag.status + (compacta ? ' compacta' : '') + (ag.encaixe ? ' encaixe' : '')}>
      <div className="la-hora mono">{ag.hora}<small>{hhmm(min(ag.hora) + ag.duracaoMin)}</small></div>
      <div className={'la-barra tipo-' + serv.tipo} />
      <div className="la-info">
        {pac.situacao ? <span className={'la-nome' + (anonimo ? ' anonimo' : '')}>{pac.nome}</span> : <Link to={'/pacientes/' + pac.id} className="la-nome">{pac.nome}</Link>}
        <div className="la-sub">
          <span className={'tipo tipo-' + serv.tipo}>{serv.curto}</span>
          {ag.encaixe && <span className="tag t-at">encaixe</span>}
          {pre ? <span className="tag t-in" title="Completar o cadastro quando o paciente chegar">pré-cadastro</span> : <span className="mut">{idadeTxt(pac, hoje())}</span>}
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
            onClick={() => {
              if (pre && s === 'chegou') { setCompletar(true); return; }   // chegou: completa o cadastro primeiro
              acoes.mudarStatus(ag.id, s);
              if (medica && s === 'em_atendimento' && serv.tipo !== 'exame') nav(`/prontuario/${pac.id}?ag=${ag.id}`);
            }} />
        ))}
        {medica && !pac.situacao && serv.tipo !== 'exame' && ag.status !== 'cancelado' && <BotaoIcone icone="estetoscopio" titulo="Abrir prontuário" cls="peq" onClick={() => nav(`/prontuario/${pac.id}?ag=${ag.id}`)} />}
        {podeReceber && <button type="button" className="btn2 peq ic sec" title="Receber pagamento" aria-label="Receber pagamento" onClick={() => setReceber(true)}><Icone n="carteira" /></button>}
      </div>
      {receber && <Receber ag={ag} fechar={() => setReceber(false)} />}
      {completar && <CompletarCadastro pac={pac} agId={ag.id} fechar={() => setCompletar(false)} />}
    </div>
  );
}

type Rascunho = Omit<Paciente, 'id' | 'criadoEm'> & { id?: string };

/** Paciente pré-cadastrado chegou: a recepção completa o cadastro (CPF, nascimento, endereço, LGPD) e só então ele vira paciente. */
function CompletarCadastro({ pac, agId, fechar }: { pac: Paciente; agId: string; fechar: () => void }) {
  const { base, acoes } = useDados();
  const [r, setR] = useState<Rascunho>({ ...pac, sexo: 'F' });
  const [erros, setErros] = useState<Record<string, string>>({});
  const salvar = () => {
    const e = validar(r, base.pacientes);
    setErros(e);
    if (Object.keys(e).length) return;
    acoes.salvarPaciente({ ...r, id: pac.id, situacao: undefined });
    acoes.mudarStatus(agId, 'chegou');
    fechar();
  };
  return (
    <Modal titulo="Paciente chegou · completar cadastro" fechar={fechar} largo>
      <p className="mut peq">{pac.nome} veio do pré-cadastro. Complete os dados obrigatórios e o termo LGPD para confirmar a chegada.</p>
      <FormPaciente inicial={{ ...pac, sexo: 'F' }} editando aoMudar={setR} erros={erros} />
      <div className="rodape-modal">
        <button type="button" className="btn2" onClick={fechar}>Voltar</button>
        <button type="button" className="btn2 pri" onClick={salvar}><Icone n="salvar" /> Salvar e confirmar chegada</button>
      </div>
    </Modal>
  );
}
