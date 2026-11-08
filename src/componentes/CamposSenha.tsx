// Campos "Nova senha" + "Confirmar nova senha" com as regras ficando verdes conforme a pessoa digita.
// Usado na recuperação de senha (tela de login) e no "Alterar minha senha" (menu do usuário).
import { useState } from 'react';
import { Icone } from './Icone';

/** Regras da senha (mesmas da versão final). */
export function regrasSenha(nova: string, confirma: string) {
  return [
    { ok: nova.length >= 8, txt: 'No mínimo 8 caracteres' },
    { ok: /[a-zA-Z]/.test(nova), txt: 'Pelo menos uma letra' },
    { ok: /\d/.test(nova), txt: 'Pelo menos um número' },
    { ok: !!confirma && nova === confirma, txt: 'As duas senhas iguais' },
  ];
}
export const senhaValida = (nova: string, confirma: string) => regrasSenha(nova, confirma).every((r) => r.ok);

export function CampoSenha({ rotulo, valor, mudar, auto = 'new-password', foco }: { rotulo: string; valor: string; mudar: (v: string) => void; auto?: string; foco?: boolean }) {
  const [ver, setVer] = useState(false);
  return (
    <label className="campo">{rotulo}
      <div className="inp"><Icone n="chave" />
        <input type={ver ? 'text' : 'password'} value={valor} onChange={(e) => mudar(e.target.value)} placeholder="••••••••" autoComplete={auto} autoFocus={foco} />
        <button type="button" className="olho" onClick={() => setVer(!ver)} title={ver ? 'Esconder senha' : 'Mostrar senha'} aria-label={ver ? 'Esconder senha' : 'Mostrar senha'}><Icone n={ver ? 'olhoFechado' : 'olho'} /></button>
      </div>
    </label>
  );
}

export function CamposNovaSenha({ nova, confirma, setNova, setConfirma, foco }: { nova: string; confirma: string; setNova: (v: string) => void; setConfirma: (v: string) => void; foco?: boolean }) {
  return (
    <>
      <CampoSenha rotulo="Nova senha" valor={nova} mudar={setNova} foco={foco} />
      <CampoSenha rotulo="Confirmar nova senha" valor={confirma} mudar={setConfirma} />
      <ul className="senha-regras" aria-label="Regras da senha">
        {regrasSenha(nova, confirma).map((r) => <li key={r.txt} className={r.ok ? 'ok' : ''}><Icone n={r.ok ? 'check' : 'x'} /> {r.txt}</li>)}
      </ul>
    </>
  );
}
