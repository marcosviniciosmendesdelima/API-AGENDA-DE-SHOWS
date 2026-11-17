import type { Request, Response } from "express";
import { z } from "zod";
import * as showService from "../services/showService.js";

export async function listar(req: Request, res: Response) {
  try {
    const shows = req.user?.role === "ADMIN"
      ? await showService.listarShows()
      : await showService.listarAgendaResumida();
    return res.json(shows);
  } catch (error) {
    return res.status(500).json({ erro: error instanceof Error ? error.message : "Erro ao listar shows." });
  }
}

export async function criar(req: Request, res: Response) {
  try {
    const show = await showService.criarShow(req.body);
    return res.status(201).json(show);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ erro: error.issues[0]?.message ?? "Dados inválidos." });
    }
    if (error instanceof showService.AgendaConflitoError) {
      return res.status(409).json({ erro: error.message });
    }
    if (error instanceof showService.DocumentoContratanteConflictError) {
      return res.status(409).json({ erro: error.message });
    }

    return res.status(500).json({ erro: error instanceof Error ? error.message : "Erro ao criar show." });
  }
}

export async function atualizar(req: Request, res: Response) {
  const id = Number(req.params.id);

  try {
    const show = await showService.atualizarShow(id, req.body);
    return res.json(show);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ erro: error.issues[0]?.message ?? "Dados inválidos." });
    }
    if (error instanceof showService.AgendaConflitoError) {
      return res.status(409).json({ erro: error.message });
    }
    if (error instanceof showService.DocumentoContratanteConflictError) {
      return res.status(409).json({ erro: error.message });
    }

    const status = error instanceof Error && error.message.includes("valor do show não pode ficar abaixo") ? 400 : 500;
    return res.status(status).json({ erro: error instanceof Error ? error.message : "Erro ao atualizar show." });
  }
}

export async function remover(req: Request, res: Response) {
  const id = Number(req.params.id);

  try {
    await showService.removerShow(id);
    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ erro: error instanceof Error ? error.message : "Erro ao remover show." });
  }
}
