import type { Request, Response } from "express";
import { z } from "zod";
import * as authService from "../services/authService.js";

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(6),
});

export async function login(req: Request, res: Response) {
  try {
    const payload = loginSchema.parse(req.body);
    const session = await authService.login(payload);

    return res.json(session);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ erro: error.issues[0]?.message ?? "Dados inválidos." });
    }

    return res.status(401).json({ erro: error instanceof Error ? error.message : "Falha ao autenticar." });
  }
}

export async function alterarSenha(req: Request, res: Response) {
  try {
    await authService.alterarSenha(req.user!.id, req.body);
    return res.json({ mensagem: "Senha alterada com sucesso. Faça login novamente." });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ erro: error.issues[0]?.message ?? "Dados inválidos." });
    }
    if (error instanceof authService.CurrentPasswordError) {
      return res.status(400).json({ erro: error.message });
    }
    if (error instanceof authService.UnchangedPasswordError) {
      return res.status(400).json({ erro: error.message });
    }
    return res.status(500).json({ erro: error instanceof Error ? error.message : "Erro ao alterar senha." });
  }
}

export async function registrar(req: Request, res: Response) {
  try {
    await authService.criarUsuario(req.body);
    const session = await authService.login(req.body);
    return res.status(201).json(session);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ erro: error.issues[0]?.message ?? "Dados inválidos." });
    }
    if (error instanceof authService.UserEmailConflictError) {
      return res.status(409).json({ erro: error.message });
    }
    return res.status(500).json({ erro: error instanceof Error ? error.message : "Erro ao criar conta." });
  }
}

export async function listarUsuarios(_req: Request, res: Response) {
  try {
    return res.json(await authService.listarUsuarios());
  } catch (error) {
    return res.status(500).json({ erro: error instanceof Error ? error.message : "Erro ao listar usuários." });
  }
}

export async function criarUsuario(req: Request, res: Response) {
  try {
    const user = await authService.criarUsuario(req.body);
    return res.status(201).json(user);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ erro: error.issues[0]?.message ?? "Dados inválidos." });
    }
    if (error instanceof authService.UserEmailConflictError) {
      return res.status(409).json({ erro: error.message });
    }
    return res.status(500).json({ erro: error instanceof Error ? error.message : "Erro ao criar usuário." });
  }
}
