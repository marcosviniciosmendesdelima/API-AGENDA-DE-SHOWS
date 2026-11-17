import { prisma } from "../lib/prisma.js";

export async function registrarPagamento(
  showId: number,
  valor: number,
  dataPagamento: Date,
  comprovante?: Express.Multer.File,
) {
  return prisma.$transaction(async (transaction) => {
    const show = await transaction.show.findUnique({
      where: { id: showId },
      select: { valorShow: true },
    });
    if (!show) throw new Error("Show não encontrado.");

    const pagamentos = await transaction.pagamento.aggregate({
      where: { showId },
      _sum: { valor: true },
    });
    const recebido = Number(pagamentos._sum.valor ?? 0);
    const saldo = Math.round((Number(show.valorShow) - recebido) * 100) / 100;
    if (saldo <= 0) {
      throw new Error("O show já está quitado; não é permitido adicionar novos pagamentos ou comprovantes.");
    }
    if (valor > saldo) throw new Error("O pagamento não pode ultrapassar o saldo restante do show.");

    return transaction.pagamento.create({
      data: {
        showId,
        valor,
        dataPagamento,
        comprovantePath: comprovante?.filename ?? null,
        comprovanteNome: comprovante?.originalname ?? null,
        comprovanteTipo: comprovante?.mimetype ?? null,
      },
    });
  }, { isolationLevel: "Serializable" });
}

export function listarPagamentos(showId: number) {
  return prisma.pagamento.findMany({
    where: { showId },
    orderBy: [{ dataPagamento: "desc" }, { id: "desc" }],
  });
}

export function buscarPagamento(id: number) {
  return prisma.pagamento.findUnique({ where: { id } });
}

export function removerPagamento(id: number) {
  return prisma.pagamento.delete({ where: { id } });
}
