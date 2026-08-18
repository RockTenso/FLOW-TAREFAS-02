import { PrismaClient, TaskStatus, Importance, HistoryAction } from "@prisma/client";
import { formatTaskCode } from "../src/lib/task-code";

const prisma = new PrismaClient();

const TASK_COUNTER = "task";

async function nextTaskCode(): Promise<string> {
  const counter = await prisma.counter.update({
    where: { name: TASK_COUNTER },
    data: { value: { increment: 1 } },
  });
  return formatTaskCode(counter.value);
}

async function main() {
  // Contador de códigos de tarefa
  await prisma.counter.upsert({
    where: { name: TASK_COUNTER },
    update: {},
    create: { name: TASK_COUNTER, value: 0 },
  });

  // Usuário padrão
  const wesley = await prisma.user.upsert({
    where: { email: "wesley@taskflow.local" },
    update: { name: "Wesley" },
    create: { name: "Wesley", email: "wesley@taskflow.local" },
  });

  // Departamentos
  const departmentNames = [
    "Sistemas",
    "Implantação",
    "Suporte",
    "Financeiro",
    "Administrativo",
    "Comercial",
  ];
  const departments: Record<string, string> = {};
  for (const name of departmentNames) {
    const dept = await prisma.department.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    departments[name] = dept.id;
  }

  // Clientes fictícios
  const clientNames = ["7 Mares", "Sicoob", "Ancore", "Grupo Atlas", "Padaria Central"];
  const clients: Record<string, string> = {};
  for (const name of clientNames) {
    const client = await prisma.client.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    clients[name] = client.id;
  }

  // Tags
  const tagNames = [
    "boleto",
    "financeiro",
    "integração",
    "implantação",
    "urgente",
    "whatsapp",
    "sga",
  ];
  const tags: Record<string, string> = {};
  for (const name of tagNames) {
    const tag = await prisma.tag.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    tags[name] = tag.id;
  }

  // Só cria tarefas de demonstração se ainda não existir nenhuma
  const existingTasks = await prisma.task.count();
  if (existingTasks > 0) {
    console.log(`Já existem ${existingTasks} tarefas — pulando dados de demonstração.`);
    return;
  }

  const now = new Date();
  const atDay = (offset: number, hour = 18) => {
    const d = new Date(now);
    d.setDate(d.getDate() + offset);
    d.setHours(hour, 0, 0, 0);
    return d;
  };

  type DemoTask = {
    title: string;
    description?: string;
    status?: TaskStatus;
    importance: Importance;
    dueDate?: Date | null;
    estimatedMinutes?: number;
    department?: string;
    client?: string;
    tags?: string[];
    completed?: boolean;
  };

  async function createTask(data: DemoTask) {
    const taskCode = await nextTaskCode();
    const task = await prisma.task.create({
      data: {
        taskCode,
        title: data.title,
        description: data.description ?? null,
        status: data.status ?? TaskStatus.TODO,
        importance: data.importance,
        dueDate: data.dueDate ?? null,
        estimatedMinutes: data.estimatedMinutes ?? null,
        createdById: wesley.id,
        responsibleId: wesley.id,
        departmentId: data.department ? departments[data.department] : null,
        clientId: data.client ? clients[data.client] : null,
        completedAt: data.completed ? now : null,
        tags: data.tags
          ? { connect: data.tags.map((name) => ({ id: tags[name] })) }
          : undefined,
      },
    });
    await prisma.taskHistory.create({
      data: {
        taskId: task.id,
        userId: wesley.id,
        action: HistoryAction.TASK_CREATED,
      },
    });
    return task;
  }

  // FAZER AGORA (importante + urgente)
  await createTask({
    title: "Resolver divergência dos boletos da 7 Mares",
    description: "Validar os boletos pagos e identificar as divergências.",
    importance: Importance.HIGH,
    dueDate: atDay(0),
    department: "Financeiro",
    client: "7 Mares",
    tags: ["boleto", "financeiro"],
    estimatedMinutes: 60,
  });
  await createTask({
    title: "Conferir integração Pix",
    importance: Importance.HIGH,
    dueDate: atDay(0),
    department: "Sistemas",
    client: "Sicoob",
    tags: ["integração"],
    estimatedMinutes: 45,
  });
  await createTask({
    title: "Enviar relatório mensal ao cliente",
    description: "Relatório de indicadores do mês anterior.",
    importance: Importance.HIGH,
    dueDate: atDay(-2),
    department: "Financeiro",
    client: "Grupo Atlas",
    tags: ["financeiro"],
  });

  // PLANEJAR (importante + não urgente)
  await createTask({
    title: "Implantar nova tabela de preços",
    importance: Importance.HIGH,
    dueDate: atDay(6),
    department: "Implantação",
    client: "Ancore",
    tags: ["implantação"],
    estimatedMinutes: 120,
    status: TaskStatus.BACKLOG,
  });
  await createTask({
    title: "Planejar migração do servidor",
    importance: Importance.MEDIUM,
    dueDate: atDay(10),
    department: "Sistemas",
    client: "Ancore",
  });

  // DELEGAR (não importante + urgente)
  await createTask({
    title: "Responder e-mails de rotina",
    importance: Importance.LOW,
    dueDate: atDay(0),
    department: "Administrativo",
  });

  // ELIMINAR (não importante + não urgente)
  await createTask({
    title: "Organizar pasta antiga de arquivos",
    importance: Importance.LOW,
    dueDate: atDay(20),
    department: "Administrativo",
  });

  // Sem prazo (backlog)
  await createTask({
    title: "Levantar requisitos do módulo de relatórios",
    importance: Importance.MEDIUM,
    department: "Sistemas",
    client: "7 Mares",
    tags: ["sga"],
    status: TaskStatus.BACKLOG,
  });

  // Concluída com sessões de execução (alimenta o dashboard)
  const done = await createTask({
    title: "Configurar ambiente de homologação",
    importance: Importance.MEDIUM,
    dueDate: atDay(-1),
    department: "Sistemas",
    client: "Sicoob",
    status: TaskStatus.COMPLETED,
    completed: true,
    estimatedMinutes: 90,
  });
  const s1 = new Date(now); s1.setHours(9, 32, 0, 0);
  const e1 = new Date(now); e1.setHours(10, 17, 0, 0);
  const s2 = new Date(now); s2.setHours(11, 4, 0, 0);
  const e2 = new Date(now); e2.setHours(11, 32, 0, 0);
  await prisma.timeEntry.createMany({
    data: [
      {
        taskId: done.id,
        userId: wesley.id,
        startedAt: s1,
        endedAt: e1,
        durationSeconds: Math.round((e1.getTime() - s1.getTime()) / 1000),
      },
      {
        taskId: done.id,
        userId: wesley.id,
        startedAt: s2,
        endedAt: e2,
        durationSeconds: Math.round((e2.getTime() - s2.getTime()) / 1000),
      },
    ],
  });
  await prisma.taskHistory.create({
    data: {
      taskId: done.id,
      userId: wesley.id,
      action: HistoryAction.TASK_COMPLETED,
    },
  });

  const total = await prisma.task.count();
  console.log(`Seed concluído: ${total} tarefas de demonstração criadas.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
