import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { contratanteSchema } from "../lib/documentoFiscal.js";
import { normalizarHorarioTermino } from "../lib/showSchedule.js";
import { prisma } from "../lib/prisma.js";

const showSchema = z.object({
  titulo: z.string().trim().min(1),
  cidade: z.string().trim().min(1),
  data: z.iso.datetime({ offset: true }).or(z.coerce.date()),
  dataFim: z.iso.datetime({ offset: true }).or(z.coerce.date()),
  tipoLocal: z.enum(["PUBLICO", "PRIVADO"]),
  status: z.enum(["CONFIRMADO", "EM_REVISAO", "CANCELADO", "REALIZADO"]).default("CONFIRMADO"),
  responsavelVenda: z.string().trim().min(1),
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
    context.addIssue({ code: "custom", message: "O percentual da entrada não pode ultrapassar 100%.", path: ["valorEntrada"] });
  }
  if (show.tipoEntrada === "PERCENTUAL" && show.valorEntrada < 10) {
    context.addIssue({ code: "custom", message: "O percentual da entrada deve ser de pelo menos 10%.", path: ["valorEntrada"] });
  }
  const entradaEmCentavos = show.tipoEntrada === "PERCENTUAL"
    ? Math.round(Math.round(show.valorShow * 100) * show.valorEntrada / 100)
    : Math.round(show.valorEntrada * 100);
  if (entradaEmCentavos > Math.round(show.valorShow * 100)) {
    context.addIssue({ code: "custom", message: "A entrada não pode ultrapassar o valor fechado do show.", path: ["valorEntrada"] });
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

export class AgendaConflitoError extends Error {
  constructor(titulo: string) {
    super(`Este horário já está ocupado pelo show "${titulo}". Escolha outro horário.`);
    this.name = "AgendaConflitoError";
  }
}

export class DocumentoContratanteConflictError extends Error {
  constructor() {
    super("Este número de documento já está cadastrado com outro tipo.");
    this.name = "DocumentoContratanteConflictError";
  }
}

export function listarShows() {
  return prisma.show.findMany({
    include: {
      contratante: true,
      local: true,
      pagamentos: true,
      pagamentosPrevistos: { orderBy: [{ dataPrevista: "asc" }, { id: "asc" }] },
      contratos: {
        select: {
          id: true,
          showId: true,
          nome: true,
          arquivoTipo: true,
          tamanhoBytes: true,
          createdAt: true,
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      },
    },
    orderBy: { data: "asc" },
  });
}

export function listarAgendaResumida() {
  return prisma.show.findMany({
    select: {
      id: true,
      titulo: true,
      cidade: true,
      data: true,
      dataFim: true,
      status: true,
      localEvento: true,
      local: { select: { nome: true } },
    },
    orderBy: { data: "asc" },
  });
}

export function criarShow(input: unknown) {
  const payload = showSchema.parse(normalizarHorarioTermino(input));

  return prisma.$transaction(async (transaction) => {
    const data = new Date(payload.data);
    const dataFim = new Date(payload.dataFim);
    await validarDisponibilidade(transaction, data, dataFim, payload.status);
    const contratanteId = await salvarContratante(transaction, payload.contratante, payload.contratanteId);
    return transaction.show.create({
      data: {
        titulo: payload.titulo,
        cidade: payload.cidade,
        data,
        dataFim,
        tipoLocal: payload.tipoLocal,
        responsavelVenda: payload.responsavelVenda,
        status: payload.status,
        valorShow: payload.valorShow,
        valorCusto: payload.valorCusto,
        tipoEntrada: payload.tipoEntrada ?? null,
        valorEntrada: payload.valorEntrada ?? null,
        numeroParcelas: payload.numeroParcelas ?? null,
        inicioPlanoPagamento: payload.numeroParcelas == null ? null : new Date(),
        ...(payload.pagamentosPrevistos === undefined ? {} : {
          pagamentosPrevistos: {
            create: mapPagamentosPrevistos(payload),
          },
        }),
        observacoes: payload.observacoes ?? null,
        localEvento: payload.localEvento ?? null,
        ...(contratanteId === null ? {} : { contratante: { connect: { id: contratanteId } } }),
        ...(payload.localId == null ? {} : { local: { connect: { id: payload.localId } } }),
      },
      include: {
        contratante: true,
        local: true,
        pagamentos: true,
        pagamentosPrevistos: { orderBy: [{ dataPrevista: "asc" }, { id: "asc" }] },
        contratos: {
          select: {
            id: true,
            showId: true,
            nome: true,
            arquivoTipo: true,
            tamanhoBytes: true,
            createdAt: true,
          },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        },
      },
    });
  });
}

export function atualizarShow(id: number, input: unknown) {
  const payload = showSchema.parse(normalizarHorarioTermino(input));

  return prisma.$transaction(async (transaction) => {
    const showAtual = await transaction.show.findUnique({
      where: { id },
      select: {
        tipoEntrada: true,
        valorEntrada: true,
        numeroParcelas: true,
        inicioPlanoPagamento: true,
      },
    });
    if (!showAtual) throw new Error("Show não encontrado.");

    const data = new Date(payload.data);
    const dataFim = new Date(payload.dataFim);
    await validarDisponibilidade(transaction, data, dataFim, payload.status, id);

    const recebimentos = await transaction.pagamento.aggregate({
      where: { showId: id },
      _sum: { valor: true },
    });
    if (Number(recebimentos._sum.valor ?? 0) > payload.valorShow) {
      throw new Error("O valor do show não pode ficar abaixo do total já recebido.");
    }
    const contratanteId = await salvarContratante(transaction, payload.contratante, payload.contratanteId);
    const atualizouPlano =
      payload.tipoEntrada !== undefined ||
      payload.valorEntrada !== undefined ||
      payload.numeroParcelas !== undefined;
    const mesmoPlano =
      showAtual.tipoEntrada === (payload.tipoEntrada ?? null) &&
      Number(showAtual.valorEntrada ?? 0) === Number(payload.valorEntrada ?? 0) &&
      showAtual.numeroParcelas === (payload.numeroParcelas ?? null);
    const inicioPlanoPagamento = !atualizouPlano
      ? showAtual.inicioPlanoPagamento
      : payload.numeroParcelas == null
        ? null
        : mesmoPlano
          ? showAtual.inicioPlanoPagamento ?? new Date()
          : new Date();
    return transaction.show.update({
      where: { id },
      data: {
        titulo: payload.titulo,
        cidade: payload.cidade,
        data,
        dataFim,
        tipoLocal: payload.tipoLocal,
        responsavelVenda: payload.responsavelVenda,
        status: payload.status,
        valorShow: payload.valorShow,
        valorCusto: payload.valorCusto,
        inicioPlanoPagamento,
        ...(atualizouPlano
          ? {
              tipoEntrada: payload.tipoEntrada ?? null,
              valorEntrada: payload.valorEntrada ?? null,
              numeroParcelas: payload.numeroParcelas ?? null,
            }
          : {}),
        ...(payload.pagamentosPrevistos === undefined ? {} : {
          pagamentosPrevistos: {
            deleteMany: {},
            create: mapPagamentosPrevistos(payload),
          },
        }),
        observacoes: payload.observacoes ?? null,
        localEvento: payload.localEvento ?? null,
        contratante: contratanteId === null
          ? { disconnect: true }
          : { connect: { id: contratanteId } },
        local: payload.localId == null
          ? { disconnect: true }
          : { connect: { id: payload.localId } },
      },
      include: {
        contratante: true,
        local: true,
        pagamentos: true,
        pagamentosPrevistos: { orderBy: [{ dataPrevista: "asc" }, { id: "asc" }] },
        contratos: {
          select: {
            id: true,
            showId: true,
            nome: true,
            arquivoTipo: true,
            tamanhoBytes: true,
            createdAt: true,
          },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        },
      },
    });
  });
}

function mapPagamentosPrevistos(payload: z.infer<typeof showSchema>) {
  const pagamentos = (payload.pagamentosPrevistos ?? []).map((pagamento) => ({
    descricao: pagamento.descricao,
    valor: pagamento.valor,
    quantidade: pagamento.quantidade,
    dataPrevista: null,
    isEntrada: false,
  }));
  const percentualEntrada = payload.tipoEntrada === "PERCENTUAL" ? payload.valorEntrada ?? 0 : 0;

  if (percentualEntrada > 0) {
    const valorEntrada = Math.round(payload.valorShow * percentualEntrada) / 100;
    pagamentos.unshift({
      descricao: `Entrada (${percentualEntrada}%)`,
      valor: valorEntrada,
      quantidade: 1,
      dataPrevista: null,
      isEntrada: true,
    });
  }

  return pagamentos;
}

async function validarDisponibilidade(
  transaction: Prisma.TransactionClient,
  data: Date,
  dataFim: Date,
  status: z.infer<typeof showSchema>["status"],
  showId?: number,
) {
  if (status === "CANCELADO") return;

  await transaction.$queryRaw`SELECT pg_advisory_xact_lock(20261009, 1600) IS NULL`;
  const showConflitante = await transaction.show.findFirst({
    where: {
      ...(showId === undefined ? {} : { id: { not: showId } }),
      status: { not: "CANCELADO" },
      data: { lt: dataFim },
      dataFim: { gt: data },
    },
    select: { titulo: true },
  });
  if (showConflitante) throw new AgendaConflitoError(showConflitante.titulo);
}

async function salvarContratante(
  transaction: Prisma.TransactionClient,
  dados: z.infer<typeof showSchema>["contratante"],
  contratanteId: number | null | undefined,
) {
  if (!dados) return contratanteId ?? null;

  const cpf = dados.cpf || null;
  const contratanteAtual = contratanteId
    ? await transaction.contratante.findUnique({ where: { id: contratanteId } })
    : null;

  if (contratanteAtual && (cpf === null || cpf === contratanteAtual.cpf)) {
    if (contratanteAtual.tipoDocumento !== dados.tipoDocumento) {
      await transaction.contratante.update({
        where: { id: contratanteAtual.id },
        data: { tipoDocumento: dados.tipoDocumento },
      });
    }
    return contratanteAtual.id;
  }

  const email = dados.email || null;
  const existente = cpf ? await transaction.contratante.findUnique({ where: { cpf } }) : null;
  if (existente) {
    if (existente.tipoDocumento !== dados.tipoDocumento) {
      throw new DocumentoContratanteConflictError();
    }
    return existente.id;
  }

  return (await transaction.contratante.create({
    data: {
      nome: dados.nome,
      cpf,
      tipoDocumento: dados.tipoDocumento,
      email,
      telefone: dados.telefone || null,
    },
  })).id;
}

export function removerShow(id: number) {
  return prisma.$transaction(async (transaction) => {
    const show = await transaction.show.delete({
      where: { id },
      include: {
        pagamentos: { select: { comprovantePath: true } },
        contratos: { select: { arquivoPath: true } },
        contratante: { select: { id: true } },
      },
    });

    if (show.contratante) {
      await transaction.contratante.deleteMany({
        where: {
          id: show.contratante.id,
          shows: { none: {} },
        },
      });
    }

    return show;
  });
}
