import { z } from "zod";
import * as pagamentoRepository from "../repositories/pagamentoRepository.js";

const pagamentoSchema = z.object({
  valor: z.coerce.number().positive().refine(
    (value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-8,
    "O valor do pagamento deve ter no máximo duas casas decimais.",
  ),
  dataPagamento: z.iso.datetime({ offset: true }).optional(),
});

export async function registrarPagamento(
  showId: number,
  input: unknown,
  comprovante?: Express.Multer.File,
) {
  const dados = pagamentoSchema.parse(input);
  return pagamentoRepository.registrarPagamento(
    showId,
    dados.valor,
    dados.dataPagamento ? new Date(dados.dataPagamento) : new Date(),
    comprovante,
  );
}

export async function listarPagamentos(showId: number) {
  return pagamentoRepository.listarPagamentos(showId);
}

export async function buscarPagamento(id: number) {
  return pagamentoRepository.buscarPagamento(id);
}

export async function removerPagamento(id: number) {
  return pagamentoRepository.removerPagamento(id);
}
