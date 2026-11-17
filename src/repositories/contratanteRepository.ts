import { prisma } from "../lib/prisma.js";

export function listarContratantes() {
  return prisma.contratante.findMany({
    where: { shows: { some: {} } },
    orderBy: { nome: "asc" },
  });
}
