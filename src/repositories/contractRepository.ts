import { prisma } from "../lib/prisma.js";

const contractSummary = {
  id: true,
  showId: true,
  nome: true,
  arquivoTipo: true,
  tamanhoBytes: true,
  createdAt: true,
};

export class ContractShowNotFoundError extends Error {
  constructor() {
    super("Show não encontrado.");
    this.name = "ContractShowNotFoundError";
  }
}

export class ContractNotFoundError extends Error {
  constructor() {
    super("Contrato não encontrado.");
    this.name = "ContractNotFoundError";
  }
}

export async function criarContratos(
  showId: number,
  files: Express.Multer.File[],
) {
  return prisma.$transaction(async (transaction) => {
    const show = await transaction.show.findUnique({
      where: { id: showId },
      select: { id: true },
    });
    if (!show) throw new ContractShowNotFoundError();

    await transaction.contrato.createMany({
      data: files.map((file) => ({
        showId,
        nome: file.originalname,
        arquivoPath: file.filename,
        arquivoTipo: "application/pdf",
        tamanhoBytes: file.size,
      })),
    });

    return transaction.contrato.findMany({
      where: { arquivoPath: { in: files.map((file) => file.filename) } },
      select: contractSummary,
      orderBy: { id: "asc" },
    });
  });
}

export async function listarContratos(showId: number) {
  const show = await prisma.show.findUnique({
    where: { id: showId },
    select: { id: true },
  });
  if (!show) throw new ContractShowNotFoundError();

  return prisma.contrato.findMany({
    where: { showId },
    select: contractSummary,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
}

export function buscarContrato(id: number) {
  return prisma.contrato.findUnique({ where: { id } });
}

export async function removerContrato(id: number) {
  try {
    return await prisma.contrato.delete({ where: { id } });
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "P2025"
    ) {
      throw new ContractNotFoundError();
    }
    throw error;
  }
}
