// Consultório (só a médica): a tela de trabalho da Dra. no dia. Pacientes de hoje → abre o paciente →
// registro curto (CID e observação), documentos, exames, retorno → finalizar. O prontuário clínico completo
// fica no sistema da Dra. (Life Up). A história do paciente na clínica fica na FICHA do paciente.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDados } from '../componentes/Dados';
import { Avatar, Bloco, TagStatus, TituloPagina, Vazio } from '../componentes/Comuns';
import { Icone } from '../componentes/Icone';
import { doDia } from '../regras/agenda';
import { buscarPacientes, cadastrados, idade, idadeTxt } from '../regras/paciente';
import { extenso, hoje } from '../util/datas';

export function Prontuario() {
  const { base } = useDados();
  const nav = useNavigate();
  const hj = hoje();
  const [t, setT] = useState('');
  const lista = doDia(base, hj);
  const atendidos = lista.filter((a) => a.status === 'atendido').length;
  const res = t.trim().length >= 2 ? buscarPacientes(cadastrados(base.pacientes), t).slice(0, 10) : [];
  return (
    <>
      <TituloPagina titulo="Consultório" sub={`Pacientes de ${extenso(hj)}`} />
      <div className="grade2 consult">
        <Bloco titulo={<><Icone n="dia" /> Pacientes de hoje</>} extra={lista.length > 0 && <span className="mut peq">{atendidos} de {lista.length} atendidos</span>}>
          {lista.length === 0 ? <Vazio>Nenhum paciente agendado para hoje.</Vazio> : (
            <div className="consult-rolagem">
              <table className="tab consult-tab">
                <colgroup><col className="c-hora" /><col /><col className="c-serv" /><col className="c-sit" /></colgroup>
                <thead><tr><th>Hora</th><th>Paciente</th><th>Serviço</th><th>Situação</th></tr></thead>
                <tbody>
                  {lista.map((a) => {
                    const p = base.pacientes.find((x) => x.id === a.pacienteId)!;
                    const s = base.servicos.find((x) => x.id === a.servicoId)!;
                    return (
                      <tr key={a.id} className={p.situacao ? '' : 'clic'} onClick={() => !p.situacao && nav(`/prontuario/${p.id}?ag=${a.id}`)}
                        title={p.situacao === 'pre' ? 'Pré-cadastro: a recepção completa o cadastro na chegada' : 'Atender este paciente'}>
                        <td className="mono">{a.hora}</td>
                        <td className="consult-pac">{p.nome} <span className="mut peq">{idadeTxt(p, hj)}</span></td>
                        <td><span className={'tipo tipo-' + s.tipo}>{s.curto}</span></td>
                        <td><TagStatus s={a.status} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Bloco>
        <Bloco titulo={<><Icone n="busca" /> Atender outro paciente</>}>
          <div className="pad">
            <div className="f-busca"><Icone n="busca" /><input type="text" value={t} onChange={(e) => setT(e.target.value)} placeholder="Nome, CPF ou telefone" aria-label="Buscar paciente" /></div>
          </div>
          {res.length > 0 && (
            <ul className="lista-simples">
              {res.map((p) => <li key={p.id}><button type="button" onClick={() => nav('/prontuario/' + p.id)}><Avatar nome={p.nome} /><span>{p.nome}<small>{idade(p.nascimento, hj)} anos</small></span><Icone n="dir" /></button></li>)}
            </ul>
          )}
          {t.trim().length >= 2 && !res.length && <Vazio>Nenhum paciente encontrado.</Vazio>}
          {t.trim().length < 2 && <Vazio>Para quem não está na agenda de hoje: renovar receita, emitir atestado ou declaração.</Vazio>}
        </Bloco>
      </div>
    </>
  );
}
