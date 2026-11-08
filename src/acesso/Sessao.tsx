// Login do mock: e-mail + senha individual, conferida por hash PBKDF2-SHA256 (a senha NÃO fica no código).
// 5 erros seguidos no mesmo e-mail → espera de 30 s. A sessão some ao fechar o navegador (sessionStorage guarda só o e-mail).
// Atenção: o site é estático e público — isto mostra o login funcionando, mas não substitui o login real
// da versão final (backend io-clinic: bcrypt + JWT + 2FA).
import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import type { Usuario } from '../tipos/modelos';
import usuarios from '../dados/usuarios.json';

export type ResultadoLogin = { ok: true } | { ok: false; motivo: string };
interface Sessao {
  usuario: Usuario | null; ehMedica: boolean;
  entrar(email: string, senha: string): Promise<ResultadoLogin>; sair(): void;
  /** "Esqueci minha senha": diz se o e-mail existe (a TELA não revela isso ao usuário). */
  existeEmail(email: string): boolean;
  /** Grava a nova senha (pelo link de recuperação). No mock vale só neste navegador. */
  redefinirSenha(email: string, nova: string): Promise<void>;
  /** Usuário logado troca a própria senha (confere a atual antes). */
  alterarSenha(atual: string, nova: string): Promise<ResultadoLogin>;
}
const CHAVE = 'ioclinic:sessao';
const Ctx = createContext<Sessao | null>(null);
const lista = usuarios as (Usuario & { sal: string; hash: string })[];

const VOLTAS = 100_000;
// Senhas trocadas no mock (recuperação ou "alterar minha senha"): ficam neste navegador, também só como hash.
const CHAVE_SENHAS = 'ioclinic:senhas';
type Credencial = { sal: string; hash: string };
function senhasTrocadas(): Record<string, Credencial> {
  try { return JSON.parse(localStorage.getItem(CHAVE_SENHAS) ?? '{}'); } catch { return {}; }
}
const credencial = (u: { email: string; sal: string; hash: string }): Credencial => senhasTrocadas()[u.email.toLowerCase()] ?? u;
async function gravarSenha(email: string, nova: string) {
  const sal = Array.from(crypto.getRandomValues(new Uint8Array(16))).map((b) => b.toString(16).padStart(2, '0')).join('');
  const t = senhasTrocadas();
  t[email.toLowerCase()] = { sal, hash: await hashSenha(nova, sal) };
  try { localStorage.setItem(CHAVE_SENHAS, JSON.stringify(t)); } catch { /* sem armazenamento */ }
}
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
      const cred = u && credencial(u);
      if (!u || !cred || (await hashSenha(senha, cred.sal)) !== cred.hash) {
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
    existeEmail: (e) => lista.some((x) => x.email.toLowerCase() === e.trim().toLowerCase()),
    async redefinirSenha(e, nova) { erros.delete(e.trim().toLowerCase()); await gravarSenha(e.trim(), nova); },
    async alterarSenha(atual, nova) {
      const u = lista.find((x) => x.email === email);
      if (!u) return { ok: false, motivo: 'Sessão encerrada. Entre de novo.' };
      const cred = credencial(u);
      if ((await hashSenha(atual, cred.sal)) !== cred.hash) return { ok: false, motivo: 'A senha atual não confere.' };
      if (atual === nova) return { ok: false, motivo: 'A nova senha precisa ser diferente da atual.' };
      await gravarSenha(u.email, nova);
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
