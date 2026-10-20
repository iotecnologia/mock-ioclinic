// Base carregada pelo repositório + ações (criar paciente, agendar, mudar status, receber).
// No mock tudo fica só na memória da página: recarregou, volta ao início. Fase 3: cada ação chama a API.
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Agendamento, BaseClinica, FormaPagamento, Paciente, StatusAgendamento } from '../tipos/modelos';
import type { Repositorio } from '../repositorio/repositorio';
import { hoje } from '../util/datas';

interface Acoes {
  salvarPaciente(p: Omit<Paciente, 'id' | 'criadoEm'> & { id?: string }): Paciente;
  agendar(a: Omit<Agendamento, 'id' | 'criadoEm' | 'status' | 'pagamento'>): Agendamento;
  mudarStatus(id: string, status: StatusAgendamento): void;
  receber(id: string, forma: FormaPagamento, valor: number): void;
}
interface Ctx { base: BaseClinica; acoes: Acoes }
const C = createContext<Ctx | null>(null);

export function DadosProvider({ repo, children }: { repo: Repositorio; children: ReactNode }) {
  const [base, setBase] = useState<BaseClinica | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  useEffect(() => { repo.carregar().then(setBase).catch((e) => setErro(String(e))); }, [repo]);
  if (erro) return <div className="vazio">Não foi possível carregar os dados: {erro}</div>;
  if (!base) return <div className="vazio">Carregando…</div>;

  const atualizaAg = (id: string, f: (a: Agendamento) => Agendamento) =>
    setBase((b) => b && { ...b, agendamentos: b.agendamentos.map((a) => (a.id === id ? f(a) : a)) });

  const acoes: Acoes = {
    salvarPaciente(p) {
      if (p.id) {
        const atual = base.pacientes.find((x) => x.id === p.id)!;
        const novo = { ...atual, ...p } as Paciente;
        setBase((b) => b && { ...b, pacientes: b.pacientes.map((x) => (x.id === p.id ? novo : x)) });
        return novo;
      }
      const novo: Paciente = { ...p, id: 'n' + Date.now().toString(36), criadoEm: hoje() } as Paciente;
      setBase((b) => b && { ...b, pacientes: [...b.pacientes, novo] });
      return novo;
    },
    agendar(a) {
      const serv = base.servicos.find((s) => s.id === a.servicoId);
      const novo: Agendamento = {
        ...a, id: 'n' + Date.now().toString(36), criadoEm: hoje(), status: 'agendado',
        pagamento: serv && serv.valor === 0 ? { status: 'isento', valor: 0 } : { status: 'pendente', valor: serv?.valor ?? 0 },
      };
      setBase((b) => b && { ...b, agendamentos: [...b.agendamentos, novo] });
      return novo;
    },
    mudarStatus(id, status) {
      atualizaAg(id, (a) => ({ ...a, status, pagamento: status === 'cancelado' || status === 'faltou' ? (a.pagamento?.status === 'pago' ? a.pagamento : undefined) : a.pagamento }));
    },
    receber(id, forma, valor) {
      atualizaAg(id, (a) => ({ ...a, pagamento: { status: 'pago', forma, valor, pagoEm: hoje() } }));
    },
  };
  return <C.Provider value={{ base, acoes }}>{children}</C.Provider>;
}

export function useDados(): Ctx {
  const c = useContext(C);
  if (!c) throw new Error('useDados fora do DadosProvider');
  return c;
}
