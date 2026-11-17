import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";

const JWT_SECRET = process.env.JWT_SECRET ?? "agenda-banda-secret";

export type JwtUser = {
  id: number;
  email: string;
  role: "ADMIN" | "USER";
  tokenVersion?: number;
};

export function signToken(user: JwtUser) {
  return jwt.sign(user, JWT_SECRET, { expiresIn: "7d" });
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ erro: "Token não informado." });
  }

  let decoded: JwtUser;
  try {
    const token = authHeader.replace("Bearer ", "");
    decoded = jwt.verify(token, JWT_SECRET) as JwtUser;
  } catch {
    return res.status(401).json({ erro: "Token inválido ou expirado." });
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.id },
    select: { tokenVersion: true },
  });

  if (!user || (decoded.tokenVersion ?? 0) !== user.tokenVersion) {
    return res.status(401).json({ erro: "Sessão inválida. Faça login novamente." });
  }

  req.user = decoded;
  return next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== "ADMIN") {
    return res.status(403).json({ erro: "Acesso restrito para administradores." });
  }

  return next();
}
