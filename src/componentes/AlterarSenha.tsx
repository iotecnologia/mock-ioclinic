// "Alterar minha senha" (menu do usuário, no topo): confere a senha atual e grava a nova.
import { useState, type FormEvent } from 'react';
import { Modal } from './Comuns';
import { CampoSenha, CamposNovaSenha, senhaValida } from './CamposSenha';
import { useSessao } from '../acesso/Sessao';
import { useDados } from './Dados';

export function AlterarSenha({ fechar }: { fechar: () => void }) {
  const s = useSessao();
  const { avisar } = useDados();
  const [atual, setAtual] = useState('');
  const [nova, setNova] = useState('');
  const [confirma, setConfirma] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const salvar = async (e: FormEvent) => {
    e.preventDefault();
    if (!atual) { setErro('Informe a senha atual.'); return; }
    if (!senhaValida(nova, confirma)) return;
    setSalvando(true);
    const r = await s.alterarSenha(atual, nova);
    setSalvando(false);
    if (!r.ok) { setErro(r.motivo); return; }
    avisar({ id: 'senha:' + Date.now(), tipo: 'ok', texto: '🔒 Senha alterada. Use a nova senha no próximo acesso.' });
    fechar();
  };
  return (
    <Modal titulo="Alterar minha senha" fechar={fechar}>
      <form className="form-senha" onSubmit={salvar}>
        <CampoSenha rotulo="Senha atual" valor={atual} mudar={(v) => { setAtual(v); setErro(''); }} auto="current-password" foco />
        <CamposNovaSenha nova={nova} confirma={confirma} setNova={setNova} setConfirma={setConfirma} />
        {erro && <div className="erro-login">{erro}</div>}
        <div className="rodape-modal">
          <button type="button" className="btn2" onClick={fechar}>Cancelar</button>
          <button type="submit" className="btn2 pri" disabled={!atual || !senhaValida(nova, confirma) || salvando}>{salvando ? 'Salvando…' : 'Salvar nova senha'}</button>
        </div>
      </form>
    </Modal>
  );
}
