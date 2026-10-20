// Tipos de todas as tabelas do mock. Na Fase 3 são os mesmos que a API (io-clinic) devolve.

export type Perfil = 'medica' | 'recepcao';
export interface Usuario { id: string; email: string; nome: string; perfil: Perfil; cargo: string }

export interface Clinica {
  produto: string;
  medica: string;
  especialidade: string;
  cidade: string;
  telefone: string;
  /** Horário de atendimento por dia da semana (0 = domingo … 6 = sábado). Dia sem faixa = fechado. */
  horarios: Record<string, { inicio: string; fim: string }[]>;
  /** Grade da agenda em minutos (todos os horários começam em múltiplos disso). */
  gradeMin: number;
  /** Desconto (%) no PIX ou dinheiro. */
  descontoPix: number;
}

export type TipoServico = 'consulta' | 'retorno' | 'exame';
export interface Servico {
  id: string; nome: string; curto: string; tipo: TipoServico;
  duracaoMin: number; valor: number; preparo?: string;
}

export interface Endereco { cep: string; logradouro: string; numero: string; complemento?: string; bairro: string; cidade: string; uf: string }
export interface Paciente {
  id: string; nome: string; cpf: string; nascimento: string; sexo: 'F' | 'M' | 'O';
  telefone: string; email?: string; endereco?: Endereco;
  contatoEmergencia?: string; observacoes?: string;
  consentimentoLgpd: boolean; consentimentoData?: string; criadoEm: string;
}

export type StatusAgendamento = 'agendado' | 'confirmado' | 'chegou' | 'em_atendimento' | 'atendido' | 'faltou' | 'cancelado';
export type FormaPagamento = 'pix' | 'dinheiro' | 'cartao_credito' | 'cartao_debito';
export interface Pagamento { status: 'pendente' | 'pago' | 'isento'; valor: number; forma?: FormaPagamento; pagoEm?: string }

export interface Agendamento {
  id: string; pacienteId: string; servicoId: string;
  /** 'YYYY-MM-DD' */ data: string;
  /** 'HH:mm' */ hora: string;
  duracaoMin: number;
  status: StatusAgendamento;
  pagamento?: Pagamento;
  obs?: string;
  criadoEm: string;
}

/** Registro clínico de um atendimento (prontuário). Só a médica vê. */
export interface Atendimento {
  id: string; agendamentoId: string; pacienteId: string; data: string;
  queixa: string; pa?: string; fc?: number; pesoKg?: number; alturaCm?: number;
  cid?: string; cidDescricao?: string; conduta: string;
}

export interface Bloqueio { data: string; motivo: string }
export interface Feriado { data: string; nome: string }

export interface BaseClinica {
  clinica: Clinica;
  usuarios: Usuario[];
  servicos: Servico[];
  pacientes: Paciente[];
  agendamentos: Agendamento[];
  atendimentos: Atendimento[];
  bloqueios: Bloqueio[];
  feriados: Feriado[];
}
