// Tipos de todas as tabelas do mock. Na Fase 3 são os mesmos que a API (io-clinic) devolve.

export type Perfil = 'medica' | 'recepcao';
export interface Usuario { id: string; email: string; nome: string; perfil: Perfil; cargo: string }

export interface Clinica {
  produto: string;
  medica: string;
  especialidade: string;
  /** Ex.: "CRM-SP 123456". Aparece no cabeçalho e na assinatura dos documentos. */
  crm: string;
  /** Registro de especialista (opcional). */
  rqe?: string;
  endereco: string;
  cidade: string;
  /** Telefone fixo da clínica. */
  telefone: string;
  /** WhatsApp da clínica. */
  whatsapp?: string;
  /** A partir desta hora ('HH:mm') a recepção é avisada para enviar os lembretes do próximo dia de atendimento. */
  horaLembrete?: string;
  /** Horário de atendimento por dia da semana (0 = domingo … 6 = sábado). Dia sem faixa = fechado. */
  horarios: Record<string, { inicio: string; fim: string }[]>;
  /** Grade da agenda em minutos (todos os horários começam em múltiplos disso). */
  gradeMin: number;
  /** Desconto (%) no PIX ou dinheiro. */
  descontoPix: number;
  /** Desconto extra máximo (%) que a recepção pode dar no orçamento. A médica não tem limite. */
  descontoMaxRecepcao: number;
  /** Parcelamento no cartão por faixa de valor: até `ate` reais, no máximo `vezes` (ate null = acima disso). */
  parcelas: { ate: number | null; vezes: number }[];
  /** Validade do orçamento em dias. */
  validadeOrcamentoDias: number;
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
  /**
   * 'pre' = pré-cadastro feito no agendamento (só nome + WhatsApp). Vira paciente quando a recepção
   * completa o cadastro na chegada. Se faltar ou cancelar, é apagado (LGPD: não guarda quem não veio).
   * 'removido' = registro anônimo que fica no lugar do pré-cadastro apagado (só para a agenda não perder o horário).
   * Sem valor = paciente cadastrado.
   */
  situacao?: 'pre' | 'removido';
}

/**
 * WhatsApp do agendamento. 'auto' = enviado pelo sistema (no mock, simulado); 'manual' = a recepção abriu o WhatsApp.
 * Datas/horas em ISO. `resposta` só existe no automático (no manual, a resposta chega no WhatsApp da recepção).
 */
export interface ContatoWhats {
  modo: 'auto' | 'manual';
  confirmacaoEm?: string; lembreteEm?: string;
  resposta?: 'confirmou' | 'remarcar'; respostaEm?: string;
  /** já passou pela simulação de resposta (respondeu ou não). */
  processado?: boolean;
  /** a recepção já tratou o pedido de remarcação. */
  resolvido?: boolean;
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
  /** Encaixe: marcado fora da grade livre (pode sobrepor outro horário). */
  encaixe?: boolean;
  /** Contato pelo WhatsApp: confirmação do agendamento, lembrete da véspera e resposta do paciente. */
  whats?: ContatoWhats;
  criadoEm: string;
}

/** Registro clínico de um atendimento (prontuário). Só a médica vê. */
export interface Atendimento {
  id: string; agendamentoId: string; pacienteId: string; data: string;
  queixa: string; pa?: string; fc?: number; pesoKg?: number; alturaCm?: number;
  cid?: string; cidDescricao?: string; conduta: string;
  hda?: string; exameFisico?: string; examesSolicitados?: string[]; retornoDias?: number;
}

/** Resumo clínico do paciente (fica no prontuário; só a médica vê). */
export interface ResumoClinico { pacienteId: string; alergias: string; medicamentos: string[]; antecedentes: string[]; atualizadoEm: string }

export type TipoDocumento = 'atestado' | 'receita' | 'pedido_exames' | 'comparecimento';
/** Documento emitido (impresso em papel timbrado, assinado e carimbado à mão). */
export interface Documento { id: string; pacienteId: string; data: string; tipo: TipoDocumento; titulo: string; paragrafos: string[]; itens?: string[] }

/** `termos`: palavras do dia a dia para achar o CID pela situação (ex.: "dor no peito"). */
export interface Cid { codigo: string; descricao: string; grupo: string; termos?: string[] }

/** Uma apresentação do remédio no mercado: marca (vazio = genérico) e laboratório. */
export interface OpcaoLab { marca: string; laboratorio: string; tipo: 'referencia' | 'generico' | 'similar' }
/** Remédio do catálogo de busca da receita. `comercial`/`laboratorio` = marca de referência (vazio quando não cadastrada).
 *  `opcoes` = referência + genéricos/similares com o laboratório de cada um (base de exemplo; versão final: tabela CMED/ANVISA). */
export interface Medicamento { id: string; grupo: string; principio: string; comercial: string; laboratorio: string; doses: string[]; posologia: string; via: string; opcoes?: OpcaoLab[] }
/** Exame do catálogo de busca do pedido de exames. */
export interface ExameCatalogo { nome: string; grupo: string; preparo: string }

export type CategoriaDespesa = 'Aluguel e condomínio' | 'Pessoal' | 'Contas de consumo' | 'Serviços' | 'Material e insumos' | 'Equipamentos' | 'Impostos' | 'Marketing' | 'Outros';
/** Despesa da clínica. `data` é o vencimento; `pagaEm` quando foi paga. */
export interface Despesa { id: string; data: string; descricao: string; categoria: CategoriaDespesa; valor: number; status: 'paga' | 'a_pagar'; pagaEm?: string }

export interface Bloqueio { data: string; motivo: string }
export interface Feriado { data: string; nome: string }

export interface BaseClinica {
  clinica: Clinica;
  usuarios: Usuario[];
  servicos: Servico[];
  pacientes: Paciente[];
  agendamentos: Agendamento[];
  atendimentos: Atendimento[];
  resumos: ResumoClinico[];
  documentos: Documento[];
  despesas: Despesa[];
  cids: Cid[];
  bloqueios: Bloqueio[];
  feriados: Feriado[];
}
