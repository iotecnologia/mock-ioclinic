# IO Clinic — mock funcional (apresentação)

Sistema de gestão para clínica médica, no mesmo padrão do Analiza (React + Vite + TypeScript).
Este é o **mock de apresentação**: roda só no navegador, com **dados fictícios** gerados a partir da data de hoje
(a agenda do dia sempre aparece cheia). Nada é salvo: recarregou a página, volta ao início.

Na versão final, a camada `repositorio/` passa a buscar os dados no backend **io-clinic** (Node + Express + PostgreSQL),
sem refazer as telas.

## Como rodar

Requisito: Node 20 ou superior.

```bash
npm install        # instala as dependências
npm run dev        # abre em http://localhost:5173
npm test           # roda os testes das regras (agenda, disponibilidade, paciente, base fictícia)
npm run build      # gera a versão final em dist/
```

## Publicar no GitHub Pages

1. Suba o projeto para o repositório (branch `main`).
2. No GitHub: **Settings → Pages → Source: GitHub Actions**.
3. A cada envio para `main`, o workflow `.github/workflows/deploy.yml` roda os testes, gera o build e publica.
   Se um teste falhar, nada é publicado.

## Acesso de demonstração

Na tela de entrada, use os botões **Recepção** ou **Dra. Flávia** (qualquer senha serve no mock).

| Perfil | E-mail | O que vê |
|---|---|---|
| Recepção | recepcao@ioclinic.exemplo | Hoje, Agenda, Pacientes (sem conteúdo clínico), Orçamento |
| Dra. Flávia | flavia@ioclinic.exemplo | Tudo, inclusive conteúdo clínico, Prontuário, Financeiro, Relatórios, Painel (BI), Usuários |

Itens foscos no menu entram nas próximas entregas.

## Roteiro sugerido para a apresentação

1. **Entrar como Recepção.** Mostrar a tela **Hoje**: quem vem hoje, quem já chegou, quem falta pagar,
   os próximos dias e a lista **Para fazer** (confirmar pacientes de amanhã pelo WhatsApp).
2. Em um paciente da agenda: marcar **chegou** e depois **receber pagamento** (PIX/dinheiro com 5% de desconto).
3. **Novo agendamento** (botão **+**): buscar o paciente → escolher o serviço → o calendário mostra só os dias e
   horários livres (consulta de 1h não atravessa o almoço, feriados e bloqueios fechados) → confirmar →
   **enviar confirmação pelo WhatsApp**.
4. **Agenda**: visão do dia (horário livre com **+** para agendar ali mesmo) e visão da **semana**.
5. **Pacientes**: busca por nome, CPF ou telefone; filtro **Revisão anual** (pacientes sem consulta há mais de 1 ano);
   **cadastro novo** com validação de CPF, busca de CEP e termo LGPD obrigatório.
6. Abrir a **ficha** de um paciente: linha do tempo com consultas, exames e pagamentos.
   Destacar o aviso: *conteúdo clínico visível só para a médica (LGPD)*.
7. **Sair e entrar como Dra. Flávia.** O menu muda (Prontuário, Financeiro, Relatórios, BI, Usuários).
   Em **Hoje** aparece o **próximo paciente** com a última consulta (CID e pressão).
   Na ficha do paciente, a linha do tempo agora mostra a **evolução clínica**.

## Estrutura

```
io-clinic-mock/
├── index.html · package.json · tsconfig.json · vite.config.ts
├── .github/workflows/deploy.yml   CI: testes → build → GitHub Pages
├── public/favicon.svg
├── src/
│   ├── main.tsx / App.tsx         entrada e rotas (cada rota confere o perfil)
│   ├── dados/                     1. DADOS — clínica (horários), serviços e preços, usuários, feriados (JSON)
│   ├── tipos/modelos.ts           tipos de todas as tabelas
│   ├── repositorio/               2. REPOSITÓRIO — de onde vêm os dados
│   │   ├── repositorio.ts             contrato: carregar(): Promise<BaseClinica>
│   │   ├── gerador.ts                 base fictícia (200 pacientes, ~4 meses de agenda, prontuários)
│   │   └── repo-mock.ts               implementação atual. Fase 3: repo-api.ts (backend io-clinic)
│   ├── regras/                    3. REGRAS — funções puras, sem tela, testadas
│   │   ├── disponibilidade.ts         dias de atendimento, feriados, bloqueios, horários livres, grade do dia
│   │   ├── agenda.ts                  status, próximos passos, contadores, próximo paciente
│   │   └── paciente.ts                idade, busca sem acento, histórico (recepção x médica), resumo
│   ├── acesso/                    sessão (login do mock) e catálogo de páginas por perfil
│   ├── componentes/               4. TELA — Shell, calendário, linha da agenda, novo agendamento, receber, formulário
│   ├── telas/                     4. TELA — Login, Hoje, Agenda, Pacientes, Ficha, Cadastro
│   ├── estilos/                   clinica.css (tema e estrutura) + telas.css (peças das telas)
│   └── util/                      datas e formatos (moeda, CPF, telefone, WhatsApp)
└── tests/                         Vitest: disponibilidade, paciente/LGPD, base fictícia
```

Regra das camadas: **tela só chama `regras/`**, **`regras/` só recebe dados**, e só o `repositorio/` sabe de onde
os dados vêm.

## Regras de negócio usadas no mock

- Atendimento seg–sex 08:00–12:00 e 13:00–18:00; sábado 08:00–12:00; domingo fechado
  (**horários de exemplo** — ajustar em `src/dados/clinica.json`).
- Consulta e retorno: 1h. Exames: 30 min. Grade de 30 min.
- Retorno até 30 dias sem custo. PIX ou dinheiro com 5% de desconto.
- **Valores ilustrativos** em `src/dados/servicos.json` — substituir pelos valores da Dra.
- Feriados nacionais e de Campinas em `src/dados/feriados.json`.

## LGPD

- Todos os pacientes são **fictícios**. Nenhum dado é gravado no navegador (só a preferência de tema).
- A recepção não vê conteúdo clínico (evolução, CID, conduta); só a médica.
- CPF aparece parcialmente oculto nas listas.
- Cadastro só é salvo com o termo de consentimento aceito.

## Próximas entregas do mock

Prontuário (com atestado e receita) · Orçamento · Financeiro (receitas e despesas) · Relatórios · Painel (BI) · Usuários.
