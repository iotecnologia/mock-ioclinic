// Relatórios (só a médica): escolhe o relatório e o período (o mesmo do Painel e do Financeiro), vê a tabela com total,
// imprime (preto no branco; negrito só no título e no cabeçalho) ou exporta CSV para o Excel.
import { useState } from 'react';
import { useDados } from '../componentes/Dados';
import { Bloco, BotaoIcone, TituloPagina, Vazio } from '../componentes/Comuns';
import { Imprimir } from '../componentes/Folha';
import { SeletorPeriodo, usePeriodo } from '../componentes/SeletorPeriodo';
import { celula, montarRelatorio, paraCsv, type TipoRelatorio } from '../regras/financeiro';
import { br, hoje } from '../util/datas';
import { moeda } from '../util/formato';

const TIPOS: { id: TipoRelatorio; nome: string }[] = [
  { id: 'atendimentos', nome: 'Atendimentos' }, { id: 'receitas', nome: 'Receitas' }, { id: 'despesas', nome: 'Despesas' },
  { id: 'fluxo', nome: 'Fluxo de caixa' }, { id: 'pacientes', nome: 'Pacientes novos' },
];

export function Relatorios() {
  const { base } = useDados();
  const hj = hoje();
  const [tipo, setTipo] = useState<TipoRelatorio>('receitas');
  const [per] = usePeriodo();
  const [imp, setImp] = useState(false);
  const valido = per.de && per.ate && per.de <= per.ate;
  const r = valido ? montarRelatorio(tipo, base, per.de, per.ate) : null;

  const exportar = () => {
    if (!r) return;
    const url = URL.createObjectURL(new Blob([paraCsv(r)], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = `${r.titulo.toLowerCase().replace(/\s+/g, '-')}_${per.de}_a_${per.ate}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const tabela = r && (
    <table className="tab rel-tab">
      <thead><tr>{r.colunas.map((c) => <th key={c.titulo} className={c.num ? 'dir' : ''}>{c.titulo}</th>)}</tr></thead>
      <tbody>{r.linhas.map((l, i) => <tr key={i}>{l.map((v, k) => <td key={k} className={r.colunas[k].num ? 'dir mono' : ''}>{celula(v, r.colunas[k].num, moeda)}</td>)}</tr>)}</tbody>
      {r.total && <tfoot><tr>{r.total.map((v, k) => <td key={k} className={r.colunas[k].num ? 'dir mono' : ''}>{celula(v, r.colunas[k].num, moeda)}</td>)}</tr></tfoot>}
    </table>
  );

  // tabela da FOLHA IMPRESSA: própria, sem nenhum estilo da tela (nada grudado, nada em caixa alta);
  // o total é a última linha, uma vez só; o cabeçalho das colunas repete no topo de cada página.
  const tabelaImpressa = r && (
    <table className="ri-tab">
      <thead><tr>{r.colunas.map((c) => <th key={c.titulo} className={c.num ? 'dir' : ''}>{c.titulo}</th>)}</tr></thead>
      <tbody>
        {r.linhas.map((l, i) => <tr key={i}>{l.map((v, k) => <td key={k} className={r.colunas[k].num ? 'dir' : ''}>{celula(v, r.colunas[k].num, moeda)}</td>)}</tr>)}
        {r.total && <tr className="ri-total">{r.total.map((v, k) => <td key={k} className={r.colunas[k].num ? 'dir' : ''}>{celula(v, r.colunas[k].num, moeda)}</td>)}</tr>}
      </tbody>
    </table>
  );

  return (
    <>
      <TituloPagina titulo="Relatórios" sub="Escolha o relatório e o período. Imprima ou exporte para o Excel.">
        <BotaoIcone icone="imprimir" titulo="Imprimir relatório" onClick={() => setImp(true)} disabled={!r || !r.linhas.length} />
        <BotaoIcone icone="pdf" titulo="Exportar CSV (Excel)" pri onClick={exportar} disabled={!r || !r.linhas.length} />
      </TituloPagina>

      <div className="barra">
        <div className="segmentado">{TIPOS.map((t) => <button type="button" key={t.id} className={tipo === t.id ? 'sel' : ''} onClick={() => setTipo(t.id)}>{t.nome}</button>)}</div>
      </div>
      <div className="barra">
        <SeletorPeriodo />
      </div>

      <Bloco titulo={r ? `${r.titulo} · ${br(per.de)} a ${br(per.ate)}` : 'Relatório'} extra={r && <span className="mut peq">{r.linhas.length} linhas</span>}>
        {!valido ? <Vazio>Período inválido: a data inicial precisa ser anterior à final.</Vazio>
          : !r!.linhas.length ? <Vazio>Nada no período escolhido.</Vazio>
          : <div className="rel-rolagem">{tabela}</div>}
      </Bloco>

      {imp && r && (
        <Imprimir aoTerminar={() => setImp(false)}>
          <div className="rel-impressao">
            <div className="ri-cab">{base.clinica.medica} · {base.clinica.especialidade} · {base.clinica.cidade}</div>
            <h1>{r.titulo}</h1>
            <div className="ri-per">Período: {br(per.de)} a {br(per.ate)} · emitido em {br(hj)}</div>
            {tabelaImpressa}
          </div>
        </Imprimir>
      )}
    </>
  );
}
