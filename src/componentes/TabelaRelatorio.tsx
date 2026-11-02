// Tabela de um relatório (mesmas colunas e total da tela Relatórios), para mostrar o detalhe na própria tela
// — card do Painel, saldo do Financeiro — sem trocar de página.
import { Modal, Vazio } from './Comuns';
import { celula, type Relatorio } from '../regras/financeiro';
import { moeda } from '../util/formato';

export function TabelaRelatorio({ r }: { r: Relatorio }) {
  if (!r.linhas.length) return <Vazio>Nada no período escolhido.</Vazio>;
  return (
    <div className="rel-rolagem">
      <table className="tab rel-tab">
        <thead><tr>{r.colunas.map((c) => <th key={c.titulo} className={c.num ? 'dir' : ''}>{c.titulo}</th>)}</tr></thead>
        <tbody>{r.linhas.map((l, i) => <tr key={i}>{l.map((v, k) => <td key={k} className={r.colunas[k].num ? 'dir mono' : ''}>{celula(v, r.colunas[k].num, moeda)}</td>)}</tr>)}</tbody>
        {r.total && <tfoot><tr>{r.total.map((v, k) => <td key={k} className={r.colunas[k].num ? 'dir mono' : ''}>{celula(v, r.colunas[k].num, moeda)}</td>)}</tr></tfoot>}
      </table>
    </div>
  );
}

/** O relatório numa janela (título + período + tabela com total). */
export function ModalRelatorio({ r, periodo, fechar }: { r: Relatorio; periodo: string; fechar: () => void }) {
  return (
    <Modal titulo={`${r.titulo} · ${periodo}`} fechar={fechar} largo>
      <p className="mut peq">{r.linhas.length} linha{r.linhas.length !== 1 ? 's' : ''} · para imprimir ou exportar, use a tela Relatórios.</p>
      <div className="bloco rel-modal"><TabelaRelatorio r={r} /></div>
    </Modal>
  );
}
