// Lista de pacientes (padrão de sistema de gestão): filtro da lista, 20 por página, ordenar clicando no cabeçalho,
// cabeçalho da tabela fixo com rolagem só na lista. Inclui "sem consulta há 12 meses" para o recall anual.
// A busca do TOPO é a global (paciente, agendamento, financeiro); esta aqui só filtra a lista.
// Vindo do "Ver todos os resultados" da busca global, chega com ?q=termo já preenchido.
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDados } from '../componentes/Dados';
import { Avatar, TituloPagina, Vazio } from '../componentes/Comuns';
import { Icone } from '../componentes/Icone';
import { PacienteModal } from '../componentes/PacienteModal';
import { buscarPacientes, cadastrados, idade, resumoPaciente } from '../regras/paciente';
import { br, hoje, somaDias } from '../util/datas';
import { cpfOculto } from '../util/formato';

type Filtro = 'todos' | 'agendados' | 'recall' | 'lgpd';
type Coluna = 'nome' | 'idade' | 'ultima' | 'proximo';
const POR_PAGINA = 20;

export function Pacientes() {
  const { base } = useDados();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const [novo, setNovo] = useState(false);
  const hj = hoje();
  const [t, setT] = useState(params.get('q') ?? '');
  const [f, setF] = useState<Filtro>(((['agendados', 'recall', 'lgpd'] as string[]).includes(params.get('f') ?? '') ? params.get('f') : 'todos') as Filtro);
  const [ordem, setOrdem] = useState<{ col: Coluna; asc: boolean }>({ col: 'nome', asc: true });
  const [pag, setPag] = useState(1);
  useEffect(() => { const q = params.get('q'); if (q !== null) setT(q); const x = params.get('f'); if (x && ['agendados', 'recall', 'lgpd'].includes(x)) setF(x as Filtro); }, [params]);
  useEffect(() => setPag(1), [t, f, ordem]);
  // vindo da busca global ou do endereço antigo /pacientes/novo: abre o pop-up de cadastro
  useEffect(() => { if (params.get('novo') === '1') { setNovo(true); const n = new URLSearchParams(params); n.delete('novo'); setParams(n, { replace: true }); } }, [params]);          // mudou o filtro ou a ordem: volta para a 1ª página

  const linhas = buscarPacientes(cadastrados(base.pacientes), t).map((p) => ({ p, r: resumoPaciente(p.id, base, hj) }));
  const umAno = somaDias(hj, -365);
  const passa = (x: Filtro, { p, r }: (typeof linhas)[number]) =>
    x === 'agendados' ? !!r.proximo : x === 'recall' ? !r.proximo && (!r.ultima || r.ultima.data < umAno) : x === 'lgpd' ? !p.consentimentoLgpd : true;
  const filtradas = linhas.filter((l) => passa(f, l));
  const n = (x: Filtro) => linhas.filter((l) => passa(x, l)).length;

  // ordenação (vazio sempre no fim, nos dois sentidos)
  const valor = ({ p, r }: (typeof linhas)[number]): string | number | null =>
    ordem.col === 'nome' ? p.nome : ordem.col === 'idade' ? idade(p.nascimento, hj) : ordem.col === 'ultima' ? r.ultima?.data ?? null : r.proximo ? r.proximo.data + r.proximo.hora : null;
  const ordenadas = [...filtradas].sort((a, b) => {
    const va = valor(a), vb = valor(b);
    if (va === null || vb === null) return va === vb ? 0 : va === null ? 1 : -1;
    const c = typeof va === 'number' ? va - (vb as number) : String(va).localeCompare(String(vb), 'pt-BR');
    return ordem.asc ? c : -c;
  });
  const total = ordenadas.length;
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const atual = Math.min(pag, paginas);
  const pagina = ordenadas.slice((atual - 1) * POR_PAGINA, atual * POR_PAGINA);
  const ordenar = (col: Coluna) => setOrdem((o) => ({ col, asc: o.col === col ? !o.asc : true }));
  const Th = ({ col, children, cls }: { col: Coluna; children: string; cls?: string }) => (
    <th className={'ord' + (cls ? ' ' + cls : '')} aria-sort={ordem.col === col ? (ordem.asc ? 'ascending' : 'descending') : 'none'}>
      <button type="button" onClick={() => ordenar(col)} title={`Ordenar por ${children.toLowerCase()}`}>
        {children}<span className="seta">{ordem.col === col ? (ordem.asc ? '▲' : '▼') : ''}</span>
      </button>
    </th>
  );

  return (
    <>
      <TituloPagina titulo="Pacientes" sub={`${cadastrados(base.pacientes).length} pacientes cadastrados`}>
        <button type="button" className="btn2 pri" onClick={() => setNovo(true)}><Icone n="pacienteMais" /> Novo paciente</button>
      </TituloPagina>
      <div className="barra">
        <div className="f-busca"><Icone n="busca" /><input type="text" value={t} onChange={(e) => setT(e.target.value)} placeholder="Filtrar a lista por nome, CPF ou telefone" aria-label="Filtrar pacientes" /></div>
        <div className="segmentado">
          <button type="button" className={f === 'todos' ? 'sel' : ''} onClick={() => setF('todos')}>Todos <small>{n('todos')}</small></button>
          <button type="button" className={f === 'agendados' ? 'sel' : ''} onClick={() => setF('agendados')}>Com agendamento <small>{n('agendados')}</small></button>
          <button type="button" className={f === 'recall' ? 'sel' : ''} onClick={() => setF('recall')} title="Sem consulta há mais de 12 meses e sem agendamento: chamar para revisão anual">Revisão anual <small>{n('recall')}</small></button>
          <button type="button" className={f === 'lgpd' ? 'sel' : ''} onClick={() => setF('lgpd')} title="Termo LGPD ainda não aceito">Termo pendente <small>{n('lgpd')}</small></button>
        </div>
      </div>
      <div className="bloco pac-lista">
        {total === 0 ? <Vazio>Nenhum paciente encontrado.</Vazio> : (
          <>
            <div className="pac-rolagem">
              <table className="tab pac-tab">
                <colgroup><col /><col className="c-idade" /><col className="c-cel" /><col className="c-cpf" /><col className="c-data" /><col className="c-prox" /></colgroup>
                <thead><tr>
                  <Th col="nome">Paciente</Th><Th col="idade" cls="num">Idade</Th><th>Celular</th><th>CPF</th>
                  <Th col="ultima">Última visita</Th><Th col="proximo">Próximo agend.</Th>
                </tr></thead>
                <tbody>
                  {pagina.map(({ p, r }) => (
                    <tr key={p.id} className="clic" onClick={() => nav('/pacientes/' + p.id)}>
                      <td><div className="cel-pac"><Avatar nome={p.nome} /><div>{p.nome}{!p.consentimentoLgpd && <span className="tag t-at" title="Termo LGPD pendente">termo pendente</span>}</div></div></td>
                      <td className="num">{idade(p.nascimento, hj)}</td>
                      <td className="mono nw">{p.telefone}</td>
                      <td className="mono mut nw">{cpfOculto(p.cpf)}</td>
                      <td className="nw">{r.ultima ? br(r.ultima.data) : <span className="mut">—</span>}</td>
                      <td className="nw">{r.proximo ? <>{br(r.proximo.data)} <span className="mut mono">{r.proximo.hora}</span></> : <span className="mut">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="paginacao">
              <span className="mut">{(atual - 1) * POR_PAGINA + 1}–{Math.min(atual * POR_PAGINA, total)} de {total}</span>
              <div className="pg-nav">
                <button type="button" className="icone-btn" onClick={() => setPag(atual - 1)} disabled={atual === 1} title="Página anterior" aria-label="Página anterior"><Icone n="esq" /></button>
                {Array.from({ length: paginas }, (_, i) => i + 1)
                  .filter((i) => i === 1 || i === paginas || Math.abs(i - atual) <= 1)
                  .map((i, k, arr) => (
                    <span key={i} className="pg-item">
                      {k > 0 && i - arr[k - 1] > 1 && <span className="mut">…</span>}
                      <button type="button" className={'pg-num' + (i === atual ? ' sel' : '')} onClick={() => setPag(i)} aria-current={i === atual ? 'page' : undefined}>{i}</button>
                    </span>
                  ))}
                <button type="button" className="icone-btn" onClick={() => setPag(atual + 1)} disabled={atual === paginas} title="Próxima página" aria-label="Próxima página"><Icone n="dir" /></button>
              </div>
            </div>
          </>
        )}
      </div>
      {novo && <PacienteModal fechar={() => setNovo(false)} />}
    </>
  );
}
