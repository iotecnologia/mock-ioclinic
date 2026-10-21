// Tela de abertura depois do login (mesmo padrão do Analiza): logo pulsando com ondas, saudação,
// barra de progresso e mensagens dos passos. Enquanto ela roda, os dados da clínica são carregados por baixo.
// `rapida`: ao recarregar a página já logado, só espera os dados ficarem prontos (sem a sequência inteira).
import { useEffect, useState } from 'react';
import type { Perfil } from '../tipos/modelos';
import { Logo } from './Marca';
import clinica from '../dados/clinica.json';

const PASSOS: Record<Perfil, string[]> = {
  recepcao: ['Conferindo seu acesso…', 'Carregando a agenda do dia…', 'Organizando pacientes e confirmações…', 'Preparando sua área de trabalho…'],
  medica: ['Conferindo seu acesso…', 'Carregando a agenda do dia…', 'Organizando prontuários…', 'Preparando o painel da clínica…'],
};
const PASSO_MS = 650;

export function Abertura({ nome, perfil, dadosProntos, rapida, fim }: { nome: string; perfil: Perfil; dadosProntos: boolean; rapida?: boolean; fim: () => void }) {
  const passos = PASSOS[perfil];
  const [i, setI] = useState(rapida ? passos.length : 0);
  useEffect(() => {
    if (rapida) return;
    const t = setInterval(() => setI((x) => Math.min(x + 1, passos.length + 1)), PASSO_MS);
    return () => clearInterval(t);
  }, [rapida, passos.length]);
  // termina quando a sequência acabou E os dados já estão prontos
  useEffect(() => {
    if (dadosProntos && (rapida || i > passos.length)) { const t = setTimeout(fim, rapida ? 250 : 0); return () => clearTimeout(t); }
  }, [dadosProntos, rapida, i, passos.length, fim]);
  const h = new Date().getHours();
  const saud = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  const msg = i < passos.length ? passos[i] : dadosProntos ? 'Tudo pronto!' : 'Finalizando…';
  return (
    <div className="abertura" role="status" aria-live="polite">
      <div className="abertura-logo"><Logo tam={96} /><span className="onda" /><span className="onda o2" /></div>
      <div className="abertura-nome">IO CLINIC</div>
      <div className="abertura-sub">{clinica.medica} · {clinica.especialidade}</div>
      <div className="abertura-ola">{saud}, {nome}!</div>
      <div className="abertura-barra"><span style={{ width: `${rapida ? (dadosProntos ? 100 : 60) : Math.min(100, (i / passos.length) * 100)}%` }} /></div>
      <div className="abertura-msg">{msg}</div>
    </div>
  );
}
