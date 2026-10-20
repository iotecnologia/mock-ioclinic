// Contrato de acesso aos dados. Telas e regras só conversam com isto.
// Hoje: repo-mock.ts (base fictícia gerada no navegador). Fase 3: repo-api.ts (backend io-clinic: Node + PostgreSQL),
// e aí cada tela busca só o que precisa, na hora — dado de paciente nunca é carregado em lote no navegador.
import type { BaseClinica } from '../tipos/modelos';

export interface Repositorio {
  carregar(): Promise<BaseClinica>;
}
