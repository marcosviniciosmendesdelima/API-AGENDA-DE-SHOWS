import type { Request, Response } from "express";
import * as contratanteService from "../services/contratanteService.js";

export async function listar(req: Request, res: Response) {
  try {
    const contratantes = await contratanteService.listarContratantes();
    return res.json(contratantes);
  } catch (error) {
    return res.status(500).json({ erro: error instanceof Error ? error.message : "Erro ao listar contratantes." });
  }
}
