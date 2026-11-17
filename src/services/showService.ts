import { z } from "zod";
import fs from "node:fs/promises";
import path from "node:path";
import { contratanteSchema } from "../lib/documentoFiscal.js";
import { normalizarHorarioTermino } from "../lib/showSchedule.js";
import * as showRepository from "../repositories/showRepository.js";
import { contractDirectory } from "../middleware/contractUpload.js";
import { uploadDirectory } from "../middleware/paymentUpload.js";

export {
  AgendaConflitoError,
  DocumentoContratanteConflictError,
} from "../repositories/showRepository.js";

const showSchema = z.object({
  titulo: z.string().trim().min(1),
  cidade: z.string().trim().min(1),
  data: z.iso.datetime({ offset: true }),
  dataFim: z.iso.datetime({ offset: true }),
  tipoLocal: z.enum(["PUBLICO", "PRIVADO"]),
  responsavelVenda: z.string().trim().min(1),
  status: z.enum(["CONFIRMADO", "EM_REVISAO", "CANCELADO", "REALIZADO"]).default("CONFIRMADO"),
  valorShow: z.coerce.number().min(0),
  valorCusto: z.coerce.number().min(0).default(0),
  tipoEntrada: z.enum(["VALOR", "PERCENTUAL"]).nullable().optional(),
  valorEntrada: z.preprocess(
    (value) => value === "" || value === null ? null : value,
    z.coerce.number().min(0).nullable(),
  ).optional(),
  numeroParcelas: z.preprocess(
    (value) => value === "" || value === null ? null : value,
    z.coerce.number().int().min(1).nullable(),
  ).optional(),
  pagamentosPrevistos: z.array(z.object({
    descricao: z.string().trim().min(1).max(100),
    valor: z.coerce.number().positive().refine(
      (value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-8,
      "O valor previsto deve ter no máximo duas casas decimais.",
    ),
    quantidade: z.coerce.number().int().min(1).max(500).default(1),
    dataPrevista: z.iso.date().nullable().optional(),
  })).max(50).optional(),
  observacoes: z.string().trim().max(500).nullable().optional(),
  contratanteId: z.coerce.number().int().positive().nullable().optional(),
  contratante: contratanteSchema.optional(),
  localEvento: z.string().trim().max(200).nullable().optional(),
  localId: z.coerce.number().int().positive().nullable().optional(),
}).refine((show) => new Date(show.dataFim) > new Date(show.data), {
  message: "O horário de término deve ser posterior ao horário de início.",
  path: ["dataFim"],
}).superRefine((show, context) => {
  const hasPlanData = show.tipoEntrada != null || show.valorEntrada != null || show.numeroParcelas != null || (show.pagamentosPrevistos?.length ?? 0) > 0;
  if (!hasPlanData) return;

  if (!show.tipoEntrada || show.valorEntrada == null) {
    context.addIssue({
      code: "custom",
      message: "Informe o tipo e o valor da entrada.",
      path: ["valorEntrada"],
    });
    return;
  }

  if (show.tipoEntrada === "PERCENTUAL" && show.valorEntrada > 100) {
    context.addIssue({
      code: "custom",
      message: "O percentual da entrada não pode ultrapassar 100%.",
      path: ["valorEntrada"],
    });
  }
  if (show.tipoEntrada === "PERCENTUAL" && show.valorEntrada < 10) {
    context.addIssue({
      code: "custom",
      message: "O percentual da entrada deve ser de pelo menos 10%.",
      path: ["valorEntrada"],
    });
  }

  const entradaEmCentavos = show.tipoEntrada === "PERCENTUAL"
    ? Math.round(Math.round(show.valorShow * 100) * show.valorEntrada / 100)
    : Math.round(show.valorEntrada * 100);
  if (entradaEmCentavos > Math.round(show.valorShow * 100)) {
    context.addIssue({
      code: "custom",
      message: "A entrada não pode ultrapassar o valor fechado do show.",
      path: ["valorEntrada"],
    });
  }
  if (show.numeroParcelas === 1 && entradaEmCentavos < Math.round(show.valorShow * 100)) {
    context.addIssue({
      code: "custom",
      message: "Com parcelas totais igual a 1, a entrada deve cobrir o valor total do show.",
      path: ["numeroParcelas"],
    });
  }
  if (show.numeroParcelas != null && show.numeroParcelas > 1 && entradaEmCentavos >= Math.round(show.valorShow * 100)) {
    context.addIssue({
      code: "custom",
      message: "A entrada já cobre o valor total; informe uma parcela ou reduza a entrada.",
      path: ["numeroParcelas"],
    });
  }

  const totalPrevistoEmCentavos = entradaEmCentavos + (show.pagamentosPrevistos ?? []).reduce(
    (total, pagamento) => total + Math.round(pagamento.valor * 100) * pagamento.quantidade,
    0,
  );
  if (totalPrevistoEmCentavos > Math.round(show.valorShow * 100)) {
    context.addIssue({
      code: "custom",
      message: "A entrada e os pagamentos combinados não podem ultrapassar o valor do show.",
      path: ["pagamentosPrevistos"],
    });
  }

});

export async function listarShows() {
  return showRepository.listarShows();
}

export async function listarAgendaResumida() {
  return showRepository.listarAgendaResumida();
}

export async function criarShow(input: unknown) {
  const dados = showSchema.parse(normalizarHorarioTermino(input));
  return showRepository.criarShow(dados);
}

export async function atualizarShow(id: number, input: unknown) {
  const dados = showSchema.parse(normalizarHorarioTermino(input));
  return showRepository.atualizarShow(id, dados);
}

export async function removerShow(id: number) {
  const show = await showRepository.removerShow(id);
  for (const pagamento of show.pagamentos) {
    if (!pagamento.comprovantePath || path.basename(pagamento.comprovantePath) !== pagamento.comprovantePath) continue;
    try {
      await fs.unlink(path.resolve(uploadDirectory, pagamento.comprovantePath));
    } catch (error) {
      if (!isMissingFile(error)) {
        console.error("Show removido, mas não foi possível apagar um arquivo de comprovante.", error);
      }
    }
  }
  for (const contrato of show.contratos) {
    if (!contrato.arquivoPath || path.basename(contrato.arquivoPath) !== contrato.arquivoPath) continue;
    try {
      await fs.unlink(path.resolve(contractDirectory, contrato.arquivoPath));
    } catch (error) {
      if (!isMissingFile(error)) {
        console.error("Show removido, mas não foi possível apagar um arquivo de contrato.", error);
      }
    }
  }
  return show;
}

function isMissingFile(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
