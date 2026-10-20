// Receber pagamento de um agendamento: escolhe a forma; PIX/dinheiro com desconto da clínica.
import { useState } from 'react';
import type { Agendamento, FormaPagamento } from '../tipos/modelos';
import { useDados } from './Dados';
import { Modal } from './Comuns';
import { Icone } from './Icone';
import { moeda } from '../util/formato';

export const FORMAS: Record<FormaPagamento, string> = { pix: 'PIX', dinheiro: 'Dinheiro', cartao_credito: 'Cartão de crédito', cartao_debito: 'Cartão de débito' };

export function Receber({ ag, fechar }: { ag: Agendamento; fechar: () => void }) {
  const { base, acoes } = useDados();
  const [forma, setForma] = useState<FormaPagamento>('pix');
  const serv = base.servicos.find((s) => s.id === ag.servicoId)!;
  const pac = base.pacientes.find((p) => p.id === ag.pacienteId)!;
  const comDesc = forma === 'pix' || forma === 'dinheiro';
  const valor = comDesc ? +(serv.valor * (1 - base.clinica.descontoPix / 100)).toFixed(2) : serv.valor;
  return (
    <Modal titulo="Receber pagamento" fechar={fechar}>
      <div className="receber">
        <div className="rec-res"><b>{pac.nome}</b><span>{serv.nome}</span></div>
        <div className="opcoes-forma">
          {(Object.keys(FORMAS) as FormaPagamento[]).map((f) => (
            <button type="button" key={f} className={'opcao' + (forma === f ? ' sel' : '')} onClick={() => setForma(f)}>
              <span>{FORMAS[f]}</span>{(f === 'pix' || f === 'dinheiro') && <small>{base.clinica.descontoPix}% de desconto</small>}
            </button>
          ))}
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
