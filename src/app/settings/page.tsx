import { getSettingsData } from "@/server/queries";
import { EntityManager } from "@/components/entity-manager";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { departments, clients, tags, users } = await getSettingsData();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Cadastros</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Departamentos, clientes e tags usados nas tarefas.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <EntityManager
          kind="department"
          title="Departamentos"
          placeholder="Novo departamento…"
          items={departments.map((d) => ({
            id: d.id,
            name: d.name,
            active: d.active,
            count: d._count.tasks,
          }))}
        />
        <EntityManager
          kind="client"
          title="Clientes"
          placeholder="Novo cliente…"
          items={clients.map((c) => ({
            id: c.id,
            name: c.name,
            active: c.active,
            count: c._count.tasks,
          }))}
        />
        <EntityManager
          kind="tag"
          title="Tags"
          placeholder="Nova tag…"
          items={tags.map((t) => ({ id: t.id, name: t.name, count: t._count.tasks }))}
        />
      </div>

      <section className="rounded-xl border bg-card p-4">
        <h2 className="mb-3 font-semibold">Usuários</h2>
        <ul className="divide-y text-sm">
          {users.map((u) => (
            <li key={u.id} className="flex items-center justify-between py-2">
              <span>{u.name}</span>
              <span className="text-xs text-muted-foreground">{u.email}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">
          O MVP opera com um usuário padrão. A estrutura já suporta multiusuário.
        </p>
      </section>
    </div>
  );
}
