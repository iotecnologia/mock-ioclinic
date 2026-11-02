// Baixar o documento em PDF (A4), com o mesmo visual da impressão: a folha é desenhada numa imagem
// (html2canvas) e colocada numa página A4 (jsPDF). As bibliotecas só carregam quando alguém clica em "Baixar PDF".
// Versão final: PDF gerado no servidor, com texto selecionável e assinatura digital ICP-Brasil da Dra.
import { semAcento } from './formato';

/** Nome do arquivo: tipo_nome-do-paciente_dd-mm-aaaa (sem acento, sem espaço). */
export function nomeArquivo(tipo: string, paciente: string | undefined, dataIso: string): string {
  const slug = (s: string) => semAcento(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const [a, m, d] = dataIso.split('-');
  return [slug(tipo), paciente ? slug(paciente) : '', `${d}-${m}-${a}`].filter(Boolean).join('_');
}

export async function gerarPdf(folha: HTMLElement, nome: string): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
  try { await document.fonts?.ready; } catch { /* sem API de fontes */ }
  const canvas = await html2canvas(folha, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false });
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
  pdf.setProperties({ title: nome, creator: 'IO Clinic' });
  pdf.addImage(canvas.toDataURL('image/jpeg', 0.93), 'JPEG', 0, 0, 210, 297);
  pdf.save(`${nome}.pdf`);
}
