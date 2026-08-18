import { prisma } from "./prisma";

/**
 * MVP sem autenticação: usamos um único usuário padrão criado no seed.
 * A arquitetura já suporta multiusuário (todas as relações usam userId).
 */
export const DEFAULT_USER_EMAIL = "wesley@taskflow.local";

export async function getCurrentUser() {
  const user = await prisma.user.findUnique({
    where: { email: DEFAULT_USER_EMAIL },
  });
  if (!user) {
    throw new Error(
      "Usuário padrão não encontrado. Execute `npm run db:seed` para criar os dados iniciais.",
    );
  }
  return user;
}
