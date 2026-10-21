// Rotas. Sem login → tela de entrada. Cada página só abre se o perfil do usuário tiver permissão.
import { useCallback, useState, type ReactNode } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { DadosProvider } from './componentes/Dados';
import { Shell } from './componentes/Shell';
import { Vazio } from './componentes/Comuns';
import { Abertura } from './componentes/Abertura';
import { repoMock } from './repositorio/repo-mock';
import { SessaoProvider, useSessao } from './acesso/Sessao';
import { PAGINAS } from './acesso/paginas';
import { Login } from './telas/Login';
import { Hoje } from './telas/Hoje';
import { Agenda } from './telas/Agenda';
import { Pacientes } from './telas/Pacientes';
import { PacienteFicha } from './telas/PacienteFicha';
import { PacienteCadastro } from './telas/PacienteCadastro';
import { Prontuario } from './telas/Prontuario';
import { ProntuarioPaciente } from './telas/ProntuarioPaciente';
import { Orcamento } from './telas/Orcamento';
import { Financeiro } from './telas/Financeiro';
import { Relatorios } from './telas/Relatorios';
import { Painel } from './telas/Painel';

const TELAS: Record<string, ReactNode> = { hoje: <Hoje />, agenda: <Agenda />, pacientes: <Pacientes />, prontuario: <Prontuario />, orcamento: <Orcamento />,
  financeiro: <Financeiro />, relatorios: <Relatorios />, painel: <Painel /> };

// Já estava logado quando a página abriu (recarregou)? Então a abertura é rápida. Depois do 1º uso, vale o login normal.
let sessaoAoAbrir = (() => { try { return !!sessionStorage.getItem('ioclinic:sessao'); } catch { return false; } })();

function Rotas() {
  const s = useSessao();
  if (!s.usuario) return <Login />;
  return <AreaLogada key={s.usuario.email} />;
}

/** Depois do login: carrega os dados (por baixo) enquanto a tela de abertura roda; no fim, mostra o sistema. */
function AreaLogada() {
  const s = useSessao();
  const [rapida] = useState(() => { const r = sessaoAoAbrir; sessaoAoAbrir = false; return r; });
  const [dados, setDados] = useState(false);
  const [aberto, setAberto] = useState(false);
  const fim = useCallback(() => setAberto(true), []);
  const u = s.usuario!;
  return (
    <>
      <DadosProvider repo={repoMock} aoCarregar={() => setDados(true)}>
        {aberto && <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Telas /></HashRouter>}
      </DadosProvider>
      {!aberto && <Abertura nome={u.nome} perfil={u.perfil} dadosProntos={dados} rapida={rapida} fim={fim} />}
    </>
  );
}

function Telas() {
  const s = useSessao();
  const perfil = s.usuario!.perfil;
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<Navigate to="/hoje" replace />} />
        {PAGINAS.map((p) => (
          <Route key={p.id} path={p.rota.slice(1)} element={p.perfis.includes(perfil) ? TELAS[p.id] : <Vazio>Sem permissão para abrir “{p.nome}”.</Vazio>} />
        ))}
        <Route path="pacientes/novo" element={<PacienteCadastro />} />
        <Route path="pacientes/:id" element={<PacienteFicha />} />
        <Route path="prontuario/:id" element={perfil === 'medica' ? <ProntuarioPaciente /> : <Vazio>O prontuário é exclusivo da médica (LGPD: dado sensível de saúde).</Vazio>} />
        <Route path="*" element={<Navigate to="/hoje" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <SessaoProvider>
      <Rotas />
    </SessaoProvider>
  );
}
