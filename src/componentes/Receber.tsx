// Receber pagamento de um agendamento: escolhe a forma. Sem desconto automático: desconto só se a Dra. optar
// (clica no lápis e digita a porcentagem; o valor recalcula sozinho). Recepção até o limite da clínica.
import { useState } from 'react';
import type { Agendamento, FormaPagamento } from '../tipos/modelos';
import { useDados } from './Dados';
import { BotaoIcone, Modal } from './Comuns';
import { useSessao } from '../acesso/Sessao';
import { limiteDesconto } from '../regras/orcamento';
import { Icone } from './Icone';
import { moeda } from '../util/formato';

export const FORMAS: Record<FormaPagamento, string> = { pix: 'PIX', dinheiro: 'Dinheiro', cartao_credito: 'Cartão de crédito', cartao_debito: 'Cartão de débito' };

export function Receber({ ag, fechar }: { ag: Agendamento; fechar: () => void }) {
  const { base, acoes } = useDados();
  const { usuario } = useSessao();
  const [forma, setForma] = useState<FormaPagamento>('pix');
  const [darDesc, setDarDesc] = useState(false);
  const [desc, setDesc] = useState(0);
  const lim = limiteDesconto(usuario!.perfil, base.clinica);
  const serv = base.servicos.find((s) => s.id === ag.servicoId)!;
  const pac = base.pacientes.find((p) => p.id === ag.pacienteId)!;
  const auto = forma === 'pix' || forma === 'dinheiro' ? base.clinica.descontoPix : 0;   // 0 = sem desconto automático
  const pct = Math.min(100, auto + (darDesc ? desc : 0));
  const valor = +(serv.valor * (1 - pct / 100)).toFixed(2);
  const comDesc = pct > 0;
  return (
    <Modal titulo="Receber pagamento" fechar={fechar}>
      <div className="receber">
        <div className="rec-res"><b>{pac.nome}</b><span>{serv.nome}</span></div>
        <div className="opcoes-forma">
          {(Object.keys(FORMAS) as FormaPagamento[]).map((f) => (
            <button type="button" key={f} className={'opcao' + (forma === f ? ' sel' : '')} onClick={() => setForma(f)}>
              <span>{FORMAS[f]}</span>{(f === 'pix' || f === 'dinheiro') && base.clinica.descontoPix > 0 && <small>{base.clinica.descontoPix}% de desconto</small>}
            </button>
          ))}
        </div>
        <div className="desc-extra">
          <span>Desconto</span>
          <input type="number" min={0} max={lim} value={desc} disabled={!darDesc} onChange={(e) => setDesc(Math.min(lim, Math.max(0, Number(e.target.value))))} aria-label="Desconto em porcentagem" />
          <span>%</span>
          {!darDesc
            ? <BotaoIcone icone="editar" titulo="Dar desconto (só se a Dra. autorizar)" cls="peq" onClick={() => setDarDesc(true)} />
            : <BotaoIcone icone="x" titulo="Tirar o desconto" cls="peq" onClick={() => { setDesc(0); setDarDesc(false); }} />}
          <small className="mut">{darDesc ? (lim >= 100 ? 'sem limite' : `até ${lim}%`) : 'sem desconto'}</small>
        </div>
        <div className="rec-total"><span>Total</span><b>{moeda(valor)}</b>{comDesc && <small>de {moeda(serv.valor)}</small>}</div>
        <div className="rodape-modal">
          <button type="button" className="btn2" onClick={fechar}>Voltar</button>
          <button type="button" className="btn2 pri" onClick={() => { acoes.receber(ag.id, forma, valor); fechar(); }}><Icone n="check" /> Confirmar recebimento</button>
        </div>
      </div>
    </Modal>
  );
}
