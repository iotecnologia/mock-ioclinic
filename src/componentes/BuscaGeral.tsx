// Busca GLOBAL do topo (padrão de sistema de gestão): seletor de onde buscar + resultado em tabela simples.
// Paciente (padrão): nome, CPF ou telefone → abre a ficha. Mostra nascimento e CPF parcial para separar homônimos.
// Agendamento: nome do paciente ou data (dd/mm) → abre o detalhe na mesma tela.
// Financeiro (só a médica): recebimentos e despesas por paciente, descrição ou valor → abre o detalhe na mesma tela.
// Setas ↑ ↓ escolhem, Enter abre, Esc limpa. "Ver todos os resultados" (paciente) abre a lista já filtrada.
import { useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDados } from './Dados';
import { useSessao } from '../acesso/Sessao';
import { Icone } from './Icone';
import { TagStatus } from './Comuns';
import { DetalheAgendamento } from './DetalheAgendamento';
import { ModalDespesa } from './Notificacoes';
import { buscarPacientes, cadastrados } from '../regras/paciente';
import { br, hoje } from '../util/datas';
import { cpfOculto, moeda, semAcento } from '../util/formato';

type Escopo = 'paciente' | 'agendamento' | 'financeiro';
const MAX = 8;
const DICA: Record<Escopo, string> = {
  paciente: 'Buscar paciente por nome, CPF ou telefone…',
  agendamento: 'Buscar agendamento por paciente ou data (dd/mm)…',
  financeiro: 'Buscar recebimento ou despesa por nome, descrição ou valor…',
};

/** Linha de resultado: colunas em texto + o que fazer ao abrir. */
interface Res { id: string; cols: (string | JSX.Element)[]; abrir: () => void }

export function BuscaGeral() {
  const { base } = useDados();
  const { usuario } = useSessao();
  const nav = useNavigate();
  const medica = usuario?.perfil === 'medica';
  const [escopo, setEscopo] = useState<Escopo>('paciente');
  const [t, setT] = useState('');
  const [aberta, setAberta] = useState(false);
  const [sel, setSel] = useState(0);
  const [ag, setAg] = useState<string | null>(null);
  const [despesa, setDespesa] = useState<string | null>(null);
  const termo = t.trim();
  const hj = hoje();
  const nomeDe = (id: string) => base.pacientes.find((p) => p.id === id)?.nome ?? '';
  const limpar = () => { setT(''); setAberta(false); setSel(0); };

  let cab: string[] = [];
  let todos: Res[] = [];
  if (termo.length >= 2) {
    const q = semAcento(termo);
    const dataQ = termo.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
    const casaData = (iso: string) => !!dataQ && iso.slice(8, 10) === dataQ[1].padStart(2, '0') && iso.slice(5, 7) === dataQ[2].padStart(2, '0') && (!dataQ[3] || iso.slice(0, 4).endsWith(dataQ[3]));
    const casaNome = (nome: string) => q.split(/\s+/).every((x) => semAcento(nome).includes(x));
    const valorQ = Number(termo.replace(/[R$\s.]/g, '').replace(',', '.'));

    if (escopo === 'paciente') {
      cab = ['Nome', 'Nasc.', 'CPF', 'Celular'];
      todos = buscarPacientes(cadastrados(base.pacientes), termo).map((p) => ({
        id: p.id, cols: [p.nome, p.nascimento ? br(p.nascimento) : '—', cpfOculto(p.cpf) || '—', p.telefone || '—'],
        abrir: () => nav('/pacientes/' + p.id),
      }));
    }
    if (escopo === 'agendamento') {
      cab = ['Data', 'Hora', 'Paciente', 'Serviço', 'Situação'];
      todos = base.agendamentos
        .filter((a) => (dataQ ? casaData(a.data) : casaNome(nomeDe(a.pacienteId))))
        // próximos primeiro (do mais perto ao mais longe), depois os passados (do mais recente)
        .sort((x, y) => (x.data >= hj) !== (y.data >= hj) ? (x.data >= hj ? -1 : 1) : x.data >= hj ? (x.data + x.hora).localeCompare(y.data + y.hora) : (y.data + y.hora).localeCompare(x.data + x.hora))
        .map((a) => ({
          id: a.id, cols: [br(a.data), a.hora, nomeDe(a.pacienteId), base.servicos.find((s) => s.id === a.servicoId)?.curto ?? '', <TagStatus s={a.status} />],
          abrir: () => setAg(a.id),
        }));
    }
    if (escopo === 'financeiro' && medica) {
      cab = ['Data', 'Tipo', 'Descrição', 'Valor'];
      const rec = base.agendamentos
        .filter((a) => a.pagamento?.status === 'pago')
        .filter((a) => (dataQ ? casaData(a.pagamento!.pagoEm ?? a.data) : casaNome(nomeDe(a.pacienteId)) || (valorQ > 0 && Math.abs(a.pagamento!.valor - valorQ) < 0.01)))
        .map((a) => ({ data: a.pagamento!.pagoEm ?? a.data, r: { id: 'r' + a.id, cols: [br(a.pagamento!.pagoEm ?? a.data), 'Recebimento', `${nomeDe(a.pacienteId)} · ${base.servicos.find((s) => s.id === a.servicoId)?.curto ?? ''}`, moeda(a.pagamento!.valor)], abrir: () => setAg(a.id) } }));
      const des = base.despesas
        .filter((d) => (dataQ ? casaData(d.data) : casaNome(d.descricao) || semAcento(d.categoria).includes(q) || (valorQ > 0 && Math.abs(d.valor - valorQ) < 0.01)))
        .map((d) => ({ data: d.data, r: { id: 'd' + d.id, cols: [br(d.data), d.status === 'paga' ? 'Despesa paga' : 'Despesa a pagar', `${d.descricao} · ${d.categoria}`, moeda(d.valor)], abrir: () => setDespesa(d.id) } }));
      todos = [...rec, ...des].sort((x, y) => y.data.localeCompare(x.data)).map((x) => x.r);
    }
  }
  const res = todos.slice(0, MAX);
  const abrir = (r: Res) => { limpar(); r.abrir(); };
  const verTodos = escopo === 'paciente' && todos.length > MAX;
  const tecla = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(s + 1, res.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
    if (e.key === 'Enter' && res[sel]) abrir(res[sel]);
    if (e.key === 'Escape') { limpar(); e.currentTarget.blur(); }
  };

  return (
    <div className="busca-geral">
      <select className="bg-escopo" value={escopo} onChange={(e) => { setEscopo(e.target.value as Escopo); setSel(0); }} aria-label="Onde buscar" title="Onde buscar">
        <option value="paciente">Paciente</option>
        <option value="agendamento">Agendamento</option>
        {medica && <option value="financeiro">Financeiro</option>}
      </select>
      <div className="bg-campo">
        <Icone n="busca" />
        <input
          type="text" value={t} placeholder={DICA[escopo]} aria-label="Busca no sistema"
          onChange={(e) => { setT(e.target.value); setAberta(true); setSel(0); }} onFocus={() => setAberta(true)} onBlur={() => setTimeout(() => setAberta(false), 150)}
          onKeyDown={tecla}
        />
      </div>
      {aberta && termo.length >= 2 && (
        <div className="busca-res">
          {res.length === 0 ? <div className="vazio">Nada encontrado em {escopo === 'paciente' ? 'pacientes' : escopo === 'agendamento' ? 'agendamentos' : 'financeiro'}.</div> : (
            <table className="bg-tab">
              <thead><tr>{cab.map((c) => <th key={c}>{c}</th>)}</tr></thead>
              <tbody>
                {res.map((r, i) => (
                  <tr key={r.id} className={i === sel ? 'sel' : ''} onMouseEnter={() => setSel(i)} onMouseDown={(e) => { e.preventDefault(); abrir(r); }}>
                    {r.cols.map((c, k) => <td key={k} className={k === 0 && escopo === 'paciente' ? 'bg-nome' : k > 0 && escopo === 'paciente' ? 'mono' : ''}>{c}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {verTodos && (
            <button type="button" className="bg-todos" onMouseDown={(e) => { e.preventDefault(); const q = termo; limpar(); nav('/pacientes?q=' + encodeURIComponent(q)); }}>
              Ver todos os resultados ({todos.length})
            </button>
          )}
          {!verTodos && todos.length > MAX && <div className="bg-mais mut">Mostrando {MAX} de {todos.length}. Refine a busca.</div>}
        </div>
      )}
      {ag && <DetalheAgendamento id={ag} fechar={() => setAg(null)} />}
      {despesa && <ModalDespesa id={despesa} fechar={() => setDespesa(null)} />}
    </div>
  );
}
