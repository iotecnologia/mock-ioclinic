// Emissão de documentos do atendimento: atestado, receita, pedido de exames e declaração de comparecimento.
// Formulário à esquerda, prévia da folha à direita. "Imprimir" registra o documento no histórico e abre a impressão.
import { useState } from 'react';
import type { Documento, Paciente, TipoDocumento } from '../tipos/modelos';
import { useDados } from './Dados';
import { Modal } from './Comuns';
import { Icone } from './Icone';
import { Folha, Imprimir } from './Folha';
import { ExameBusca, MedicamentoBusca } from './Buscas';
import { atestado, comparecimento, NOME_DOC, pedidoExames, receita } from '../regras/documentos';
import { hhmm, hoje, min } from '../util/datas';


export function ConteudoDoc({ d }: { d: Omit<Documento, 'id'> }) {
  return <>{d.paragrafos.map((p, i) => <p key={i}>{p}</p>)}{d.itens && <ul>{d.itens.map((x, i) => <li key={i}>{x}</li>)}</ul>}</>;
}

export function EmitirDocumento({ paciente, tipoInicial, cid, exames, hora, fechar }: {
  paciente: Paciente; tipoInicial: TipoDocumento; cid?: string; exames?: string[]; hora?: string; fechar: () => void;
}) {
  const { base, acoes } = useDados();
  const hj = hoje();
  const [tipo, setTipo] = useState<TipoDocumento>(tipoInicial);
  const [timbrado, setTimbrado] = useState(false);
  const [imprimindo, setImprimindo] = useState(false);
  const [emitidos, setEmitidos] = useState<string[]>([]);
  // atestado
  const [dias, setDias] = useState(1);
  const [inicio, setInicio] = useState(hj);
  const [comCid, setComCid] = useState(false);
  // receita
  const resumo = base.resumos.find((r) => r.pacienteId === paciente.id);
  const [itens, setItens] = useState<{ nome: string; uso: string }[]>(() => [{ nome: '', uso: '' }]);
  // pedido
  const [sel, setSel] = useState<string[]>(exames ?? []);
  const [indicacao, setIndicacao] = useState(cid ?? '');
  // comparecimento
  const [de, setDe] = useState(hora ?? '08:00');
  const [ate, setAte] = useState(hora ? hhmm(min(hora) + 60) : '09:00');

  const doc: Omit<Documento, 'id'> =
    tipo === 'atestado' ? atestado(paciente, { data: hj, dias, inicio, cid: comCid ? cid : undefined })
    : tipo === 'receita' ? receita(paciente, { data: hj, itens })
    : tipo === 'pedido_exames' ? pedidoExames(paciente, { data: hj, exames: sel, indicacao: indicacao || undefined })
    : comparecimento(paciente, { data: hj, de, ate });
  const vazio = (tipo === 'receita' && !doc.itens?.length) || (tipo === 'pedido_exames' && !sel.length);
  const exClinica = base.servicos.filter((s) => s.tipo === 'exame').map((s) => s.nome);
  const marca = (x: string) => setSel((l) => (l.includes(x) ? l.filter((y) => y !== x) : [...l, x]));

  const imprimir = () => { acoes.emitirDocumento(doc); setEmitidos((e) => [...e, NOME_DOC[tipo]]); setImprimindo(true); };

  return (
    <Modal titulo={`Documentos · ${paciente.nome}`} fechar={fechar} largo>
      <div className="segmentado docs-tipos">
        {(Object.keys(NOME_DOC) as TipoDocumento[]).map((t) => <button type="button" key={t} className={tipo === t ? 'sel' : ''} onClick={() => setTipo(t)}>{NOME_DOC[t]}</button>)}
      </div>
      <div className="emitir">
        <div className="emitir-form">
          {tipo === 'atestado' && (
            <>
              <label>Dias de afastamento<input type="number" min={0} max={90} value={dias} onChange={(e) => setDias(Math.max(0, Number(e.target.value)))} /></label>
              <label>A partir de<input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} /></label>
              <label className="chk-linha"><input type="checkbox" checked={comCid} disabled={!cid} onChange={(e) => setComCid(e.target.checked)} />
                <span>Incluir CID {cid ? <b className="mono">{cid.split(' ')[0]}</b> : '(informe o CID no atendimento)'}<small>Só com autorização do paciente (Resolução CFM).</small></span></label>
            </>
          )}
          {tipo === 'receita' && (
            <>
              {resumo && resumo.medicamentos.length > 0 && (
                <div className="sugestoes-med"><span>Em uso — clique para repetir:</span>
                  {resumo.medicamentos.map((m) => { const [nome, uso] = m.split(' — '); return <button type="button" key={m} className="chip-sug" onClick={() => setItens((l) => [...l.filter((x) => x.nome.trim()), { nome, uso: uso ?? '' }])}><Icone n="mais" /> {nome}</button>; })}
                </div>
              )}
              <MedicamentoBusca aoEscolher={(m, dose) => setItens((l) => [...l.filter((x) => x.nome.trim()), { nome: `${m.principio} ${dose}`, uso: m.posologia }])} />
              {itens.map((it, i) => (
                <div key={i} className="linha-med">
                  <input placeholder="Medicamento e dose" value={it.nome} onChange={(e) => setItens((l) => l.map((x, k) => (k === i ? { ...x, nome: e.target.value } : x)))} />
                  <input placeholder="Como usar" value={it.uso} onChange={(e) => setItens((l) => l.map((x, k) => (k === i ? { ...x, uso: e.target.value } : x)))} />
                  <button type="button" className="icone-btn" title="Remover" aria-label="Remover" onClick={() => setItens((l) => (l.length > 1 ? l.filter((_, k) => k !== i) : [{ nome: '', uso: '' }]))}><Icone n="x" /></button>
                </div>
              ))}
              <button type="button" className="btn2 peq" onClick={() => setItens((l) => [...l, { nome: '', uso: '' }])}><Icone n="mais" /> Medicamento</button>
            </>
          )}
          {tipo === 'pedido_exames' && (
            <>
              <div className="lbl-peq">Exames da clínica</div>
              <div className="chips-sel">{exClinica.map((x) => <button type="button" key={x} className={sel.includes(x) ? 'sel' : ''} onClick={() => marca(x)}>{x}</button>)}</div>
              <div className="lbl-peq">Outros exames</div>
              <ExameBusca escolhidos={sel.filter((x) => !exClinica.includes(x))} mudar={(l) => setSel([...sel.filter((x) => exClinica.includes(x)), ...l])} />
              <label>Indicação clínica<input value={indicacao} onChange={(e) => setIndicacao(e.target.value)} placeholder="Ex.: I10 · Hipertensão essencial" /></label>
            </>
          )}
          {tipo === 'comparecimento' && (
            <div className="g2">
              <label>Chegada<input type="time" value={de} onChange={(e) => setDe(e.target.value)} /></label>
              <label>Saída<input type="time" value={ate} onChange={(e) => setAte(e.target.value)} /></label>
            </div>
          )}
          <label className="chk-linha timb"><input type="checkbox" checked={timbrado} onChange={(e) => setTimbrado(e.target.checked)} /><span>Imprimir em papel timbrado<small>Esconde o cabeçalho e deixa a margem de cima livre.</small></span></label>
          {emitidos.length > 0 && <div className="certo-peq"><Icone n="check" /> Emitido nesta consulta: {emitidos.join(', ')}</div>}
          <div className="rodape-modal">
            <button type="button" className="btn2" onClick={fechar}>Fechar</button>
            <button type="button" className="btn2 pri" disabled={vazio} onClick={imprimir}><Icone n="imprimir" /> Imprimir</button>
          </div>
        </div>
        <div className="emitir-previa">
          <Folha clinica={base.clinica} titulo={doc.titulo} data={hj} timbrado={timbrado} paciente={paciente}><ConteudoDoc d={doc} /></Folha>
        </div>
      </div>
      {imprimindo && <Imprimir aoTerminar={() => setImprimindo(false)}><Folha clinica={base.clinica} titulo={doc.titulo} data={hj} timbrado={timbrado} paciente={paciente}><ConteudoDoc d={doc} /></Folha></Imprimir>}
    </Modal>
  );
}
