// Busca de paciente no topo (nome, CPF ou telefone). Enter ou clique abre a ficha.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDados } from './Dados';
import { Icone } from './Icone';
import { buscarPacientes, idade } from '../regras/paciente';
import { hoje } from '../util/datas';

export function BuscaGeral() {
  const { base } = useDados();
  const nav = useNavigate();
  const [t, setT] = useState('');
  const [aberta, setAberta] = useState(false);
  const res = t.trim().length >= 2 ? buscarPacientes(base.pacientes, t).slice(0, 7) : [];
  const abrir = (id: string) => { setT(''); setAberta(false); nav('/pacientes/' + id); };
  return (
    <div className="busca-geral">
      <Icone n="busca" />
      <input
        type="text" value={t} placeholder="Buscar paciente por nome, CPF ou telefone…" aria-label="Buscar paciente"
        onChange={(e) => { setT(e.target.value); setAberta(true); }} onFocus={() => setAberta(true)} onBlur={() => setTimeout(() => setAberta(false), 150)}
        onKeyDown={(e) => { if (e.key === 'Enter' && res[0]) abrir(res[0].id); if (e.key === 'Escape') { setT(''); (e.target as HTMLInputElement).blur(); } }}
      />
      {aberta && t.trim().length >= 2 && (
        <div className="busca-res">
          {res.length ? res.map((p) => (
            <button type="button" key={p.id} onMouseDown={(e) => { e.preventDefault(); abrir(p.id); }}>
              <b>{p.nome}</b><small>{idade(p.nascimento, hoje())} anos · {p.telefone}</small>
            </button>
          )) : <div className="vazio">Nenhum paciente encontrado.</div>}
        </div>
      )}
    </div>
  );
}
