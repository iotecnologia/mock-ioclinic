// Implementação do mock: gera a base fictícia relativa ao dia de hoje. Nada é salvo no navegador:
// o que for criado na apresentação some ao recarregar a página (volta ao estado inicial).
import type { Repositorio } from './repositorio';
import { gerarBase } from './gerador';
import { agoraMin, hoje } from '../util/datas';

export const repoMock: Repositorio = {
  async carregar() {
    return gerarBase(hoje(), agoraMin());
  },
};
