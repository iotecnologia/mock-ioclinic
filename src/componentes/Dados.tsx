// Base carregada pelo repositório + ações (criar paciente, agendar, mudar status, receber…).
// MOCK: tudo o que for feito fica salvo NESTE navegador (localStorage) — os dados são fictícios.
// No sistema real isso NÃO acontece: dado de paciente fica só no banco (backend io-clinic), nunca no navegador.
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Agendamento, Atendimento, BaseClinica, ContatoWhats, Despesa, Documento, FormaPagamento, Paciente, ResumoClinico, StatusAgendamento } from '../tipos/modelos';
import type { Repositorio } from '../repositorio/repositorio';
import { hoje } from '../util/datas';
import { limparPreCadastros } from '../regras/paciente';
import { respostaSimulada } from '../regras/mensagens';

interface Acoes {
  salvarPaciente(p: Omit<Paciente, 'id' | 'criadoEm'> & { id?: string }): Paciente;
  agendar(a: Omit<Agendamento, 'id' | 'criadoEm' | 'status' | 'pagamento'>): Agendamento;
  /** Faltou/cancelou: se o paciente era pré-cadastro e não tem outro horário, o pré-cadastro é apagado. */
  mudarStatus(id: string, status: StatusAgendamento): void;
  receber(id: string, forma: FormaPagamento, valor: number): void;
  /** Salva a evolução clínica e, se veio de um agendamento, marca como atendido. */
  finalizarAtendimento(at: Omit<Atendimento, 'id'>): Atendimento;
  salvarResumo(r: ResumoClinico): void;
  emitirDocumento(d: Omit<Documento, 'id'>): Documento;
  lancarDespesa(d: Omit<Despesa, 'id'>): Despesa;
  pagarDespesa(id: string): void;
  excluirDespesa(id: string): void;
  /** Registra o contato pelo WhatsApp do agendamento (junta com o que já tinha). */
  registrarWhats(id: string, w: Partial<ContatoWhats>): void;
  /** Envia (no mock: simula) o lembrete da véspera para estes agendamentos. */
  enviarLembretes(ids: string[]): void;
  /** A recepção tratou o pedido de remarcação. */
  resolverRemarcar(id: string): void;
}
/** Aviso que aparece no canto da tela (ex.: resposta do paciente no WhatsApp). */
export interface Aviso { id: string; texto: string; tipo: 'ok' | 'alerta'; link?: string; /** fica até fechar */ fixo?: boolean }
interface Ctx { base: BaseClinica; acoes: Acoes; restaurar(): void; avisos: Aviso[]; fecharAviso(id: string): void; avisar(a: Aviso): void }

/** Segundos até a resposta simulada do paciente chegar (demonstração). */
const ESPERA_RESPOSTA = 6;

// ------------------------------------------------------------------ salvar no navegador (só no mock)
export const CHAVE_DEMO = 'ioclinic:demo';
const VERSAO = 1;
/** Partes da base que o usuário altera (o resto — clínica, serviços, CID… — vem sempre do código atualizado). */
const PARTES = ['pacientes', 'agendamentos', 'atendimentos', 'resumos', 'documentos', 'despesas', 'bloqueios'] as const;
type Parte = (typeof PARTES)[number];
type Salvo = { versao: number; salvoEm: string } & Pick<BaseClinica, Parte>;

export function lerSalvo(): Salvo | null {
  try { const t = localStorage.getItem(CHAVE_DEMO); if (!t) return null; const s = JSON.parse(t) as Salvo; return s.versao === VERSAO ? s : null; } catch { return null; }
}
function gravar(b: BaseClinica) {
  try {
    const s: Salvo = { versao: VERSAO, salvoEm: hoje(), ...(Object.fromEntries(PARTES.map((p) => [p, b[p]])) as Pick<BaseClinica, Parte>) };
    localStorage.setItem(CHAVE_DEMO, JSON.stringify(s));
  } catch { /* navegador sem armazenamento ou cheio: segue só na memória */ }
}
export function apagarSalvo() { try { localStorage.removeItem(CHAVE_DEMO); } catch { /* sem armazenamento */ } }

/** Junta o que foi salvo com a base nova do código (clínica, serviços, CIDs… sempre atualizados). */
export const juntar = (nova: BaseClinica, salvo: Salvo): BaseClinica => ({ ...nova, ...(Object.fromEntries(PARTES.map((p) => [p, salvo[p]])) as Pick<BaseClinica, Parte>) });

/** Número estável (0–99) a partir do id: decide falta/forma de pagamento sempre igual, sem sorteio. */
const hash = (s: string) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h % 100; };

/**
 * Ao abrir num dia seguinte: o que ficou "em aberto" em dias que já passaram é fechado sozinho,
 * para a agenda não parar no passado. Agendados → atendidos (≈6% faltas) e recebidos; contas da base fictícia vencidas → pagas.
 * O que o usuário cadastrou continua igual (só o status dos dias passados é fechado).
 */
export function fecharDiasPassados(b: BaseClinica, hojeIso: string): BaseClinica {
  const desconto = b.clinica.descontoPix;
  const FORMAS: FormaPagamento[] = ['pix', 'pix', 'pix', 'cartao_credito', 'cartao_credito', 'cartao_debito', 'dinheiro'];
  const pre = new Set(b.pacientes.filter((p) => p.situacao === 'pre').map((p) => p.id));
  const agendamentos = b.agendamentos.map((a): Agendamento => {
    if (a.data >= hojeIso || !['agendado', 'confirmado', 'chegou', 'em_atendimento'].includes(a.status)) return a;
    // pré-cadastro que ficou para trás sem completar o cadastro = não veio
    if (pre.has(a.pacienteId)) return { ...a, status: 'faltou', pagamento: undefined };
    const h = hash(a.id);
    if (h < 6 && a.status !== 'chegou' && a.status !== 'em_atendimento') return { ...a, status: 'faltou', pagamento: a.pagamento?.status === 'pago' ? a.pagamento : undefined };
    let pagamento = a.pagamento;
    if (pagamento?.status === 'pendente' && pagamento.valor > 0) {
      const forma = FORMAS[h % FORMAS.length];
      const valor = forma === 'pix' || forma === 'dinheiro' ? +(pagamento.valor * (1 - desconto / 100)).toFixed(2) : pagamento.valor;
      pagamento = { status: 'pago', forma, valor, pagoEm: a.data };
    }
    return { ...a, status: 'atendido', pagamento };
  });
  const despesas = b.despesas.map((d) => (d.status === 'a_pagar' && d.data < hojeIso && d.id.startsWith('dp') ? { ...d, status: 'paga' as const, pagaEm: d.data } : d));
  return limparPreCadastros({ ...b, agendamentos, despesas });
}
const C = createContext<Ctx | null>(null);

/** Carrega a base da clínica. Só é montado DEPOIS do login (dado de paciente nunca carrega antes de entrar).
 *  Enquanto carrega não desenha nada: quem mostra a espera é a tela de abertura (componentes/Abertura.tsx). */
export function DadosProvider({ repo, children, aoCarregar }: { repo: Repositorio; children: ReactNode; aoCarregar?: () => void }) {
  const [base, setBase] = useState<BaseClinica | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [versao, setVersao] = useState(0);   // muda ao restaurar → recarrega
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const baseRef = useRef<BaseClinica | null>(null);
  baseRef.current = base;
  useEffect(() => {
    // deixa a tela de abertura aparecer antes de montar os dados
    const t = setTimeout(() => {
      repo.carregar().then((nova) => {
        const salvo = lerSalvo();
        setBase(salvo ? fecharDiasPassados(juntar(nova, salvo), hoje()) : nova);
        aoCarregar?.();
      }).catch((e) => setErro(String(e)));
    }, 30);
    return () => clearTimeout(t);
  }, [repo, versao]); // eslint-disable-line react-hooks/exhaustive-deps
  // salva a cada mudança (com um pequeno atraso para juntar várias mudanças seguidas)
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (!base) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => gravar(base), 300);
  }, [base]);
  useEffect(() => () => clearTimeout(timer.current), []);
  // DEMONSTRAÇÃO do WhatsApp automático: alguns segundos depois do envio, o paciente "responde".
  // Confirmou → status Confirmado. Pediu para remarcar → alerta para a recepção. (Sistema final: webhook da API do WhatsApp.)
  useEffect(() => {
    const t = setInterval(() => {
      const b = baseRef.current;
      if (!b) return;
      const agora = Date.now();
      const prontos = b.agendamentos.filter((a) => {
        const w = a.whats;
        if (!w || w.modo !== 'auto' || w.processado) return false;
        const enviado = Math.max(w.confirmacaoEm ? Date.parse(w.confirmacaoEm) : 0, w.lembreteEm ? Date.parse(w.lembreteEm) : 0);
        return enviado > 0 && agora - enviado >= ESPERA_RESPOSTA * 1000;
      });
      if (!prontos.length) return;
      const res = new Map(prontos.map((a) => [a.id, respostaSimulada(a.id, !a.whats!.lembreteEm)]));
      // demonstração: num lote de 3+ lembretes, pelo menos um paciente pede para remarcar (para mostrar o alerta)
      const lote = prontos.filter((a) => a.whats!.lembreteEm);
      if (lote.length >= 3 && !lote.some((a) => res.get(a.id) === 'remarcar')) res.set(lote[lote.length - 1].id, 'remarcar');
      const quando = new Date().toISOString();
      setBase((x) => x && {
        ...x,
        agendamentos: x.agendamentos.map((a) => {
          if (!res.has(a.id)) return a;
          const r = res.get(a.id);
          const whats: ContatoWhats = { ...a.whats!, processado: true, ...(r ? { resposta: r, respostaEm: quando } : {}) };
          return { ...a, whats, status: r === 'confirmou' && a.status === 'agendado' ? 'confirmado' : a.status };
        }),
      });
      const novos: Aviso[] = [];
      for (const a of prontos) {
        const r = res.get(a.id);
        if (!r || !['agendado', 'confirmado'].includes(a.status)) continue;
        const nome = b.pacientes.find((p) => p.id === a.pacienteId)?.nome ?? 'Paciente';
        const quandoTxt = `${a.data.split('-').reverse().slice(0, 2).join('/')} às ${a.hora}`;
        novos.push(r === 'confirmou'
          ? { id: a.id + ':r', tipo: 'ok', texto: `💬 ${nome} confirmou pelo WhatsApp ✅ · ${quandoTxt}` }
          : { id: a.id + ':r', tipo: 'alerta', texto: `💬 ${nome} pediu para remarcar · ${quandoTxt}`, link: '/hoje' });
      }
      if (novos.length) setAvisos((l) => [...l.filter((x) => !novos.some((n) => n.id === x.id)), ...novos].slice(-4));
    }, 1500);
    return () => clearInterval(t);
  }, []);
  if (erro) return <div className="vazio">Não foi possível carregar os dados: {erro}</div>;
  if (!base) return null;

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
      setBase((b) => b && limparPreCadastros({
        ...b,
        agendamentos: b.agendamentos.map((a) => (a.id === id ? { ...a, status, pagamento: status === 'cancelado' || status === 'faltou' ? (a.pagamento?.status === 'pago' ? a.pagamento : undefined) : a.pagamento } : a)),
      }));
    },
    receber(id, forma, valor) {
      atualizaAg(id, (a) => ({ ...a, pagamento: { status: 'pago', forma, valor, pagoEm: hoje() } }));
    },
    finalizarAtendimento(at) {
      const novo: Atendimento = { ...at, id: 'n' + Date.now().toString(36) };
      setBase((b) => b && {
        ...b,
        atendimentos: [...b.atendimentos.filter((x) => !(at.agendamentoId && x.agendamentoId === at.agendamentoId)), novo],
        agendamentos: b.agendamentos.map((a) => (a.id === at.agendamentoId ? { ...a, status: 'atendido' } : a)),
      });
      return novo;
    },
    salvarResumo(r) {
      setBase((b) => b && { ...b, resumos: [...b.resumos.filter((x) => x.pacienteId !== r.pacienteId), r] });
    },
    emitirDocumento(d) {
      const novo: Documento = { ...d, id: 'n' + Date.now().toString(36) };
      setBase((b) => b && { ...b, documentos: [...b.documentos, novo] });
      return novo;
    },
    lancarDespesa(d) {
      const novo: Despesa = { ...d, id: 'n' + Date.now().toString(36) };
      setBase((b) => b && { ...b, despesas: [...b.despesas, novo].sort((x, y) => x.data.localeCompare(y.data)) });
      return novo;
    },
    pagarDespesa(id) {
      setBase((b) => b && { ...b, despesas: b.despesas.map((x) => (x.id === id ? { ...x, status: 'paga', pagaEm: hoje() } : x)) });
    },
    excluirDespesa(id) {
      setBase((b) => b && { ...b, despesas: b.despesas.filter((x) => x.id !== id) });
    },
    registrarWhats(id, w) {
      atualizaAg(id, (a) => ({ ...a, whats: { modo: 'manual', ...a.whats, ...w } }));
    },
    enviarLembretes(ids) {
      const quando = new Date().toISOString();
      const set = new Set(ids);
      setBase((b) => b && { ...b, agendamentos: b.agendamentos.map((a) => (set.has(a.id) ? { ...a, whats: { ...a.whats, modo: 'auto', lembreteEm: quando, processado: false, resposta: undefined, resolvido: undefined } } : a)) });
    },
    resolverRemarcar(id) {
      atualizaAg(id, (a) => ({ ...a, whats: { modo: 'auto', ...a.whats, resolvido: true } }));
    },
  };
  /** Apaga o que foi salvo e gera a clínica fictícia de novo (para a próxima apresentação). */
  const restaurar = () => { clearTimeout(timer.current); apagarSalvo(); setBase(null); setVersao((v) => v + 1); };
  const fecharAviso = (id: string) => setAvisos((l) => l.filter((x) => x.id !== id));
  const avisar = (a: Aviso) => setAvisos((l) => [...l.filter((x) => x.id !== a.id), a].slice(-4));
  return <C.Provider value={{ base, acoes, restaurar, avisos, fecharAviso, avisar }}>{children}</C.Provider>;
}

export function useDados(): Ctx {
  const c = useContext(C);
  if (!c) throw new Error('useDados fora do DadosProvider');
  return c;
}
