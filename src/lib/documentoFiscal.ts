import { z } from "zod";

export const contratanteSchema = z.object({
  nome: z.string().trim().min(1),
  tipoDocumento: z.enum(["CPF", "CNPJ", "RG"]).default("CPF"),
  cpf: z.string().trim().max(30),
  email: z.union([z.string().trim().pipe(z.email()), z.literal("")]).nullable().optional(),
  telefone: z.string().trim().max(30).nullable().optional(),
}).superRefine((contratante, context) => {
  const { cpf, tipoDocumento } = contratante;
  if (!cpf) return;

  if (tipoDocumento === "RG") {
    if (!/^[A-Za-z0-9][A-Za-z0-9 ./-]{0,29}$/.test(cpf)) {
      context.addIssue({
        code: "custom",
        message: "O RG deve conter letras ou números e pode incluir espaços, pontos, barras ou hífens.",
        path: ["cpf"],
      });
    }
    return;
  }

  const digits = cpf.replace(/\D/g, "");
  const expectedLength = tipoDocumento === "CPF" ? 11 : 14;
  if (!/^[\d./\-\s]+$/.test(cpf) || digits.length !== expectedLength) {
    context.addIssue({
      code: "custom",
      message: `O ${tipoDocumento} deve conter ${expectedLength} números.`,
      path: ["cpf"],
    });
  }
}).transform((contratante) => ({
  ...contratante,
  cpf: contratante.tipoDocumento === "RG"
    ? contratante.cpf
    : contratante.cpf.replace(/\D/g, ""),
}));
