// Prontuário (só a médica): escolhe o paciente — atendimentos de hoje ou busca — e abre o prontuário dele.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDados } from '../componentes/Dados';
import { Avatar, Bloco, TagStatus, TituloPagina, Vazio } from '../componentes/Comuns';
import { Icone } from '../componentes/Icone';
import { doDia } from '../regras/agenda';
import { buscarPacientes, idade } from '../regras/paciente';
import { extenso, hoje } from '../util/datas';

export function Prontuario() {
  const { base } = useDados();
  const nav = useNavigate();
  const hj = hoje();
  const [t, setT] = useState('');
  const lista = doDia(base, hj);
  const res = t.trim().length >= 2 ? buscarPacientes(base.pacientes, t).slice(0, 10) : [];
  return (
    <>
      <TituloPagina titulo="Prontuário" sub={`Atendimentos de ${extenso(hj)}`} />
      <div className="grade2">
        <Bloco titulo={<><Icone n="dia" /> Pacientes de hoje</>}>
          {lista.length === 0 ? <Vazio>Nenhum paciente agendado para hoje.</Vazio> : (
            <table className="tab">
              <thead><tr><th>Hora</th><th>Paciente</th><th>Serviço</th><th>Situação</th></tr></thead>
              <tbody>
                {lista.map((a) => {
                  const p = base.pacientes.find((x) => x.id === a.pacienteId)!;
                  const s = base.servicos.find((x) => x.id === a.servicoId)!;
                  return (
                    <tr key={a.id} className="clic" onClick={() => nav(`/prontuario/${p.id}?ag=${a.id}`)}>
                      <td className="mono">{a.hora}</td>
                      <td><div className="cel-pac"><Avatar nome={p.nome} /><div>{p.nome}<div className="mut peq">{idade(p.nascimento, hj)} anos</div></div></div></td>
                      <td><span className={'tipo tipo-' + s.tipo}>{s.curto}</span></td>
                      <td><TagStatus s={a.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Bloco>
        <Bloco titulo={<><Icone n="busca" /> Outro paciente</>}>
          <div className="pad">
            <div className="f-busca"><Icone n="busca" /><input type="text" value={t} onChange={(e) => setT(e.target.value)} placeholder="Nome, CPF ou telefone" aria-label="Buscar paciente" /></div>
          </div>
          {res.length > 0 && (
            <ul className="lista-simples">
              {res.map((p) => <li key={p.id}><button type="button" onClick={() => nav('/prontuario/' + p.id)}><Avatar nome={p.nome} /><span>{p.nome}<small>{idade(p.nascimento, hj)} anos</small></span><Icone n="dir" /></button></li>)}
            </ul>
          )}
          {t.trim().length >= 2 && !res.length && <Vazio>Nenhum paciente encontrado.</Vazio>}
          {t.trim().length < 2 && <Vazio>Busque para abrir o prontuário de qualquer paciente (evolução avulsa, renovação de receita).</Vazio>}
        </Bloco>
      </div>
    </>
  );
}
