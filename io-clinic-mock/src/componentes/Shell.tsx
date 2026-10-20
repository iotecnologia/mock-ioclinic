// Estrutura da tela (mesmo padrão do Analiza): menu lateral por grupo, topo com busca e usuário, conteúdo, rodapé.
// O menu mostra só as páginas que o perfil libera; itens "em breve" ficam foscos.
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { Icone } from './Icone';
import { Logo, Marca } from './Marca';
import { BuscaGeral } from './BuscaGeral';
import { Avatar, SeloMock } from './Comuns';
import { local } from '../util/formato';
import { useSessao } from '../acesso/Sessao';
import { EM_BREVE, GRUPOS, PAGINAS } from '../acesso/paginas';

const NOMES_ROTA: Record<string, string> = { novo: 'Novo paciente' };
const SUB_PADRAO: Record<string, string> = { pacientes: 'Ficha do paciente', prontuario: 'Paciente' };

export function Shell() {
  const s = useSessao();
  const perfil = s.usuario!.perfil;
  const [claro, setClaro] = useState(() => local.ler('tema-claro', true));
  const loc = useLocation();
  const partes = loc.pathname.split('/').filter(Boolean);
  const atual = PAGINAS.find((p) => p.rota === '/' + partes[0]);
  const sub = partes[1] ? NOMES_ROTA[partes[1]] ?? SUB_PADRAO[partes[0]] ?? '' : '';
  const trocarTema = () => { setClaro(!claro); local.gravar('tema-claro', !claro); };
  return (
    <div className={'app' + (claro ? ' tema-claro' : '')}>
      <aside className="lateral">
        <div className="lat-topo"><Marca /></div>
        <nav className="lat-nav" aria-label="Menu principal">
          {GRUPOS.map((g) => {
            const itens = PAGINAS.filter((p) => p.grupo === g && p.perfis.includes(perfil));
            const breve = EM_BREVE.filter((x) => x.grupo === g && x.perfis.includes(perfil));
            if (!itens.length && !breve.length) return null;
            return (
              <div key={g || 'topo'}>
                {g && <div className="lat-sec">{g}</div>}
                {itens.map((p) => <NavLink key={p.id} to={p.rota} className={({ isActive }) => 'lat-item' + (isActive ? ' ativo' : '')}><Icone n={p.icone} /><span className="nm">{p.nome}</span></NavLink>)}
                {breve.map((x) => <span key={x.nome} className="lat-item em-breve" title={x.dica} aria-disabled="true"><Icone n={x.icone} /><span className="nm">{x.nome}</span></span>)}
              </div>
            );
          })}
        </nav>
        <div className="lat-rodape">v0.1 · mock de apresentação</div>
      </aside>
      <header className="topo">
        <div className="topo-marca"><Logo tam={30} /><b>IO CLINIC</b></div>
        <div className="migalha">Início{atual && <> &nbsp;/&nbsp; {sub ? atual.nome : <b>{atual.nome}</b>}</>}{sub && <> &nbsp;/&nbsp; <b>{sub}</b></>}</div>
        <BuscaGeral />
        <div className="topo-dir">
          <SeloMock />
          <button type="button" className="icone-btn" onClick={trocarTema} title="Tema claro/escuro" aria-label="Alternar tema claro ou escuro"><Icone n="tema" /></button>
          <div className="usuario"><Avatar nome={s.usuario!.nome} /><div><b>{s.usuario!.nome}</b><small>{s.usuario!.cargo}</small></div></div>
          <button type="button" className="icone-btn" onClick={s.sair} title="Sair" aria-label="Sair"><Icone n="sair" /></button>
        </div>
      </header>
      <main className="conteudo"><Outlet /></main>
      <nav className="nav-celular" aria-label="Menu">
        {PAGINAS.filter((p) => p.perfis.includes(perfil)).map((p) => <NavLink key={p.id} to={p.rota} className={({ isActive }) => (isActive ? 'ativo' : '')}><Icone n={p.icone} />{p.nome}</NavLink>)}
      </nav>
      <footer className="status"><span className="on">Mock funcional</span><span>Dados fictícios · nada é salvo ao recarregar</span><span className="dir">{s.usuario!.email} · {s.usuario!.cargo}</span></footer>
    </div>
  );
}
