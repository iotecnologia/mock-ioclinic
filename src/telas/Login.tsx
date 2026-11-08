// Tela de entrada (mesmo layout do Analiza): marca à esquerda, formulário à direita.
// E-mail + senha individual, conferida por hash; 5 erros seguidos bloqueiam por 30 s.
// "Esqueci minha senha": e-mail → resposta neutra (não revela se o e-mail existe) → link → nova senha.
// No mock não sai e-mail de verdade: uma caixa simula o e-mail recebido. Na versão final o link vai por e-mail,
// vale 30 minutos e só pode ser usado uma vez.
import { useState, type FormEvent } from 'react';
import { useSessao } from '../acesso/Sessao';
import { Icone } from '../componentes/Icone';
import { CreditoIO, nomeCurto } from '../componentes/Marca';
import { LogoDra } from '../componentes/LogoDra';
import { CamposNovaSenha, senhaValida } from '../componentes/CamposSenha';
import clinica from '../dados/clinica.json';

type Etapa = 'entrar' | 'recuperar' | 'enviado' | 'nova';

export function Login() {
  const s = useSessao();
  const [etapa, setEtapa] = useState<Etapa>('entrar');
  const [aviso, setAviso] = useState('');           // "Senha alterada…" ao voltar para o login
  const [linkPara, setLinkPara] = useState<string | null>(null);   // e-mail que "recebeu" o link (mock)
  const [nova, setNova] = useState('');
  const [confirma, setConfirma] = useState('');
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
    if (!r.ok) { setErro(r.motivo); setSenha(''); setAviso(''); }
  };
  const ir = (e: Etapa) => { setEtapa(e); setErro(''); setAviso(''); };
  const pedirLink = (e: FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setErro('Informe um e-mail válido.'); return; }
    setLinkPara(s.existeEmail(email) ? email.trim() : null);
    ir('enviado');
  };
  const salvarNova = async (e: FormEvent) => {
    e.preventDefault();
    if (!linkPara || !senhaValida(nova, confirma)) return;
    setConferindo(true);
    await s.redefinirSenha(linkPara, nova);
    setConferindo(false);
    setEmail(linkPara); setSenha(''); setNova(''); setConfirma(''); setLinkPara(null);
    setEtapa('entrar'); setErro(''); setAviso('Senha alterada. Entre com a nova senha.');
  };
  return (
    <div className="login">
      <div className="login-marca">
        <div className="deco" />
        <div className="logo-bloco dra"><LogoDra tam={52} tinta="clara" /><div><b>{nomeCurto(clinica.medica)}</b><small>{clinica.especialidade}</small></div></div>
        <h1>Sua clínica organizada, <em>do agendamento ao financeiro.</em></h1>
        <p>Agenda com horários livres na hora, cadastro e histórico do paciente, documentos com a sua marca, orçamento e a gestão financeira da clínica em um só lugar.</p>
        <div className="modulos-lista">
          <span><Icone n="calendario" /> Agenda inteligente</span>
          <span><Icone n="usuarios" /> Histórico do paciente</span>
          <span><Icone n="arquivo" /> Documentos e receitas</span>
          <span><Icone n="grafico" /> Financeiro e BI</span>
        </div>
        <div className="rod"><CreditoIO versao={false} /> · {clinica.cidade} · em conformidade com a LGPD</div>
      </div>
      <div className="login-form">
        {etapa === 'entrar' && (
          <form className="form-caixa" onSubmit={entrar}>
            <h2>Entrar</h2>
            <p className="sub">Use o seu e-mail da clínica e a sua senha.</p>
            {aviso && <div className="ok-login"><Icone n="check" /> {aviso}</div>}
            <label className="campo">E-mail
              <div className="inp"><Icone n="medico" /><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu.email@clinica.com.br" autoComplete="username" /></div>
            </label>
            <label className="campo">Senha
              <div className="inp"><Icone n="chave" />
                <input type={verSenha ? 'text' : 'password'} value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
                <button type="button" className="olho" onClick={() => setVerSenha(!verSenha)} title={verSenha ? 'Esconder senha' : 'Mostrar senha'} aria-label={verSenha ? 'Esconder senha' : 'Mostrar senha'}><Icone n={verSenha ? 'olhoFechado' : 'olho'} /></button>
              </div>
            </label>
            <div className="esqueci"><button type="button" className="lk" onClick={() => ir('recuperar')}>Esqueci minha senha</button></div>
            {erro && <div className="erro-login">{erro}</div>}
            <button type="submit" className="btn-entrar" disabled={conferindo}>{conferindo ? 'Conferindo…' : 'Entrar'}</button>
            <div className="seg"><Icone n="escudo" /> Acesso com senha individual.</div>
          </form>
        )}
        {etapa === 'recuperar' && (
          <form className="form-caixa" onSubmit={pedirLink}>
            <h2>Recuperar senha</h2>
            <p className="sub">Informe o e-mail da clínica. Enviaremos um link para você criar uma nova senha.</p>
            <label className="campo">E-mail
              <div className="inp"><Icone n="medico" /><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu.email@clinica.com.br" autoComplete="username" autoFocus /></div>
            </label>
            {erro && <div className="erro-login">{erro}</div>}
            <button type="submit" className="btn-entrar">Enviar link</button>
            <div className="voltar-login"><button type="button" className="lk" onClick={() => ir('entrar')}><Icone n="esq" /> Voltar para o login</button></div>
          </form>
        )}
        {etapa === 'enviado' && (
          <div className="form-caixa">
            <h2>Verifique seu e-mail</h2>
            <p className="sub">Se <b>{email.trim()}</b> estiver cadastrado, enviamos um link para criar uma nova senha. O link vale por 30 minutos.</p>
            {linkPara && (
              <div className="email-simulado">
                <div className="es-rot">Simulação · e-mail recebido</div>
                <b>IO Clinic · Redefinição de senha</b>
                <p>Olá! Recebemos um pedido para criar uma nova senha de acesso ao sistema da {nomeCurto(clinica.medica)}. Se não foi você, ignore este e-mail.</p>
                <button type="button" className="btn2 pri" onClick={() => { setNova(''); setConfirma(''); ir('nova'); }}>Criar nova senha</button>
              </div>
            )}
            <div className="voltar-login"><button type="button" className="lk" onClick={() => ir('entrar')}><Icone n="esq" /> Voltar para o login</button></div>
          </div>
        )}
        {etapa === 'nova' && linkPara && (
          <form className="form-caixa" onSubmit={salvarNova}>
            <h2>Nova senha</h2>
            <p className="sub">Crie a nova senha de <b>{linkPara}</b>.</p>
            <CamposNovaSenha nova={nova} confirma={confirma} setNova={setNova} setConfirma={setConfirma} foco />
            <button type="submit" className="btn-entrar" disabled={!senhaValida(nova, confirma) || conferindo}>{conferindo ? 'Salvando…' : 'Salvar nova senha'}</button>
            <div className="voltar-login"><button type="button" className="lk" onClick={() => ir('entrar')}><Icone n="esq" /> Voltar para o login</button></div>
          </form>
        )}
      </div>
    </div>
  );
}
