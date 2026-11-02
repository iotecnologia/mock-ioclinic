// Detalhe de um agendamento numa janela, sem sair da tela (Agenda/semana, Financeiro, histórico do paciente).
// A linha é a mesma da agenda: status, pagamento e as ações do perfil.
import { useDados } from './Dados';
import { Modal } from './Comuns';
import { LinhaAgendamento } from './LinhaAgendamento';
import { br } from '../util/datas';

export function DetalheAgendamento({ id, fechar }: { id: string; fechar: () => void }) {
  const { base } = useDados();
  const ag = base.agendamentos.find((a) => a.id === id);
  if (!ag) return null;
  return <Modal titulo={`${br(ag.data)} · ${ag.hora}`} fechar={fechar}><div className="lista-ag"><LinhaAgendamento ag={ag} /></div></Modal>;
}
