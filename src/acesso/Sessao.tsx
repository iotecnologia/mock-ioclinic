// Login do mock: e-mail de um dos usuários de exemplo + qualquer senha. A sessão some ao fechar o navegador.
// Fase 3: login real no backend io-clinic (senha com hash + JWT + 2FA). Aqui não existe senha de verdade.
import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Usuario } from '../tipos/modelos';
import usuarios from '../dados/usuarios.json';

interface Sessao { usuario: Usuario | null; entrar(email: string): boolean; sair(): void; ehMedica: boolean }
const CHAVE = 'ioclinic:sessao';
const Ctx = createContext<Sessao | null>(null);
const lista = usuarios as Usuario[];

export function SessaoProvider({ children }: { children: ReactNode }) {
  const [email, setEmail] = useState<string | null>(() => { try { return sessionStorage.getItem(CHAVE); } catch { return null; } });
  const usuario = lista.find((u) => u.email === email) ?? null;
  const valor: Sessao = {
    usuario,
    ehMedica: usuario?.perfil === 'medica',
    entrar(e) {
      const u = lista.find((x) => x.email.toLowerCase() === e.trim().toLowerCase());
      if (!u) return false;
      setEmail(u.email);
      try { sessionStorage.setItem(CHAVE, u.email); } catch { /* sem armazenamento */ }
      return true;
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
