// Busca GLOBAL do topo (padrão ERP): um campo só. Digita a palavra-chave e o sistema lista PARA ONDE IR:
// páginas e funções ("Financeiro › Nova despesa") e, se for nome/CPF/telefone, os pacientes ("Pacientes › Fulano").
// Clicar (ou Enter) leva direto ao destino. Setas ↑ ↓ escolhem, Esc limpa.
import { useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDados } from './Dados';
import { useSessao } from '../acesso/Sessao';
import { Icone } from './Icone';
import { buscarDestinos } from '../regras/destinos';
import { buscarPacientes, cadastrados } from '../regras/paciente';
import { br } from '../util/datas';

interface Item { id: string; caminho: string[]; desc: string; rota: string }
const MAX_DEST = 6, MAX_PAC = 5;

export function BuscaGeral() {
  const { base } = useDados();
  const { usuario } = useSessao();
  const nav = useNavigate();
  const [t, setT] = useState('');
  const [aberta, setAberta] = useState(false);
  const [sel, setSel] = useState(0);
  const termo = t.trim();
  const limpar = () => { setT(''); setAberta(false); setSel(0); };

  const destinos: Item[] = termo.length >= 2 ? buscarDestinos(termo, usuario!.perfil).slice(0, MAX_DEST) : [];
  const todosPac = termo.length >= 2 ? buscarPacientes(cadastrados(base.pacientes), termo) : [];
  const pacientes: Item[] = todosPac.slice(0, MAX_PAC).map((p) => ({
    id: 'p' + p.id, caminho: ['Pacientes', p.nome], rota: '/pacientes/' + p.id,
    desc: [p.nascimento && 'nasc. ' + br(p.nascimento), p.telefone].filter(Boolean).join(' · '),
  }));
  if (todosPac.length > MAX_PAC) pacientes.push({ id: 'todos', caminho: ['Pacientes', `Ver os ${todosPac.length} pacientes encontrados`], rota: '/pacientes?q=' + encodeURIComponent(termo), desc: 'abre a lista já filtrada' });
  const itens = [...destinos, ...pacientes];
  const ir = (i: Item) => { limpar(); nav(i.rota); };
  const tecla = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(s + 1, itens.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
    if (e.key === 'Enter' && itens[sel]) ir(itens[sel]);
    if (e.key === 'Escape') { limpar(); e.currentTarget.blur(); }
  };
  const linha = (i: Item, n: number) => (
    <button type="button" key={i.id} className={'bg-item' + (n === sel ? ' sel' : '')} onMouseEnter={() => setSel(n)} onMouseDown={(e) => { e.preventDefault(); ir(i); }}>
      <span className="bg-cam">{i.caminho.slice(0, -1).map((c) => <span key={c}>{c} › </span>)}<b>{i.caminho[i.caminho.length - 1]}</b></span>
      <small>{i.desc}</small>
    </button>
  );

  return (
    <div className="busca-geral">
      <Icone n="busca" />
      <input
        type="text" value={t} placeholder="Buscar no sistema: paciente, página ou função…" aria-label="Busca no sistema"
        onChange={(e) => { setT(e.target.value); setAberta(true); setSel(0); }} onFocus={() => setAberta(true)} onBlur={() => setTimeout(() => setAberta(false), 150)}
        onKeyDown={tecla}
      />
      {aberta && termo.length >= 2 && (
        <div className="busca-res">
          {itens.length === 0 && <div className="vazio">Nada encontrado para “{termo}”.</div>}
          {destinos.length > 0 && <div className="bg-grupo">Páginas e funções</div>}
          {destinos.map((i, n) => linha(i, n))}
          {pacientes.length > 0 && <div className="bg-grupo">Pacientes</div>}
          {pacientes.map((i, n) => linha(i, destinos.length + n))}
        </div>
      )}
    </div>
  );
}
