// Catálogo de páginas do menu. O PERFIL decide o que aparece (médica x recepção).
import type { Perfil } from '../tipos/modelos';

export interface Pagina { id: string; rota: string; nome: string; grupo: string; icone: string; perfis: Perfil[] }
const TODOS: Perfil[] = ['medica', 'recepcao'];
const MEDICA: Perfil[] = ['medica'];

export const PAGINAS: Pagina[] = [
  { id: 'hoje', rota: '/hoje', nome: 'Visão Geral', grupo: '', icone: 'inicio', perfis: TODOS },
  { id: 'agenda', rota: '/agenda', nome: 'Agenda', grupo: 'Atendimento', icone: 'calendario', perfis: TODOS },
  { id: 'pacientes', rota: '/pacientes', nome: 'Pacientes', grupo: 'Atendimento', icone: 'usuarios', perfis: TODOS },
  { id: 'prontuario', rota: '/prontuario', nome: 'Prontuário', grupo: 'Atendimento', icone: 'estetoscopio', perfis: MEDICA },
  { id: 'orcamento', rota: '/orcamento', nome: 'Orçamento', grupo: 'Atendimento', icone: 'orcamento', perfis: TODOS },
  { id: 'financeiro', rota: '/financeiro', nome: 'Financeiro', grupo: 'Gestão', icone: 'carteira', perfis: MEDICA },
  { id: 'relatorios', rota: '/relatorios', nome: 'Relatórios', grupo: 'Gestão', icone: 'arquivo', perfis: MEDICA },
  { id: 'painel', rota: '/painel', nome: 'Painel (BI)', grupo: 'Gestão', icone: 'grafico', perfis: MEDICA },
];

/** Itens que aparecem no menu apagados (fosco), sem abrir: entram nas próximas entregas do mock. */
export const EM_BREVE: { nome: string; grupo: string; icone: string; dica: string; perfis: Perfil[] }[] = [
  { nome: 'Usuários', grupo: 'Administração', icone: 'chave', dica: 'Próxima entrega: usuários e perfis', perfis: MEDICA },
];

export const GRUPOS = ['', 'Atendimento', 'Gestão', 'Administração'];
