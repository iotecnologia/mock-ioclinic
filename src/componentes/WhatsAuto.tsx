// WhatsApp automático: DESLIGADO por decisão do cliente (01/11) — por enquanto a recepção envia manualmente
// e o sistema avisa na hora do lembrete. O código do envio automático (confirmação, lembrete e resposta do paciente
// mudando o status) já está pronto: quando a clínica contratar a API oficial do WhatsApp Business, basta ligar aqui
// (no sistema final, isso vira uma configuração da clínica e a resposta chega pelo webhook da API).
export const WHATS_AUTOMATICO = false;

/** Mantido para as telas que já perguntam se o envio é automático. */
export function useWhatsAuto(): [boolean] {
  return [WHATS_AUTOMATICO];
}
