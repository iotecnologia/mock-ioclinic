// Lista de pacientes com busca e filtros (inclui "sem consulta há 12 meses" para o recall anual).
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDados } from '../componentes/Dados';
import { Avatar, BotaoIcone, TituloPagina, Vazio } from '../componentes/Comuns';
import { Icone } from '../componentes/Icone';
import { buscarPacientes, idade, resumoPaciente } from '../regras/paciente';
import { br, hoje, somaDias } from '../util/datas';
import { cpfOculto } from '../util/formato';

type Filtro = 'todos' | 'agendados' | 'recall' | 'lgpd';

export function Pacientes() {
  const { base } = useDados();
  const nav = useNavigate();
  const hj = hoje();
  const [t, setT] = useState('');
  const [f, setF] = useState<Filtro>('todos');
  const linhas = buscarPacientes(base.pacientes, t).map((p) => ({ p, r: resumoPaciente(p.id, base, hj) }));
  const umAno = somaDias(hj, -365);
  const filtradas = linhas.filter(({ p, r }) =>
    f === 'agendados' ? !!r.proximo : f === 'recall' ? !r.proximo && (!r.ultima || r.ultima.data < umAno) : f === 'lgpd' ? !p.consentimentoLgpd : true);
  const n = (x: Filtro) => linhas.filter(({ p, r }) => (x === 'agendados' ? !!r.proximo : x === 'recall' ? !r.proximo && (!r.ultima || r.ultima.data < umAno) : x === 'lgpd' ? !p.consentimentoLgpd : true)).length;
  return (
    <>
      <TituloPagina titulo="Pacientes" sub={`${base.pacientes.length} pacientes cadastrados`}>
        <BotaoIcone icone="pacienteMais" titulo="Cadastrar paciente" pri onClick={() => nav('/pacientes/novo')} />
      </TituloPagina>
      <div className="barra">
        <div className="f-busca"><Icone n="busca" /><input type="text" value={t} onChange={(e) => setT(e.target.value)} placeholder="Buscar por nome, CPF ou telefone" aria-label="Buscar paciente" /></div>
        <div className="segmentado">
          <button type="button" className={f === 'todos' ? 'sel' : ''} onClick={() => setF('todos')}>Todos <small>{n('todos')}</small></button>
          <button type="button" className={f === 'agendados' ? 'sel' : ''} onClick={() => setF('agendados')}>Com agendamento <small>{n('agendados')}</small></button>
          <button type="button" className={f === 'recall' ? 'sel' : ''} onClick={() => setF('recall')} title="Sem consulta há mais de 12 meses e sem agendamento: chamar para revisão anual">Revisão anual <small>{n('recall')}</small></button>
          <button type="button" className={f === 'lgpd' ? 'sel' : ''} onClick={() => setF('lgpd')} title="Termo LGPD ainda não aceito">Termo pendente <small>{n('lgpd')}</small></button>
        </div>
      </div>
      <div className="bloco">
        {filtradas.length === 0 ? <Vazio>Nenhum paciente encontrado.</Vazio> : (
          <table className="tab">
            <thead><tr><th>Paciente</th><th>Idade</th><th>Celular</th><th>CPF</th><th>Última visita</th><th>Próximo agendamento</th></tr></thead>
            <tbody>
              {filtradas.map(({ p, r }) => (
                <tr key={p.id} className="clic" onClick={() => nav('/pacientes/' + p.id)}>
                  <td><div className="cel-pac"><Avatar nome={p.nome} /><div>{p.nome}{!p.consentimentoLgpd && <span className="tag t-at" title="Termo LGPD pendente">termo pendente</span>}</div></div></td>
                  <td>{idade(p.nascimento, hj)}</td>
                  <td className="mono">{p.telefone}</td>
                  <td className="mono mut">{cpfOculto(p.cpf)}</td>
                  <td>{r.ultima ? br(r.ultima.data) : <span className="mut">—</span>}</td>
                  <td>{r.proximo ? <>{br(r.proximo.data)} <span className="mut mono">{r.proximo.hora}</span></> : <span className="mut">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
