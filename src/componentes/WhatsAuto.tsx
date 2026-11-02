// Liga/desliga do "WhatsApp automático" (demonstração). Ligado: ao agendar, a confirmação sai sozinha e, na véspera,
// o lembrete também; a resposta do paciente (simulada no mock) muda o status e aparece para a recepção.
// No sistema final: API oficial do WhatsApp Business + servidor. Guardado só neste navegador.
import { useSyncExternalStore } from 'react';

const CHAVE = 'ioclinic:whats-auto';
let ligado = (() => { try { return localStorage.getItem(CHAVE) !== '0'; } catch { return true; } })();
const ouvintes = new Set<() => void>();
const definir = (v: boolean) => { ligado = v; try { localStorage.setItem(CHAVE, v ? '1' : '0'); } catch { /* sem armazenamento */ } ouvintes.forEach((f) => f()); };

export function useWhatsAuto(): [boolean, (v: boolean) => void] {
  return [useSyncExternalStore((f) => { ouvintes.add(f); return () => ouvintes.delete(f); }, () => ligado), definir];
}

/** Chave liga/desliga com o nome ao lado. */
export function ChaveWhatsAuto() {
  const [on, setOn] = useWhatsAuto();
  return (
    <label className="chave-whats" title={on ? 'Confirmações e lembretes saem sozinhos pelo WhatsApp (demonstração)' : 'A recepção envia pelo WhatsApp manualmente'}>
      <input type="checkbox" role="switch" checked={on} onChange={(e) => setOn(e.target.checked)} />
      <span className="chave" aria-hidden />
      <span>WhatsApp automático</span>
    </label>
  );
}
