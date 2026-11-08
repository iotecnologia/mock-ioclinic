// WhatsApp (DEMONSTRAÇÃO do atendimento automático): à esquerda, o celular do paciente conversando com o robô
// (botões e listas, como na API oficial); à direita, o que acontece no IO Clinic na hora — o agendamento cai na
// agenda, a remarcação cancela o horário antigo, o pedido de atendente avisa a recepção.
// No sistema final, a conversa acontece no WhatsApp da clínica (mesmo número, API oficial com coexistência).
import { useEffect, useRef, useState } from 'react';
import { useDados } from '../componentes/Dados';
import { Bloco, BotaoIcone, TituloPagina, Vazio } from '../componentes/Comuns';
import { Icone } from '../componentes/Icone';
import { LogoDra } from '../componentes/LogoDra';
import { DetalheAgendamento } from '../componentes/DetalheAgendamento';
import { estadoInicial, responder, type Efeito, type EstadoRobo, type MsgRobo, type Opcao } from '../regras/robo';
import { cadastrados } from '../regras/paciente';
import { agoraMin, brCurto, hoje } from '../util/datas';
import { mascaraTelefone } from '../util/formato';

const NUMERO_NOVO = '(19) 98877-6655';   // número desconhecido = paciente novo (pré-cadastro)
interface Registro { quando: string; texto: string; agId?: string; tipo: 'ok' | 'alerta' | 'info' }
const hm = () => new Date().toTimeString().slice(0, 5);

export function WhatsappDemo() {
  const { base, acoes, avisar } = useDados();
  const [tel, setTel] = useState(NUMERO_NOVO);
  const [estado, setEstado] = useState<EstadoRobo>(() => estadoInicial(NUMERO_NOVO));
  const [msgs, setMsgs] = useState<(MsgRobo & { hora: string })[]>([]);
  const [texto, setTexto] = useState('');
  const [lista, setLista] = useState<MsgRobo | null>(null);     // lista de opções aberta (como no WhatsApp)
  const [registro, setRegistro] = useState<Registro[]>([]);
  const [agAberto, setAgAberto] = useState<string | null>(null);
  const fim = useRef<HTMLDivElement>(null);
  useEffect(() => { fim.current?.scrollIntoView({ block: 'end' }); }, [msgs]);

  const comTel = cadastrados(base.pacientes).filter((p) => p.telefone).slice(0, 40);
  const nomeDoTel = (t: string) => base.pacientes.find((p) => p.telefone === t)?.nome;

  const recomecar = (t = tel) => { setEstado(estadoInicial(t)); setMsgs([]); setLista(null); setTexto(''); };
  const trocarTel = (t: string) => { setTel(t); recomecar(t); };

  /** Aplica no sistema o que o robô decidiu (agendar, cancelar, chamar atendente). */
  const aplicar = (ef: Efeito[]) => {
    for (const e of ef) {
      if (e.tipo === 'agendar') {
        const s = base.servicos.find((x) => x.id === e.servicoId)!;
        let pacienteId = e.pacienteId;
        let nome = base.pacientes.find((p) => p.id === pacienteId)?.nome ?? '';
        if (e.novo) {
          const p = acoes.salvarPaciente({ nome: e.novo.nome, telefone: mascaraTelefone(e.novo.telefone), nascimento: e.novo.nascimento, cpf: '', sexo: 'O', consentimentoLgpd: false, situacao: 'pre' });
          pacienteId = p.id; nome = p.nome;
        }
        const ag = acoes.agendar({
          pacienteId: pacienteId!, servicoId: e.servicoId, data: e.data, hora: e.hora, duracaoMin: s.duracaoMin, origem: 'whatsapp',
          whats: { modo: 'auto', confirmacaoEm: new Date().toISOString(), processado: true },
        });
        if (e.substitui) acoes.mudarStatus(e.substitui, 'cancelado');
        const txt = `${e.substitui ? 'Remarcado' : 'Agendado'} pelo WhatsApp: ${nome} · ${s.curto} · ${brCurto(e.data)} às ${e.hora}${e.novo ? ' (pré-cadastro)' : ''}`;
        setRegistro((r) => [{ quando: hm(), texto: txt, agId: ag.id, tipo: 'ok' }, ...r]);
        avisar({ id: 'zap:' + ag.id, tipo: 'ok', texto: `📅 ${txt}` });
      }
      if (e.tipo === 'cancelar') {
        const a = base.agendamentos.find((x) => x.id === e.agendamentoId)!;
        acoes.mudarStatus(a.id, 'cancelado');
        const txt = `Cancelado pelo paciente no WhatsApp: ${base.pacientes.find((p) => p.id === a.pacienteId)?.nome} · ${brCurto(a.data)} às ${a.hora}`;
        setRegistro((r) => [{ quando: hm(), texto: txt, agId: a.id, tipo: 'alerta' }, ...r]);
        avisar({ id: 'zap:c' + a.id, tipo: 'alerta', texto: `❌ ${txt}` });
      }
      if (e.tipo === 'atendente') {
        const txt = `${nomeDoTel(tel) ?? tel} pediu para falar com atendente no WhatsApp`;
        setRegistro((r) => [{ quando: hm(), texto: txt, tipo: 'info' }, ...r]);
        avisar({ id: 'zap:at' + Date.now(), tipo: 'alerta', texto: `💬 ${txt}` });
      }
    }
  };

  /** O paciente mandou algo (texto digitado ou opção tocada). */
  const enviar = (entrada: string, mostrado?: string) => {
    if (!entrada.trim()) return;
    const r = responder(estado, entrada, { base, hoje: hoje(), agoraMin: agoraMin() });
    const agora = hm();
    setMsgs((l) => [...l, { de: 'paciente', texto: mostrado ?? entrada, hora: agora }, ...r.msgs.map((m) => ({ ...m, hora: agora }))]);
    setEstado(r.estado); setTexto(''); setLista(null);
    aplicar(r.efeitos);
  };
  const tocar = (o: Opcao) => enviar(o.id, o.rotulo);
  const ultimaRobo = [...msgs].reverse().find((m) => m.de === 'robo');

  return (
    <>
      <TituloPagina titulo="WhatsApp" sub="Demonstração do atendimento automático: o paciente marca, remarca ou cancela sozinho pelo WhatsApp">
        <BotaoIcone icone="limpar" titulo="Recomeçar a conversa" onClick={() => recomecar()} disabled={!msgs.length} />
      </TituloPagina>

      <div className="zap-demo">
        <div className="zap-cel">
          <div className="zap-topo">
            <LogoDra tam={34} tinta="clara" />
            <div><b>Consultório {base.clinica.medica.replace(' Silva', '')}</b><small>{estado.etapa === 'atendente' ? 'atendente' : 'online'}</small></div>
          </div>
          <div className="zap-conversa">
            {msgs.length === 0 && <div className="zap-dica">Envie uma mensagem como paciente (ex.: “Oi, bom dia”) ou toque abaixo.</div>}
            {msgs.map((m, i) => {
              const ativa = m === ultimaRobo && !!m.opcoes?.length;
              return (
                <div key={i} className={'zap-msg ' + m.de}>
                  <div className="zap-bolha">{m.texto}<small>{m.hora}{m.de === 'paciente' && ' ✓✓'}</small></div>
                  {m.tipo === 'botoes' && m.opcoes && (
                    <div className="zap-botoes">{m.opcoes.map((o) => <button type="button" key={o.id} disabled={!ativa} onClick={() => tocar(o)}>{o.rotulo}</button>)}</div>
                  )}
                  {m.tipo === 'lista' && m.opcoes && (
                    <div className="zap-botoes"><button type="button" disabled={!ativa} onClick={() => setLista(m)}>☰ {m.botaoLista ?? 'Ver opções'}</button></div>
                  )}
                </div>
              );
            })}
            <div ref={fim} />
          </div>
          {msgs.length === 0 && (
            <div className="zap-rapidas">
              {['Oi, bom dia', 'Vocês atendem Unimed?', 'Qual o endereço?'].map((x) => <button type="button" key={x} onClick={() => enviar(x)}>{x}</button>)}
            </div>
          )}
          <form className="zap-entrada" onSubmit={(e) => { e.preventDefault(); enviar(texto); }}>
            <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Mensagem" aria-label="Mensagem do paciente" />
            <button type="submit" title="Enviar" aria-label="Enviar" disabled={!texto.trim()}><Icone n="dir" /></button>
          </form>
          {lista && (
            <div className="zap-folha" role="dialog" aria-label={lista.botaoLista}>
              <div className="zap-folha-cab"><button type="button" title="Fechar" aria-label="Fechar" onClick={() => setLista(null)}><Icone n="x" /></button><b>{lista.botaoLista}</b></div>
              {lista.opcoes!.map((o) => <button type="button" key={o.id} className="zap-op" onClick={() => tocar(o)}><span>{o.rotulo}{o.desc && <small>{o.desc}</small>}</span><i /></button>)}
            </div>
          )}
        </div>

        <div className="pilha">
          <Bloco titulo={<><Icone n="usuarios" /> Quem está mandando mensagem</>}>
            <div className="pad">
              <select value={tel} onChange={(e) => trocarTel(e.target.value)} aria-label="Simular como">
                <option value={NUMERO_NOVO}>Número novo {NUMERO_NOVO} (paciente sem cadastro)</option>
                {comTel.map((p) => <option key={p.id} value={p.telefone}>{p.nome} · {p.telefone}</option>)}
              </select>
              <p className="mut peq">O robô reconhece o paciente pelo número do WhatsApp. Número novo faz o pré-cadastro (nome e data de nascimento) dentro da conversa.</p>
            </div>
          </Bloco>
          <Bloco titulo={<><Icone n="lista" /> O que aconteceu no IO Clinic</>} extra={<span className="mut peq">clique para ver</span>}>
            {registro.length === 0 ? <Vazio>Nada ainda. Agende pelo celular ao lado e veja o horário cair na agenda.</Vazio> : (
              <ul className="zap-registro">
                {registro.map((r, i) => (
                  <li key={i} className={r.tipo + (r.agId ? ' clic' : '')} onClick={() => r.agId && setAgAberto(r.agId)} title={r.agId ? 'Ver o agendamento' : undefined}>
                    <span className="mono">{r.quando}</span><span>{r.texto}</span>
                  </li>
                ))}
              </ul>
            )}
          </Bloco>
          <div className="aviso"><Icone n="info" /> Demonstração: no sistema final a conversa acontece no WhatsApp da clínica, no mesmo número, pela API oficial. A recepção continua respondendo pelo WhatsApp Web quando o paciente pede atendente.</div>
        </div>
      </div>
      {agAberto && <DetalheAgendamento id={agAberto} fechar={() => setAgAberto(null)} />}
    </>
  );
}
