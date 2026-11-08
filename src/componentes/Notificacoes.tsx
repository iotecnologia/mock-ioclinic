// Sino do topo: tudo que está pendente no sistema, para qualquer tela. O número mostra quantas pendências há.
// Clicar num item abre o detalhe NA MESMA TELA (janela), sem trocar de página.
// Embaixo, os avisos recentes desta sessão (ex.: paciente agendou ou pediu atendente pelo WhatsApp).
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDados } from './Dados';
import { useSessao } from '../acesso/Sessao';
import { BotaoIcone, Modal } from './Comuns';
import { Icone } from './Icone';
import { DetalheAgendamento } from './DetalheAgendamento';
import { WHATS_AUTOMATICO } from './WhatsAuto';
import { GRUPOS_PEND, pendencias, totalPendencias, type Pendencia } from '../regras/pendencias';
import { aConfirmar } from '../regras/agenda';
import { msgLembrete } from '../regras/mensagens';
import { agoraMin, br, brCurto, hoje, somaDias } from '../util/datas';
import { linkWhats, moeda } from '../util/formato';

const ICONE: Record<Pendencia['tipo'], string> = { recepcao: 'porta', remarcar: 'alerta', lembretes: 'zap', precadastro: 'pacienteMais', receber: 'carteira', despesa: 'carteira' };

export function Sino() {
  const { base, historico } = useDados();
  const { usuario } = useSessao();
  const nav = useNavigate();
  const [aberto, setAberto] = useState(false);
  const [agora, setAgora] = useState(agoraMin());
  const [ag, setAg] = useState<string | null>(null);
  const [dia, setDia] = useState<string | null>(null);
  const [despesa, setDespesa] = useState<string | null>(null);
  const caixa = useRef<HTMLDivElement>(null);
  useEffect(() => { const t = setInterval(() => setAgora(agoraMin()), 60000); return () => clearInterval(t); }, []);
  // fecha ao clicar fora ou apertar Esc
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => { if (caixa.current && !caixa.current.contains(e.target as Node)) setAberto(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAberto(false); };
    document.addEventListener('mousedown', fora); window.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', fora); window.removeEventListener('keydown', esc); };
  }, [aberto]);

  const lista = pendencias(base, hoje(), agora, usuario!.perfil, WHATS_AUTOMATICO);
  const urgentes = lista.some((p) => p.urgente);
  const total = totalPendencias(lista);
  const abrir = (p: Pendencia) => {
    setAberto(false);
    if (p.agId) setAg(p.agId); else if (p.dia) setDia(p.dia); else if (p.despesaId) setDespesa(p.despesaId);
  };

  return (
    <div className="sino" ref={caixa}>
      <button type="button" className={'icone-btn' + (aberto ? ' ativo' : '')} onClick={() => setAberto(!aberto)}
        title={total ? `${total} pendência${total > 1 ? 's' : ''}` : 'Notificações'} aria-label="Notificações" aria-expanded={aberto}>
        <Icone n="sino" />
        {total > 0 && <span className={'sino-num' + (urgentes ? ' urg' : '')}>{total > 99 ? '99+' : total}</span>}
      </button>
      {aberto && (
        <div className="sino-painel" role="dialog" aria-label="Notificações">
          <div className="sino-cab"><b>Notificações</b><span className="mut peq">{total ? `${total} pendente${total > 1 ? 's' : ''}` : 'tudo em dia'}</span></div>
          <div className="sino-corpo">
            {lista.length === 0 && <div className="sino-vazio"><Icone n="check" /> Nenhuma pendência agora.</div>}
            {GRUPOS_PEND.map((g) => {
              const itens = lista.filter((p) => p.tipo === g.tipo);
              if (!itens.length) return null;
              return (
                <div key={g.tipo} className="sino-grupo">
                  <div className="sino-gnome">{g.nome} <span>{totalPendencias(itens)}</span></div>
                  {itens.map((p) => (
                    <button type="button" key={p.id} className={'sino-item' + (p.urgente ? ' urg' : '')} onClick={() => abrir(p)} title="Abrir o detalhe">
                      <Icone n={ICONE[p.tipo]} /><span><b>{p.titulo}</b><small>{p.detalhe}</small></span>
                    </button>
                  ))}
                </div>
              );
            })}
            {historico.length > 0 && (
              <div className="sino-grupo">
                <div className="sino-gnome">Avisos recentes</div>
                {historico.map((h) => (
                  <button type="button" key={h.id} className="sino-item hist" disabled={!h.acao && !h.link}
                    onClick={() => { setAberto(false); if (h.acao) h.acao(); else if (h.link) nav(h.link); }}>
                    <span className="mono peq">{h.hora}</span><span><small>{h.texto}</small></span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {ag && <DetalheAgendamento id={ag} fechar={() => setAg(null)} />}
      {dia && <ModalLembretes dia={dia} fechar={() => setDia(null)} />}
      {despesa && <ModalDespesa id={despesa} fechar={() => setDespesa(null)} />}
    </div>
  );
}

/** Lista do próximo dia de atendimento: enviar o lembrete pelo WhatsApp e marcar quem confirmou. */
export function ModalLembretes({ dia, fechar }: { dia: string; fechar: () => void }) {
  const { base, acoes } = useDados();
  const hj = hoje();
  const todos = aConfirmar(base, dia).filter((a) => a.whats?.resposta !== 'remarcar');
  return (
    <Modal titulo={`Lembretes de ${dia === somaDias(hj, 1) ? 'amanhã' : brCurto(dia)} · WhatsApp`} fechar={fechar}>
      {todos.length === 0 ? <p className="mut">Todos já confirmaram.</p> : (
        <ul className="tarefas">
          {todos.map((a) => {
            const p = base.pacientes.find((x) => x.id === a.pacienteId)!, s = base.servicos.find((x) => x.id === a.servicoId)!;
            const enviado = !!a.whats?.lembreteEm;
            return (
              <li key={a.id}>
                <span className="mono">{a.hora}</span><span className="tf-nome">{p.nome}<small>{s.curto}{enviado && <em className="zap-st ok"> · lembrete enviado ✓</em>}</small></span>
                <a className={'btn2 peq ic zap' + (!enviado ? ' pulsa' : '')} href={linkWhats(p.telefone, msgLembrete(base.clinica, p, s, a))} target="_blank" rel="noreferrer" title="Enviar lembrete pelo WhatsApp" aria-label="Enviar lembrete pelo WhatsApp"
                  onClick={() => acoes.registrarWhats(a.id, { modo: 'manual', lembreteEm: new Date().toISOString() })}><Icone n="zap" /></a>
                <BotaoIcone icone="check" titulo="Marcar como confirmado" cls="peq verde" onClick={() => acoes.mudarStatus(a.id, 'confirmado')} />
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}

/** Despesa vencida ou vencendo hoje: ver e confirmar o pagamento ali mesmo. */
function ModalDespesa({ id, fechar }: { id: string; fechar: () => void }) {
  const { base, acoes } = useDados();
  const d = base.despesas.find((x) => x.id === id);
  if (!d) return null;
  return (
    <Modal titulo="Despesa a pagar" fechar={fechar}>
      <div className="resumo-ag">
        <div><span>Descrição</span>{d.descricao}</div>
        <div><span>Categoria</span>{d.categoria}</div>
        <div><span>Vencimento</span>{br(d.data)}</div>
        <div><span>Valor</span><b className="mono">{moeda(d.valor)}</b></div>
      </div>
      <div className="rodape-modal">
        <button type="button" className="btn2" onClick={fechar}>Fechar</button>
        {d.status === 'a_pagar'
          ? <button type="button" className="btn2 pri" onClick={() => { acoes.pagarDespesa(d.id); fechar(); }}><Icone n="check" /> Confirmar pagamento</button>
          : <span className="tag t-ok">paga</span>}
      </div>
    </Modal>
  );
}
