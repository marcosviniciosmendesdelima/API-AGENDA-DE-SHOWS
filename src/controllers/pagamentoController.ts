import fs from "node:fs/promises";
import path from "node:path";
import type { Request, Response } from "express";
import { z } from "zod";
import * as pagamentoService from "../services/pagamentoService.js";
import { uploadDirectory } from "../middleware/paymentUpload.js";

function parseId(value: string | string[] | undefined) {
  const id = Number(typeof value === "string" ? value : Number.NaN);
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error("Identificador inválido.");
  return id;
}

async function removerArquivoTemporario(file?: Express.Multer.File) {
  if (!file) return;
  try {
    await fs.unlink(file.path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error("Não foi possível remover o comprovante de um pagamento não registrado.", error);
    }
  }
}

function respostaErroCriacao(error: unknown) {
  if (error instanceof z.ZodError) {
    return { status: 400, mensagem: error.issues[0]?.message ?? "Dados inválidos." };
  }
  const mensagem = error instanceof Error ? error.message : "Erro ao registrar pagamento.";
  return {
    status: mensagem.includes("saldo restante") || mensagem.includes("quitado") ? 400 : 500,
    mensagem,
  };
}

export async function listar(req: Request, res: Response) {
  try {
    const pagamentos = await pagamentoService.listarPagamentos(parseId(req.params.id));
    return res.json(pagamentos);
  } catch (error) {
    return res.status(400).json({ erro: error instanceof Error ? error.message : "Erro ao listar pagamentos." });
  }
}

export async function criar(req: Request, res: Response) {
  try {
    const pagamento = await pagamentoService.registrarPagamento(
      parseId(req.params.id),
      req.body,
      req.file,
    );
    return res.status(201).json(pagamento);
  } catch (error) {
    await removerArquivoTemporario(req.file);
    const resposta = respostaErroCriacao(error);
    return res.status(resposta.status).json({ erro: resposta.mensagem });
  }
}

export async function comprovante(req: Request, res: Response) {
  try {
    const pagamento = await pagamentoService.buscarPagamento(parseId(req.params.pagamentoId));
    if (!pagamento?.comprovantePath || !pagamento.comprovanteTipo) {
      return res.status(404).json({ erro: "Comprovante não encontrado." });
    }

    const filePath = path.resolve(uploadDirectory, pagamento.comprovantePath);
    if (path.dirname(filePath) !== uploadDirectory) {
      return res.status(400).json({ erro: "Caminho do comprovante inválido." });
    }

    res.type(pagamento.comprovanteTipo);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent(pagamento.comprovanteNome ?? "comprovante")}`);
    return res.sendFile(filePath);
  } catch (error) {
    return res.status(500).json({ erro: error instanceof Error ? error.message : "Erro ao abrir comprovante." });
  }
}

export async function remover(req: Request, res: Response) {
  try {
    const pagamento = await pagamentoService.removerPagamento(parseId(req.params.pagamentoId));
    if (pagamento.comprovantePath) {
      if (path.basename(pagamento.comprovantePath) !== pagamento.comprovantePath) {
        throw new Error("Caminho do comprovante inválido.");
      }
      const filePath = path.resolve(uploadDirectory, pagamento.comprovantePath);
      try {
        await fs.unlink(filePath);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
          console.error("Pagamento removido do banco, mas o arquivo do comprovante não foi apagado.", error);
        }
      }
    }
    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ erro: error instanceof Error ? error.message : "Erro ao remover pagamento." });
  }
}
