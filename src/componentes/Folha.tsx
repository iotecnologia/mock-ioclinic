// Folha A4 dos documentos (atestado, receita, pedido de exames, comparecimento, orçamento),
// no visual do protótipo Vitalis: faixa da marca, logo da Dra., selo do tipo de documento, caixa do paciente,
// marca d'água e assinatura. A mesma folha aparece na prévia e na impressão.
// "Papel timbrado": esconde a faixa e o cabeçalho (o papel já tem o timbre) e deixa a margem de cima livre.
// Sem assinatura digital: a Dra. assina e carimba à mão.
import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { Clinica } from '../tipos/modelos';
import { br, extenso } from '../util/datas';
import { mascaraCpf } from '../util/formato';
import { LogoDra } from './LogoDra';

export function Folha({ clinica, titulo, data, timbrado, assinatura = true, paciente, children }: {
  clinica: Clinica; titulo: string; data: string; timbrado?: boolean; assinatura?: boolean;
  paciente?: { nome: string; cpf?: string }; children: ReactNode;
}) {
  const cidade = clinica.cidade.split('·')[0].trim();
  const nome = clinica.medica.toUpperCase();
  return (
    <div className={'folha' + (timbrado ? ' timbrado' : '')}>
      {!timbrado && <div className="fl-faixa" />}
      <LogoDra tam={300} marcaDagua />
      {!timbrado ? (
        <div className="fl-cab">
          <div className="fl-marca">
            <LogoDra tam={46} />
            <div>
              <div className="fl-medica">{nome}</div>
              <div className="fl-esp">{clinica.especialidade.toUpperCase().split('').join(' ')}</div>
              <div className="fl-crm">{clinica.crm}{clinica.rqe ? ` · ${clinica.rqe}` : ''}</div>
            </div>
          </div>
          <div className="fl-tipo">
            <span className="fl-selo">{titulo}</span>
            <div className="fl-emissao">Emissão: {br(data)}</div>
          </div>
          <div className="fl-end"><span>{clinica.endereco}</span><b>{clinica.telefone}</b></div>
        </div>
      ) : <h1 className="fl-tit">{titulo}</h1>}
      {paciente && (
        <div className="fl-pac">
          <div><span>Paciente</span><b>{paciente.nome}</b></div>
          {paciente.cpf && <div><span>CPF</span><b className="fl-cpf">{mascaraCpf(paciente.cpf)}</b></div>}
        </div>
      )}
      <div className="fl-corpo">{children}</div>
      <div className="fl-local">{cidade}, {extenso(data).replace(/^[^,]+, /, '')}.</div>
      {assinatura && (
        <div className="fl-ass">
          <span />
          <b>{clinica.medica}</b>
          <small>{clinica.crm} · {clinica.especialidade}</small>
          <small>Assinatura e carimbo</small>
        </div>
      )}
    </div>
  );
}

/** Coloca a folha fora da aplicação só para a impressora e chama a impressão do navegador. */
export function Imprimir({ children, aoTerminar }: { children: ReactNode; aoTerminar: () => void }) {
  useEffect(() => {
    const t = setTimeout(() => { window.print(); aoTerminar(); }, 50);
    return () => clearTimeout(t);
  }, [aoTerminar]);
  return createPortal(<div className="area-impressao">{children}</div>, document.body);
}
