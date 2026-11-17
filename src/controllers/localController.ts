import type { Request, Response } from "express";
import { z } from "zod";
import * as localService from "../services/localService.js";

export async function listar(req: Request, res: Response) {
  try {
    const locais = await localService.listarLocais();
    return res.json(locais);
  } catch (error) {
    return res.status(500).json({ erro: error instanceof Error ? error.message : "Erro ao listar locais." });
  }
}

export async function criar(req: Request, res: Response) {
  try {
    const local = await localService.criarLocal(req.body);
    return res.status(201).json(local);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ erro: error.issues[0]?.message ?? "Dados inválidos." });
    }
    return res.status(500).json({ erro: error instanceof Error ? error.message : "Erro ao cadastrar local." });
  }
}
