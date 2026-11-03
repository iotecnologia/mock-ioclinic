// Folha A4 dos documentos (atestado, receita, pedido de exames, comparecimento, orçamento),
// no visual do protótipo Vitalis: faixa da marca, logo da Dra., selo do tipo de documento, caixa do paciente,
// marca d'água e assinatura. A mesma folha aparece na prévia e na impressão.
// "Papel timbrado": esconde a faixa e o cabeçalho (o papel já tem o timbre) e deixa a margem de cima livre.
// Modelo aprovado (protótipo AI Studio). Sem assinatura digital: a Dra. assina e carimba à mão
// (o selo ICP-Brasil só entra quando ela tiver o certificado digital).
import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { Clinica } from '../tipos/modelos';
import { br, extenso } from '../util/datas';
import { mascaraCpf } from '../util/formato';
import { gerarPdf } from '../util/pdf';
import { LogoDra } from './LogoDra';
import { nomeCurto } from './Marca';

export function Folha({ clinica, titulo, data, hora, timbrado, assinatura = true, paciente, children }: {
  clinica: Clinica; titulo: string; data: string; hora?: string; timbrado?: boolean; assinatura?: boolean;
  paciente?: { nome: string; cpf?: string }; children: ReactNode;
}) {
  const cidade = clinica.cidade.split('·')[0].trim();
  const nome = nomeCurto(clinica.medica).toUpperCase();          // "DRA. FLÁVIA MOTHÉ"
  const rqe = clinica.rqe ? `RQE ${clinica.rqe.replace(/^RQE\s*/i, '')}` : '';
  // cabeçalho: CRM · RQE · subtítulo  |  assinatura: nome + CRM · especialidade (nome e CRM sempre juntos)
  const linhaCab = [clinica.crm, rqe, clinica.subtitulo].filter(Boolean).join(' · ');
  const contato = clinica.telefone && clinica.telefone !== clinica.whatsapp
    ? [`Tel. ${clinica.telefone}`, clinica.whatsapp && `WhatsApp ${clinica.whatsapp}`].filter(Boolean).join(' · ')
    : clinica.whatsapp ? `Tel / WhatsApp: ${clinica.whatsapp}` : '';
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
              <div className="fl-crm">{linhaCab}</div>
            </div>
          </div>
          <div className="fl-tipo">
            <span className="fl-selo">{titulo}</span>
            <div className="fl-emissao">Emissão: <b>{br(data)}</b>{hora && <> às <b>{hora}</b></>}</div>
          </div>
          <div className="fl-end"><span>{clinica.endereco}</span><b>{contato}</b></div>
        </div>
      ) : <h1 className="fl-tit">{titulo}</h1>}
      {paciente && (
        <div className="fl-pac">
          <div><span>Paciente</span><b>{paciente.nome}</b></div>
          {paciente.cpf && <div><span>Documento oficial (CPF)</span><b className="fl-cpf">{mascaraCpf(paciente.cpf)}</b></div>}
        </div>
      )}
      <div className="fl-corpo">{children}</div>
      <div className="fl-rodape">
        <div className="fl-local">{cidade}, {extenso(data).replace(/^[^,]+, /, '')}.</div>
        {assinatura && (
          <div className="fl-ass">
            <span />
            <b>{nome}</b>
            <small className="fl-ass-crm">{clinica.crm} · {clinica.especialidade}</small>
            {clinica.assinaturaSub && <small>{clinica.assinaturaSub}</small>}
          </div>
        )}
      </div>
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

/** Desenha a folha fora da tela, em tamanho A4 real, gera o PDF e baixa. */
export function BaixarPdf({ children, nome, aoTerminar }: { children: ReactNode; nome: string; aoTerminar: (erro?: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const feito = useRef(false);   // evita baixar duas vezes
  useEffect(() => {
    if (feito.current) return;
    feito.current = true;
    const folha = ref.current?.querySelector<HTMLElement>('.folha');
    if (!folha) { aoTerminar('Folha não encontrada.'); return; }
    gerarPdf(folha, nome).then(() => aoTerminar(), (e) => aoTerminar(String(e)));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return createPortal(<div className="area-pdf" ref={ref} aria-hidden>{children}</div>, document.body);
}
