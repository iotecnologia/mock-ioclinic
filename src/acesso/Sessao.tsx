// Login do mock: e-mail + senha individual, conferida por hash PBKDF2-SHA256 (a senha NÃO fica no código).
// 5 erros seguidos no mesmo e-mail → espera de 30 s. A sessão some ao fechar o navegador (sessionStorage guarda só o e-mail).
// Atenção: o site é estático e público — isto mostra o login funcionando, mas não substitui o login real
// da versão final (backend io-clinic: bcrypt + JWT + 2FA).
import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import type { Usuario } from '../tipos/modelos';
import usuarios from '../dados/usuarios.json';

export type ResultadoLogin = { ok: true } | { ok: false; motivo: string };
interface Sessao { usuario: Usuario | null; entrar(email: string, senha: string): Promise<ResultadoLogin>; sair(): void; ehMedica: boolean }
const CHAVE = 'ioclinic:sessao';
const Ctx = createContext<Sessao | null>(null);
const lista = usuarios as (Usuario & { sal: string; hash: string })[];

const VOLTAS = 100_000;
const MAX_TENTATIVAS = 5;
const ESPERA_MS = 30_000;

async function hashSenha(senha: string, sal: string): Promise<string> {
  const enc = new TextEncoder();
  const chave = await crypto.subtle.importKey('raw', enc.encode(senha), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: enc.encode(sal), iterations: VOLTAS, hash: 'SHA-256' }, chave, 256);
  return Array.from(new Uint8Array(bits)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function SessaoProvider({ children }: { children: ReactNode }) {
  const [email, setEmail] = useState<string | null>(() => { try { return sessionStorage.getItem(CHAVE); } catch { return null; } });
  const erros = useRef(new Map<string, { n: number; ate: number }>()).current;
  const usuario = lista.find((u) => u.email === email) ?? null;
  const valor: Sessao = {
    usuario,
    ehMedica: usuario?.perfil === 'medica',
    async entrar(e, senha) {
      const em = e.trim().toLowerCase();
      const reg = erros.get(em) ?? { n: 0, ate: 0 };
      if (reg.ate > Date.now()) return { ok: false, motivo: `Muitas tentativas. Aguarde ${Math.ceil((reg.ate - Date.now()) / 1000)} s e tente de novo.` };
      const u = lista.find((x) => x.email.toLowerCase() === em);
      // mesma mensagem para e-mail ou senha errados: não revela quais e-mails existem
      if (!u || (await hashSenha(senha, u.sal)) !== u.hash) {
        reg.n += 1;
        if (reg.n >= MAX_TENTATIVAS) { reg.n = 0; reg.ate = Date.now() + ESPERA_MS; erros.set(em, reg); return { ok: false, motivo: 'Muitas tentativas. Aguarde 30 s e tente de novo.' }; }
        erros.set(em, reg);
        const resta = MAX_TENTATIVAS - reg.n;
        return { ok: false, motivo: `E-mail ou senha incorretos.${resta <= 2 ? ` Restam ${resta} tentativa${resta > 1 ? 's' : ''}.` : ''}` };
      }
      erros.delete(em);
      setEmail(u.email);
      try { sessionStorage.setItem(CHAVE, u.email); } catch { /* sem armazenamento */ }
      return { ok: true };
    },
    sair() { setEmail(null); try { sessionStorage.removeItem(CHAVE); } catch { /* sem armazenamento */ } },
  };
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useSessao(): Sessao {
  const s = useContext(Ctx);
  if (!s) throw new Error('useSessao fora do SessaoProvider');
  return s;
}
