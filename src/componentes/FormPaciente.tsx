// Formulário do paciente (cadastro e edição). Campos obrigatórios com *; CPF validado e sem duplicidade;
// CEP preenche o endereço (ViaCEP). Termo LGPD obrigatório para salvar.
import { useState } from 'react';
import type { Paciente } from '../tipos/modelos';
import { Icone } from './Icone';
import { cpfValido, digitos, mascaraCep, mascaraCpf, mascaraTelefone } from '../util/formato';
import { hoje } from '../util/datas';

type Rascunho = Omit<Paciente, 'id' | 'criadoEm'> & { id?: string };
const VAZIO: Rascunho = {
  nome: '', cpf: '', nascimento: '', sexo: 'F', telefone: '', email: '',
  endereco: { cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: 'Campinas', uf: 'SP' },
  contatoEmergencia: '', observacoes: '', consentimentoLgpd: false,
};

export function validar(r: Rascunho, todos: Paciente[]): Record<string, string> {
  const e: Record<string, string> = {};
  if (r.nome.trim().split(/\s+/).length < 2) e.nome = 'Informe nome e sobrenome.';
  if (!cpfValido(r.cpf)) e.cpf = 'CPF inválido.';
  else if (todos.some((p) => p.id !== r.id && digitos(p.cpf) === digitos(r.cpf))) e.cpf = 'Já existe paciente com este CPF.';
  if (!r.nascimento) e.nascimento = 'Informe a data de nascimento.';
  else if (r.nascimento > hoje()) e.nascimento = 'Data no futuro.';
  if (digitos(r.telefone).length < 10) e.telefone = 'Telefone incompleto.';
  if (r.email && !/^\S+@\S+\.\S+$/.test(r.email)) e.email = 'E-mail inválido.';
  if (!r.consentimentoLgpd) e.lgpd = 'O paciente precisa aceitar o termo para o cadastro.';
  return e;
}

export function FormPaciente({ inicial, editando, aoMudar, erros }: {
  inicial?: Paciente; editando: boolean; aoMudar: (r: Rascunho) => void; erros: Record<string, string>;
}) {
  const [r, setR] = useState<Rascunho>(() => (inicial ? { ...VAZIO, ...inicial, endereco: { ...VAZIO.endereco!, ...inicial.endereco } } : VAZIO));
  const [buscandoCep, setBuscandoCep] = useState(false);
  const muda = (p: Partial<Rascunho>) => { const n = { ...r, ...p }; setR(n); aoMudar(n); };
  const end = (p: Partial<NonNullable<Rascunho['endereco']>>) => muda({ endereco: { ...r.endereco!, ...p } });
  const cep = async (v: string) => {
    const m = mascaraCep(v); end({ cep: m });
    if (digitos(m).length !== 8) return;
    setBuscandoCep(true);
    try {
      const resp = await fetch(`https://viacep.com.br/ws/${digitos(m)}/json/`);
      const j = await resp.json();
      if (!j.erro) setR((atual) => { const n = { ...atual, endereco: { ...atual.endereco!, cep: m, logradouro: j.logradouro || atual.endereco!.logradouro, bairro: j.bairro || atual.endereco!.bairro, cidade: j.localidade || atual.endereco!.cidade, uf: j.uf || atual.endereco!.uf } }; aoMudar(n); return n; });
    } catch { /* sem internet: preenche à mão */ } finally { setBuscandoCep(false); }
  };
  const d = !editando;
  const Erro = ({ c }: { c: string }) => (erros[c] ? <span className="erro-campo">{erros[c]}</span> : null);
  return (
    <div className="form-pac">
      <section>
        <h4>Identificação</h4>
        <div className="g g3">
          <label className="c2">Nome completo *<input disabled={d} value={r.nome} onChange={(e) => muda({ nome: e.target.value })} /><Erro c="nome" /></label>
          <label>CPF *<input disabled={d} value={r.cpf} inputMode="numeric" onChange={(e) => muda({ cpf: mascaraCpf(e.target.value) })} placeholder="000.000.000-00" /><Erro c="cpf" /></label>
          <label>Data de nascimento *<input disabled={d} type="date" value={r.nascimento} max={hoje()} onChange={(e) => muda({ nascimento: e.target.value })} /><Erro c="nascimento" /></label>
          <label>Sexo<select disabled={d} value={r.sexo} onChange={(e) => muda({ sexo: e.target.value as Rascunho['sexo'] })}><option value="F">Feminino</option><option value="M">Masculino</option><option value="O">Outro / prefere não informar</option></select></label>
        </div>
      </section>
      <section>
        <h4>Contato</h4>
        <div className="g g3">
          <label>Celular / WhatsApp *<input disabled={d} value={r.telefone} inputMode="tel" onChange={(e) => muda({ telefone: mascaraTelefone(e.target.value) })} placeholder="(19) 90000-0000" /><Erro c="telefone" /></label>
          <label>E-mail<input disabled={d} type="email" value={r.email ?? ''} onChange={(e) => muda({ email: e.target.value })} /><Erro c="email" /></label>
          <label>Contato de emergência<input disabled={d} value={r.contatoEmergencia ?? ''} onChange={(e) => muda({ contatoEmergencia: e.target.value })} placeholder="Nome · telefone" /></label>
        </div>
      </section>
      <section>
        <h4>Endereço</h4>
        <div className="g g4">
          <label>CEP {buscandoCep && <small className="mut">buscando…</small>}<input disabled={d} value={r.endereco!.cep} inputMode="numeric" onChange={(e) => cep(e.target.value)} placeholder="00000-000" /></label>
          <label className="c2">Logradouro<input disabled={d} value={r.endereco!.logradouro} onChange={(e) => end({ logradouro: e.target.value })} /></label>
          <label>Número<input disabled={d} value={r.endereco!.numero} onChange={(e) => end({ numero: e.target.value })} /></label>
          <label>Complemento<input disabled={d} value={r.endereco!.complemento ?? ''} onChange={(e) => end({ complemento: e.target.value })} /></label>
          <label>Bairro<input disabled={d} value={r.endereco!.bairro} onChange={(e) => end({ bairro: e.target.value })} /></label>
          <label>Cidade<input disabled={d} value={r.endereco!.cidade} onChange={(e) => end({ cidade: e.target.value })} /></label>
          <label>UF<input disabled={d} value={r.endereco!.uf} maxLength={2} onChange={(e) => end({ uf: e.target.value.toUpperCase() })} /></label>
        </div>
      </section>
      <section>
        <h4>Observações administrativas</h4>
        <textarea disabled={d} rows={2} value={r.observacoes ?? ''} onChange={(e) => muda({ observacoes: e.target.value })} placeholder="Ex.: prefere horários pela manhã. (Informações clínicas ficam no prontuário.)" />
      </section>
      <section className={'lgpd' + (erros.lgpd ? ' com-erro' : '')}>
        <label className="chk">
          <input type="checkbox" disabled={d} checked={r.consentimentoLgpd} onChange={(e) => muda({ consentimentoLgpd: e.target.checked, consentimentoData: e.target.checked ? hoje() : undefined })} />
          <span><b><Icone n="escudo" /> Termo de consentimento (LGPD) *</b>
            O paciente autoriza a clínica a guardar e usar seus dados pessoais e de saúde exclusivamente para o atendimento, agendamento e obrigações legais.
            Pode pedir acesso, correção ou exclusão a qualquer momento.{r.consentimentoData && <em> Aceito em {r.consentimentoData.split('-').reverse().join('/')}.</em>}</span>
        </label>
        <Erro c="lgpd" />
      </section>
    </div>
  );
}
