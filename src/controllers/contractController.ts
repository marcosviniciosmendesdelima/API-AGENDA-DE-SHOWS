import fs from "node:fs/promises";
import path from "node:path";
import type { Request, Response } from "express";
import * as contractService from "../services/contractService.js";
import { contractDirectory } from "../middleware/contractUpload.js";

function parseId(value: string | string[] | undefined) {
  const id = Number(typeof value === "string" ? value : Number.NaN);
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error("Identificador inválido.");
  return id;
}

function filesFromRequest(req: Request): Express.Multer.File[] {
  return Array.isArray(req.files) ? req.files : [];
}

async function removerArquivos(files: Express.Multer.File[]) {
  for (const file of files) {
    try {
      await fs.unlink(file.path);
    } catch (error) {
      if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") {
        console.error("Não foi possível remover um contrato que não foi registrado.", error);
      }
    }
  }
}

function caminhoContrato(arquivoPath: string) {
  if (path.basename(arquivoPath) !== arquivoPath || !arquivoPath.endsWith(".pdf")) {
    throw new Error("Caminho do contrato inválido.");
  }
  const filePath = path.resolve(contractDirectory, arquivoPath);
  if (path.dirname(filePath) !== contractDirectory) {
    throw new Error("Caminho do contrato inválido.");
  }
  return filePath;
}

export async function listar(req: Request, res: Response) {
  try {
    const contratos = await contractService.listarContratos(parseId(req.params.id));
    return res.json(contratos);
  } catch (error) {
    const status = error instanceof contractService.ContractShowNotFoundError ? 404 : 400;
    return res.status(status).json({ erro: error instanceof Error ? error.message : "Erro ao listar contratos." });
  }
}

export async function criar(req: Request, res: Response) {
  const files = filesFromRequest(req);
  if (files.length === 0) {
    return res.status(400).json({ erro: "Selecione pelo menos um contrato em PDF." });
  }

  try {
    const contratos = await contractService.criarContratos(parseId(req.params.id), files);
    return res.status(201).json(contratos);
  } catch (error) {
    await removerArquivos(files);
    const status = error instanceof contractService.InvalidContractFileError ? 400
      : error instanceof contractService.ContractShowNotFoundError ? 404
        : error instanceof Error && error.message === "Identificador inválido." ? 400
          : 500;
    return res.status(status).json({ erro: error instanceof Error ? error.message : "Erro ao anexar contratos." });
  }
}

export async function arquivo(req: Request, res: Response) {
  try {
    const contrato = await contractService.buscarContrato(parseId(req.params.contratoId));
    if (!contrato) return res.status(404).json({ erro: "Contrato não encontrado." });

    const filePath = caminhoContrato(contrato.arquivoPath);
    res.setHeader("X-Content-Type-Options", "nosniff");
    return res.download(filePath, contrato.nome, (error) => {
      if (!error) return;
      if (res.headersSent) {
        console.error("Não foi possível concluir o download do contrato.", error);
        return;
      }
      if ("code" in error && error.code === "ENOENT") {
        res.status(404).json({ erro: "Arquivo do contrato não encontrado." });
        return;
      }
      console.error("Erro ao enviar arquivo de contrato.", error);
      res.status(500).json({ erro: "Não foi possível baixar o contrato." });
    });
  } catch (error) {
    const status = error instanceof contractService.ContractNotFoundError ? 404
      : error instanceof Error && error.message === "Identificador inválido." ? 400
        : 500;
    return res.status(status).json({ erro: error instanceof Error ? error.message : "Erro ao abrir contrato." });
  }
}

export async function remover(req: Request, res: Response) {
  try {
    const id = parseId(req.params.contratoId);
    const existente = await contractService.buscarContrato(id);
    if (!existente) return res.status(404).json({ erro: "Contrato não encontrado." });

    const filePath = caminhoContrato(existente.arquivoPath);
    await contractService.removerContrato(id);
    try {
      await fs.unlink(filePath);
    } catch (error) {
      if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") {
        console.error("Contrato removido do banco, mas o arquivo não foi apagado.", error);
      }
    }
    return res.status(204).send();
  } catch (error) {
    const status = error instanceof contractService.ContractNotFoundError ? 404
      : error instanceof Error && error.message === "Identificador inválido." ? 400
        : 500;
    return res.status(status).json({ erro: error instanceof Error ? error.message : "Erro ao remover contrato." });
  }
}
