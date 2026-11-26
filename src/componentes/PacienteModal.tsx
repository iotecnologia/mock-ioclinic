// Cadastro de paciente em POP-UP (regra do sistema: a página só consulta; cadastrar/editar abre janela).
// Novo: Salvar abre a ficha; "Salvar e agendar" já abre o agendamento. Editar: Salvar fecha e a ficha atualiza.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Paciente } from '../tipos/modelos';
import { useDados } from './Dados';
import { Modal } from './Comuns';
import { FormPaciente, validar } from './FormPaciente';
import { Icone } from './Icone';

type Rascunho = Omit<Paciente, 'id' | 'criadoEm'> & { id?: string };

export function PacienteModal({ paciente, fechar }: { paciente?: Paciente; fechar: () => void }) {
  const { base, acoes } = useDados();
  const nav = useNavigate();
  const [r, setR] = useState<Rascunho | null>(paciente ?? null);
  const [erros, setErros] = useState<Record<string, string>>({});
  const salvar = (agendar = false) => {
    if (!r) { setErros({ nome: 'Preencha o cadastro.' }); return; }
    const e = validar(paciente ? { ...r, id: paciente.id } : r, base.pacientes);
    setErros(e);
    if (Object.keys(e).length) return;
    const p = acoes.salvarPaciente(paciente ? { ...r, id: paciente.id } : r);
    fechar();
    if (!paciente) nav('/pacientes/' + p.id + (agendar ? '?agendar=1' : ''));
  };
  return (
    <Modal titulo={paciente ? `Editar cadastro · ${paciente.nome}` : 'Novo paciente'} fechar={fechar} largo>
      <p className="mut peq">Campos com * são obrigatórios.</p>
      <FormPaciente inicial={paciente} editando aoMudar={setR} erros={erros} />
      <div className="rodape-modal">
        <button type="button" className="btn2" onClick={fechar}>Cancelar</button>
        <div className="acoes-pagina">
          {!paciente && <button type="button" className="btn2" onClick={() => salvar(true)}><Icone n="calendario" /> Salvar e agendar</button>}
          <button type="button" className="btn2 pri" onClick={() => salvar()}><Icone n="salvar" /> {paciente ? 'Salvar alterações' : 'Salvar cadastro'}</button>
        </div>
      </div>
    </Modal>
  );
}
