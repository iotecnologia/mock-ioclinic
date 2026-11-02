// Campo de CID com busca inteligente: por código (I10), pela descrição ou pela situação ("dor no peito"), sem acento.
// Usado no prontuário e no atestado.
import { useState } from 'react';
import type { Cid } from '../tipos/modelos';
import { useDados } from './Dados';
import { Icone } from './Icone';
import { buscarCid } from '../regras/prontuario';

export function CidBusca({ valor, aoEscolher, disabled }: { valor?: { codigo: string; descricao: string }; aoEscolher: (c: Cid | undefined) => void; disabled?: boolean }) {
  const { base } = useDados();
  const [t, setT] = useState('');
  const [aberta, setAberta] = useState(false);
  const res = buscarCid(base.cids, t);
  if (valor?.codigo) {
    return (
      <div className="cid-escolhido">
        <span className="mono">{valor.codigo}</span><span>{valor.descricao}</span>
        {!disabled && <button type="button" className="icone-btn" title="Trocar CID" aria-label="Trocar CID" onClick={() => aoEscolher(undefined)}><Icone n="x" /></button>}
      </div>
    );
  }
  return (
    <div className="cid-busca">
      <Icone n="busca" />
      <input type="text" value={t} disabled={disabled} placeholder="Código ou situação (ex.: I10, dor no peito, pressão alta, falta de ar)"
        onChange={(e) => { setT(e.target.value); setAberta(true); }} onFocus={() => setAberta(true)} onBlur={() => setTimeout(() => setAberta(false), 150)}
        onKeyDown={(e) => { if (e.key === 'Enter' && res[0]) { e.preventDefault(); aoEscolher(res[0]); setT(''); } }} />
      {aberta && t.trim() && (
        <div className="busca-res">
          {res.length ? res.map((c) => (
            <button type="button" key={c.codigo + c.descricao} onMouseDown={(e) => { e.preventDefault(); aoEscolher(c); setT(''); setAberta(false); }}>
              <b><span className="mono">{c.codigo}</span> · {c.descricao}</b><small>{c.grupo}</small>
            </button>
          )) : <div className="vazio">Nenhum CID encontrado.</div>}
        </div>
      )}
    </div>
  );
}
