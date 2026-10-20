// Rotas. Sem login → tela de entrada. Cada página só abre se o perfil do usuário tiver permissão.
import type { ReactNode } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { DadosProvider } from './componentes/Dados';
import { Shell } from './componentes/Shell';
import { Vazio } from './componentes/Comuns';
import { repoMock } from './repositorio/repo-mock';
import { SessaoProvider, useSessao } from './acesso/Sessao';
import { PAGINAS } from './acesso/paginas';
import { Login } from './telas/Login';
import { Hoje } from './telas/Hoje';
import { Agenda } from './telas/Agenda';
import { Pacientes } from './telas/Pacientes';
import { PacienteFicha } from './telas/PacienteFicha';
import { PacienteCadastro } from './telas/PacienteCadastro';

const TELAS: Record<string, ReactNode> = { hoje: <Hoje />, agenda: <Agenda />, pacientes: <Pacientes /> };

function Rotas() {
  const s = useSessao();
  if (!s.usuario) return <Login />;
  const perfil = s.usuario.perfil;
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<Navigate to="/hoje" replace />} />
        {PAGINAS.map((p) => (
          <Route key={p.id} path={p.rota.slice(1)} element={p.perfis.includes(perfil) ? TELAS[p.id] : <Vazio>Sem permissão para abrir “{p.nome}”.</Vazio>} />
        ))}
        <Route path="pacientes/novo" element={<PacienteCadastro />} />
        <Route path="pacientes/:id" element={<PacienteFicha />} />
        <Route path="*" element={<Navigate to="/hoje" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <DadosProvider repo={repoMock}>
      <SessaoProvider>
        <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Rotas /></HashRouter>
      </SessaoProvider>
    </DadosProvider>
  );
}
