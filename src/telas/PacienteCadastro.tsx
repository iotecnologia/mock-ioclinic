// Cadastro de paciente novo. Salvar leva para a ficha; "Salvar e agendar" já abre o agendamento.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Paciente } from '../tipos/modelos';
import { useDados } from '../componentes/Dados';
import { BotaoIcone, TituloPagina } from '../componentes/Comuns';
import { FormPaciente, validar } from '../componentes/FormPaciente';

type Rascunho = Omit<Paciente, 'id' | 'criadoEm'> & { id?: string };

export function PacienteCadastro() {
  const { base, acoes } = useDados();
  const nav = useNavigate();
  const [r, setR] = useState<Rascunho | null>(null);
  const [erros, setErros] = useState<Record<string, string>>({});
  const salvar = (agendar: boolean) => {
    if (!r) { setErros({ nome: 'Preencha o cadastro.' }); return; }
    const e = validar(r, base.pacientes);
    setErros(e);
    if (Object.keys(e).length) return;
    const p = acoes.salvarPaciente(r);
    nav('/pacientes/' + p.id + (agendar ? '?agendar=1' : ''));
  };
  return (
    <>
      <TituloPagina titulo="Novo paciente" sub="Campos com * são obrigatórios">
        <BotaoIcone icone="descartar" titulo="Descartar e voltar" onClick={() => nav('/pacientes')} />
        <BotaoIcone icone="calendario" titulo="Salvar e agendar" onClick={() => salvar(true)} />
        <BotaoIcone icone="salvar" titulo="Salvar cadastro" pri onClick={() => salvar(false)} />
      </TituloPagina>
      <div className="bloco"><FormPaciente editando aoMudar={setR} erros={erros} /></div>
    </>
  );
}
