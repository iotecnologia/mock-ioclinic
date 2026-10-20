// Peças pequenas reaproveitadas em várias telas.
import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { StatusAgendamento } from '../tipos/modelos';
import { STATUS } from '../regras/agenda';
import { iniciais } from '../util/formato';
import { Icone } from './Icone';

export function TituloPagina({ titulo, sub, children }: { titulo: string; sub?: ReactNode; children?: ReactNode }) {
  return (
    <div className="tit-pagina">
      <div><h1>{titulo}</h1>{sub && <p>{sub}</p>}</div>
      {children && <div className="acoes-pagina">{children}</div>}
    </div>
  );
}

export function Bloco({ titulo, extra, children, className }: { titulo: ReactNode; extra?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={'bloco' + (className ? ' ' + className : '')}>
      <div className="bloco-cab"><h3>{titulo}</h3>{extra}</div>
      {children}
    </section>
  );
}

export function Vazio({ children }: { children: ReactNode }) {
  return <div className="vazio">{children}</div>;
}

export function TagStatus({ s }: { s: StatusAgendamento }) {
  return <span className={'tag ' + STATUS[s].cls}>{STATUS[s].nome}</span>;
}

export function Avatar({ nome, grande }: { nome: string; grande?: boolean }) {
  return <div className={'avatar' + (grande ? ' g' : '')}>{iniciais(nome)}</div>;
}

/** Botão só com ícone; o nome aparece ao passar o mouse (title). */
export function BotaoIcone({ icone, titulo, onClick, pri, disabled, cls }: { icone: string; titulo: string; onClick?: () => void; pri?: boolean; disabled?: boolean; cls?: string }) {
  return (
    <button type="button" className={'btn2 ic' + (pri ? ' pri' : '') + (cls ? ' ' + cls : '')} title={titulo} aria-label={titulo} onClick={onClick} disabled={disabled}>
      <Icone n={icone} />
    </button>
  );
}

export function Modal({ titulo, fechar, children, largo }: { titulo: ReactNode; fechar: () => void; children: ReactNode; largo?: boolean }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') fechar(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [fechar]);
  // Abre na raiz da aplicação (.app), fora de qualquer linha/cartão, para nunca ficar por baixo de outro elemento.
  return createPortal(
    <div className="modal-fundo" onMouseDown={(e) => { if (e.target === e.currentTarget) fechar(); }}>
      <div className={'modal' + (largo ? ' largo' : '')} role="dialog" aria-modal="true">
        <div className="modal-cab"><h2>{titulo}</h2><button type="button" className="icone-btn" onClick={fechar} title="Fechar" aria-label="Fechar"><Icone n="x" /></button></div>
        <div className="modal-corpo">{children}</div>
      </div>
    </div>,
    document.querySelector('.app') ?? document.body,
  );
}

/** Aviso de mock, discreto. */
export function SeloMock() {
  return <span className="selo-mock" title="Mock de apresentação: dados fictícios, nada é salvo">dados fictícios</span>;
}
