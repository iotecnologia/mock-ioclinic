// Tela de entrada (mesmo layout do Analiza): marca à esquerda, formulário à direita.
// E-mail + senha individual, conferida por hash; 5 erros seguidos bloqueiam por 30 s.
import { useState, type FormEvent } from 'react';
import { useSessao } from '../acesso/Sessao';
import { Icone } from '../componentes/Icone';
import { Logo } from '../componentes/Marca';
import clinica from '../dados/clinica.json';

export function Login() {
  const s = useSessao();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [verSenha, setVerSenha] = useState(false);
  const [erro, setErro] = useState('');
  const [conferindo, setConferindo] = useState(false);
  const entrar = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !senha) { setErro('Informe o e-mail e a senha.'); return; }
    setConferindo(true); setErro('');
    const r = await s.entrar(email, senha);
    setConferindo(false);
    if (!r.ok) { setErro(r.motivo); setSenha(''); }
  };
  return (
    <div className="login">
      <div className="login-marca">
        <div className="deco" />
        <div className="logo-bloco"><Logo tam={46} /><div><b>IO CLINIC</b><small>{clinica.medica} · {clinica.especialidade}</small></div></div>
        <h1>Sua clínica organizada, <em>do agendamento ao financeiro.</em></h1>
        <p>Agenda com horários livres na hora, cadastro e histórico do paciente, prontuário, orçamento e a gestão financeira da clínica em um só lugar.</p>
        <div className="modulos-lista">
          <span><Icone n="calendario" /> Agenda inteligente</span>
          <span><Icone n="usuarios" /> Histórico do paciente</span>
          <span><Icone n="estetoscopio" /> Prontuário</span>
          <span><Icone n="grafico" /> Financeiro e BI</span>
        </div>
        <div className="rod">IO Clinic · {clinica.cidade} · em conformidade com a LGPD</div>
      </div>
      <div className="login-form">
        <form className="form-caixa" onSubmit={entrar}>
          <h2>Entrar</h2>
          <p className="sub">Use o seu e-mail da clínica e a sua senha.</p>
          <label className="campo">E-mail
            <div className="inp"><Icone n="medico" /><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu.email@clinica.com.br" autoComplete="username" /></div>
          </label>
          <label className="campo">Senha
            <div className="inp"><Icone n="chave" />
              <input type={verSenha ? 'text' : 'password'} value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
              <button type="button" className="olho" onClick={() => setVerSenha(!verSenha)} title={verSenha ? 'Esconder senha' : 'Mostrar senha'} aria-label={verSenha ? 'Esconder senha' : 'Mostrar senha'}><Icone n={verSenha ? 'olhoFechado' : 'olho'} /></button>
            </div>
          </label>
          {erro && <div className="erro-login">{erro}</div>}
          <button type="submit" className="btn-entrar" disabled={conferindo}>{conferindo ? 'Conferindo…' : 'Entrar'}</button>
          <div className="seg"><Icone n="escudo" /> Acesso com senha individual. Na versão final, também com verificação em duas etapas.</div>
        </form>
      </div>
    </div>
  );
}
