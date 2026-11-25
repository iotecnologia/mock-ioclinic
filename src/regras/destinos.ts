// Catálogo de DESTINOS da busca global (padrão ERP: digita a palavra-chave e o sistema mostra para onde ir).
// Cada destino é uma página ou função do sistema, com o caminho no menu ("Financeiro › Nova despesa"),
// palavras-chave (sinônimos que a recepção/Dra. usam) e o perfil que pode abrir.
import type { Perfil } from '../tipos/modelos';
import { semAcento } from '../util/formato';

export interface Destino { id: string; caminho: string[]; rota: string; desc: string; palavras: string; perfis: Perfil[] }
const T: Perfil[] = ['medica', 'recepcao'];
const M: Perfil[] = ['medica'];

export const DESTINOS: Destino[] = [
  { id: 'hoje', caminho: ['Visão Geral'], rota: '/hoje', desc: 'Pacientes de hoje, confirmados e o que fazer', palavras: 'inicio inicial hoje dia resumo tarefas fazer pendencias', perfis: T },
  { id: 'agenda', caminho: ['Agenda'], rota: '/agenda', desc: 'Horários do dia e da semana', palavras: 'agenda horario horarios calendario dia marcacao consultas', perfis: T },
  { id: 'agenda-novo', caminho: ['Agenda', 'Novo agendamento'], rota: '/agenda?novo=1', desc: 'Marcar consulta, retorno ou exame', palavras: 'agendar marcar novo agendamento consulta exame retorno encaixe', perfis: T },
  { id: 'agenda-semana', caminho: ['Agenda', 'Semana'], rota: '/agenda?visao=semana', desc: 'Visão da semana inteira', palavras: 'semana semanal grade', perfis: T },
  { id: 'pacientes', caminho: ['Pacientes'], rota: '/pacientes', desc: 'Lista de pacientes cadastrados', palavras: 'pacientes cadastro lista clientes ficha', perfis: T },
  { id: 'pacientes-novo', caminho: ['Pacientes', 'Novo paciente'], rota: '/pacientes/novo', desc: 'Cadastrar um paciente', palavras: 'novo paciente cadastrar cadastro incluir', perfis: T },
  { id: 'pacientes-recall', caminho: ['Pacientes', 'Revisão anual'], rota: '/pacientes?f=recall', desc: 'Sem consulta há mais de 12 meses', palavras: 'revisao anual recall retorno chamar 12 meses', perfis: T },
  { id: 'pacientes-lgpd', caminho: ['Pacientes', 'Termo LGPD pendente'], rota: '/pacientes?f=lgpd', desc: 'Pacientes sem o termo aceito', palavras: 'lgpd termo consentimento pendente', perfis: T },
  { id: 'consultorio', caminho: ['Consultório'], rota: '/prontuario', desc: 'Pacientes de hoje: registrar, emitir documentos e finalizar', palavras: 'consultorio atender atendimento registro cid finalizar historico prontuario', perfis: M },
  { id: 'documentos', caminho: ['Consultório', 'Receita, atestado, declaração, pedido de exames'], rota: '/prontuario', desc: 'Escolha o paciente e emita o documento', palavras: 'receita receituario atestado declaracao pedido exame documento imprimir', perfis: M },
  { id: 'historico-pac', caminho: ['Pacientes', 'Histórico do paciente'], rota: '/pacientes', desc: 'Abra a ficha: atendimentos, exames, retorno e documentos', palavras: 'historico ficha paciente exames retorno documentos', perfis: T },
  { id: 'orcamento', caminho: ['Orçamento'], rota: '/orcamento', desc: 'Preços dos serviços e orçamento para o paciente', palavras: 'orcamento preco precos valor valores tabela servicos quanto custa', perfis: T },
  { id: 'whatsapp', caminho: ['WhatsApp'], rota: '/whatsapp', desc: 'Atendimento automático pelo WhatsApp', palavras: 'whatsapp zap mensagem robo lembrete confirmacao', perfis: T },
  { id: 'financeiro', caminho: ['Financeiro'], rota: '/financeiro', desc: 'Receitas, despesas e saldo do período', palavras: 'financeiro caixa dinheiro saldo', perfis: M },
  { id: 'fin-nova', caminho: ['Financeiro', 'Nova despesa'], rota: '/financeiro?nova=1', desc: 'Lançar uma conta ou gasto', palavras: 'nova despesa lancar gasto conta pagar boleto aluguel condominio', perfis: M },
  { id: 'fin-despesas', caminho: ['Financeiro', 'Despesas'], rota: '/financeiro?vista=despesas', desc: 'Despesas do período', palavras: 'despesas gastos contas pagas pagar', perfis: M },
  { id: 'fin-receitas', caminho: ['Financeiro', 'Receitas'], rota: '/financeiro?vista=receitas', desc: 'Recebimentos do período', palavras: 'receitas recebimentos faturamento entradas pix cartao dinheiro', perfis: M },
  { id: 'fin-areceber', caminho: ['Financeiro', 'A receber'], rota: '/financeiro?vista=areceber', desc: 'Pacientes que ainda não pagaram', palavras: 'a receber pendente cobrar devendo', perfis: M },
  { id: 'fin-fluxo', caminho: ['Financeiro', 'Fluxo de caixa'], rota: '/financeiro?vista=fluxo', desc: 'Entradas, saídas e saldo acumulado', palavras: 'fluxo caixa saldo acumulado', perfis: M },
  { id: 'relatorios', caminho: ['Relatórios'], rota: '/relatorios', desc: 'Relatórios para imprimir ou baixar', palavras: 'relatorio relatorios imprimir pdf exportar', perfis: M },
  { id: 'painel', caminho: ['Painel (BI)'], rota: '/painel', desc: 'Indicadores e gráficos da clínica', palavras: 'painel bi indicadores graficos dashboard resultado', perfis: M },
];

/** Destinos que combinam com a palavra-chave (todas as palavras digitadas precisam aparecer). Mais relevantes primeiro. */
export function buscarDestinos(termo: string, perfil: Perfil): Destino[] {
  const q = semAcento(termo).split(/\s+/).filter(Boolean);
  if (!q.length) return [];
  return DESTINOS
    .filter((d) => d.perfis.includes(perfil))
    .map((d) => {
      const nome = semAcento(d.caminho.join(' '));
      // cada palavra digitada precisa ser o COMEÇO de alguma palavra do destino ("ana" não acha "semana")
      const palavras = (nome + ' ' + semAcento(d.palavras + ' ' + d.desc)).split(/[\s,()›-]+/).filter(Boolean);
      if (!q.every((x) => palavras.some((w) => w.startsWith(x)))) return null;
      const ultimo = semAcento(d.caminho[d.caminho.length - 1]);
      const nota = (ultimo.startsWith(q[0]) ? 0 : nome.split(' ').some((w) => w.startsWith(q[0])) ? 1 : 2) * 10 + d.caminho.length;
      return { d, nota };
    })
    .filter((x): x is { d: Destino; nota: number } => !!x)
    .sort((a, b) => a.nota - b.nota)
    .map((x) => x.d);
}
