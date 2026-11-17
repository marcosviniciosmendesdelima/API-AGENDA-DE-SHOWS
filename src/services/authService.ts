import { prisma } from "../lib/prisma.js";
import { z } from "zod";
import bcryptjs from "bcryptjs";
import { signToken } from "../middleware/auth.js";
import { Prisma } from "@prisma/client";

const loginSchema = z.object({
  email: z.string().trim().email().transform((email) => email.toLowerCase()),
  password: z.string().min(6),
});

const createUserSchema = z.object({
  nome: z.string().trim().min(1).max(100),
  email: z.string().trim().email().transform((email) => email.toLowerCase()),
  password: z.string().min(12, "A senha deve ter pelo menos 12 caracteres."),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Informe sua senha atual."),
  newPassword: z.string().min(12, "A nova senha deve ter pelo menos 12 caracteres."),
});

export class CurrentPasswordError extends Error {
  constructor() {
    super("A senha atual está incorreta.");
    this.name = "CurrentPasswordError";
  }
}

export class UnchangedPasswordError extends Error {
  constructor() {
    super("A nova senha deve ser diferente da senha atual.");
    this.name = "UnchangedPasswordError";
  }
}

export class UserEmailConflictError extends Error {
  constructor() {
    super("Já existe uma conta com este e-mail.");
    this.name = "UserEmailConflictError";
  }
}

export async function ensureDefaultAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@banda.com";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "admin123";

  const existing = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existing) {
    const passwordHash = await bcryptjs.hash(adminPassword, 10);

    await prisma.user.create({
      data: {
        nome: "Administrador",
        email: adminEmail,
        passwordHash,
        role: "ADMIN",
      },
    });
  }
}

export async function listarUsuarios() {
  return prisma.user.findMany({
    select: { id: true, nome: true, email: true, role: true, createdAt: true },
    orderBy: { nome: "asc" },
  });
}

export async function criarUsuario(input: unknown) {
  const dados = createUserSchema.parse(input);
  const passwordHash = await bcryptjs.hash(dados.password, 10);

  try {
    return await prisma.user.create({
      data: {
        nome: dados.nome,
        email: dados.email,
        passwordHash,
        role: "USER",
      },
      select: { id: true, nome: true, email: true, role: true, createdAt: true },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new UserEmailConflictError();
    }
    throw error;
  }
}

export async function alterarSenha(userId: number, input: unknown) {
  const dados = changePasswordSchema.parse(input);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });

  if (!user || !(await bcryptjs.compare(dados.currentPassword, user.passwordHash))) {
    throw new CurrentPasswordError();
  }

  if (await bcryptjs.compare(dados.newPassword, user.passwordHash)) {
    throw new UnchangedPasswordError();
  }

  const passwordHash = await bcryptjs.hash(dados.newPassword, 10);
  const result = await prisma.user.updateMany({
    where: { id: userId, passwordHash: user.passwordHash },
    data: { passwordHash, tokenVersion: { increment: 1 } },
  });

  if (result.count === 0) {
    throw new CurrentPasswordError();
  }
}

export async function login(credentials: unknown) {
  const parsed = loginSchema.parse(credentials);

  const user = await prisma.user.findUnique({
    where: { email: parsed.email },
  });

  if (!user) {
    throw new Error("Credenciais inválidas.");
  }

  const passwordMatches = await bcryptjs.compare(parsed.password, user.passwordHash);

  if (!passwordMatches) {
    throw new Error("Credenciais inválidas.");
  }

  const token = signToken({
    id: user.id,
    email: user.email,
    role: user.role,
    tokenVersion: user.tokenVersion,
  });

  return {
    token,
    user: {
      id: user.id,
      nome: user.nome,
      email: user.email,
      role: user.role,
    },
  };
}
