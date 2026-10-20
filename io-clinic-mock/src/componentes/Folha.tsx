// Folha A4 para documentos e orçamento. A mesma folha aparece na tela (prévia) e na impressão.
// Impressão: preto no branco; negrito só no título e no cabeçalho das tabelas.
// "Papel timbrado": esconde o cabeçalho da clínica e deixa a margem de cima livre para o timbre.
import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { Clinica } from '../tipos/modelos';
import { extenso } from '../util/datas';

export function Folha({ clinica, titulo, data, timbrado, assinatura = true, children }: {
  clinica: Clinica; titulo: string; data: string; timbrado?: boolean; assinatura?: boolean; children: ReactNode;
}) {
  const cidade = clinica.cidade.split('·')[0].trim();
  return (
    <div className={'folha' + (timbrado ? ' timbrado' : '')}>
      {!timbrado && (
        <div className="fl-cab">
          <div className="fl-medica">{clinica.medica}</div>
          <div>{clinica.especialidade} · {clinica.cidade} · {clinica.telefone}</div>
        </div>
      )}
      <h1 className="fl-tit">{titulo}</h1>
      <div className="fl-corpo">{children}</div>
      <div className="fl-local">{cidade}, {extenso(data).replace(/^[^,]+, /, '')}.</div>
      {assinatura && <div className="fl-ass"><span />{clinica.medica}<small>Assinatura e carimbo</small></div>}
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
