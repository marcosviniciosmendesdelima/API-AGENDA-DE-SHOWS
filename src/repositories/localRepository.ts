import { z } from "zod";
import { prisma } from "../lib/prisma.js";

const localSchema = z.object({
  nome: z.string().trim().min(1),
  endereco: z.string().trim().min(1),
  cidade: z.string().trim().min(1),
  capacidade: z.coerce.number().int().positive().nullable().optional(),
});

export function listarLocais() {
  return prisma.local.findMany({
    orderBy: { nome: "asc" },
  });
}

export function criarLocal(input: unknown) {
  const dados = localSchema.parse(input);
  return prisma.local.create({
    data: {
      nome: dados.nome,
      endereco: dados.endereco,
      cidade: dados.cidade,
      capacidade: dados.capacidade ?? null,
    },
  });
}
