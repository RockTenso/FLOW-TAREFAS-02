# TaskFlow — Gestão de execução

Aplicação web **local** de gestão de tarefas com **Matriz de Eisenhower** e
**controle de tempo de execução** (PLAY/PAUSE). A proposta não é apenas gerenciar
tarefas — é medir a execução: **Planejar → Executar → Medir → Concluir**.

Cada tarefa tem um **código amigável e imutável** (`TF-000001`), **histórico de
auditoria** de todas as alterações e **sessões de execução** cronometradas cuja
fonte de verdade é o banco (atualizar a página nunca perde o tempo).

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend / Backend | Next.js 16 (App Router) + React 19 + TypeScript |
| UI | Tailwind CSS v4 + shadcn/ui + Lucide |
| Formulários / Validação | React Hook Form + Zod |
| Drag & Drop | dnd-kit (Kanban) |
| ORM | Prisma 6 |
| Banco | PostgreSQL 16 (via Docker) |
| Testes | Vitest |

---

## Pré-requisitos

- **Node.js 20+** (testado com Node 24) e **npm**
- **Docker Desktop** em execução (para o PostgreSQL)

Verifique:

```bash
node --version
docker --version
```

---

## Como executar (passo a passo)

### 1. Instalar dependências

```bash
npm install
```

> O `postinstall` já roda `prisma generate` automaticamente.

### 2. Configurar variáveis de ambiente

O arquivo `.env` já vem pronto para o ambiente local (veja `.env.example`). Ele
aponta para o banco que sobe via Docker:

```
DATABASE_URL="postgresql://taskflow:taskflow@localhost:5432/taskflow?schema=public"
```

### 3. Subir o banco (PostgreSQL em Docker)

```bash
docker compose up -d
```

(ou `npm run db:up`). Os dados ficam num volume Docker (`taskflow_pgdata`), então
persistem entre reinícios.

### 4. Criar as tabelas (migrations)

```bash
npm run db:migrate
```

### 5. Popular dados de demonstração (seed)

```bash
npm run db:seed
```

Cria o usuário padrão **Wesley**, departamentos, clientes, tags e tarefas de
exemplo cobrindo todos os quadrantes da matriz.

### 6. Iniciar a aplicação

```bash
npm run dev
```

Abra **http://localhost:3000**.

---

## Scripts disponíveis

| Script | O que faz |
|---|---|
| `npm run dev` | Inicia a aplicação em desenvolvimento |
| `npm run build` | Build de produção (checa TypeScript + ESLint) |
| `npm run start` | Roda o build de produção |
| `npm run lint` | ESLint |
| `npm test` | Executa os testes (Vitest) |
| `npm run db:up` / `db:down` | Sobe / derruba o PostgreSQL (Docker) |
| `npm run db:migrate` | Aplica migrations (Prisma) |
| `npm run db:seed` | Popula dados de demonstração |
| `npm run db:reset` | **Recria** o banco do zero e roda o seed |
| `npm run db:studio` | Abre o Prisma Studio (inspeção do banco) |

---

## Funcionalidades

- **Dashboard** operacional: pendentes, para hoje, atrasadas, tempo hoje,
  concluídas, seções _Fazer agora_ / _Planejar_ e destaque da tarefa em execução.
- **Matriz de Eisenhower**: importância definida pelo usuário; urgência calculada
  automaticamente pelo prazo.
- **Kanban** com drag & drop (dnd-kit) respeitando as regras de execução.
- **Lista** com busca global (código TF, título, cliente, responsável, tag…) e
  filtros (status, importância, responsável, departamento, cliente, tag) + filtros
  rápidos (Minhas, Hoje, Atrasadas, Em execução, Concluídas).
- **PLAY / PAUSE / CONTINUAR** com registro de sessões e cronômetro persistente.
- **Regra de execução única**: apenas uma tarefa em execução por usuário (com
  confirmação para trocar).
- **Histórico de auditoria** por tarefa (criação, alterações, execução, conclusão)
  — não editável.
- **Cadastros** de departamentos, clientes e tags.

### Regras de execução (importantes)

- **Uma sessão por vez**: iniciar uma segunda tarefa pergunta se deve pausar a atual.
- **Cronômetro à prova de F5**: o tempo decorrido é sempre `agora - startedAt`
  (fonte de verdade no banco), então recarregar a página não zera nada.
- **Sessões preservadas**: cada PLAY/PAUSE grava uma `TimeEntry` própria; o tempo
  total é a soma das sessões.

---

## Modelo de dados (resumo)

`User`, `Department`, `Client`, `Tag`, `Task`, `TimeEntry`, `TaskHistory`,
`Comment` e `Counter` (gera o `taskCode` sequencial de forma atômica).

Cada `Task` possui **ID técnico** (cuid, imutável, usado nas relações) e
**código amigável** `TF-000001` (imutável, pesquisável). Consulte o schema
completo em [`prisma/schema.prisma`](prisma/schema.prisma).

---

## Testes

```bash
npm test
```

Cobrem as regras de negócio puras: cálculo de urgência e quadrante da matriz,
soma de tempo das sessões e formatação do código da tarefa.

---

## Troubleshooting

- **`Can't reach database server at localhost:5432`** — o Docker Desktop não está
  rodando ou o container caiu. Rode `docker compose up -d` e confira com
  `docker compose ps`.
- **`Usuário padrão não encontrado`** — falta rodar o seed: `npm run db:seed`.
- **Porta 3000 ocupada** — feche o processo na porta ou rode `next dev -p 3001`.
- **Quer recomeçar do zero** — `npm run db:reset` recria o banco e roda o seed.
- **Prisma Client desatualizado** — rode `npm run prisma:generate`.

---

## Critério de conclusão do MVP

O MVP está concluído quando um usuário consegue **criar** uma tarefa, **atribuir**
responsável, associar **cliente/departamento/tags**, definir **prazo** e
**importância**, visualizar na **Matriz de Eisenhower**, **iniciar e pausar** a
execução, **concluir** a tarefa e consultar todo o **histórico de alterações e o
tempo investido** — com o banco **PostgreSQL rodando em Docker**.
