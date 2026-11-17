import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { NextFunction, Request, Response } from "express";
import multer from "multer";

export const contractDirectory = path.resolve(process.cwd(), "uploads", "contratos");
fs.mkdirSync(contractDirectory, { recursive: true });

const contractUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, contractDirectory),
    filename: (_req, _file, callback) => callback(null, `${crypto.randomUUID()}.pdf`),
  }),
  limits: { fileSize: 8 * 1024 * 1024, files: 10 },
  fileFilter: (_req, file, callback) => {
    if (!file.originalname.toLowerCase().endsWith(".pdf")) {
      callback(new Error("Formato inválido. Envie contratos em PDF."));
      return;
    }
    callback(null, true);
  },
});

export function receberContratos(req: Request, res: Response, next: NextFunction) {
  contractUpload.array("contratos", 10)(req, res, (error: unknown) => {
    if (error instanceof multer.MulterError) {
      res.status(400).json({
        erro: error.code === "LIMIT_FILE_SIZE"
          ? "Cada contrato deve ter no máximo 8 MB."
          : "Envie no máximo 10 contratos por vez.",
      });
      return;
    }
    if (error) {
      res.status(400).json({ erro: error instanceof Error ? error.message : "Arquivo de contrato inválido." });
      return;
    }
    next();
  });
}
