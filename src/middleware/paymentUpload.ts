import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { NextFunction, Request, Response } from "express";
import multer from "multer";

const uploadDirectory = path.resolve(process.cwd(), "uploads", "comprovantes");
fs.mkdirSync(uploadDirectory, { recursive: true });

const allowedTypes = new Map([
  ["application/pdf", ".pdf"],
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
]);

export const comprovanteUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, uploadDirectory),
    filename: (_req, file, callback) => {
      const extension = allowedTypes.get(file.mimetype);
      if (!extension) {
        callback(new Error("Formato inválido. Envie PDF, JPG, PNG ou WEBP."), "");
        return;
      }
      callback(null, `${crypto.randomUUID()}${extension}`);
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!allowedTypes.has(file.mimetype)) {
      callback(new Error("Formato inválido. Envie PDF, JPG, PNG ou WEBP."));
      return;
    }
    callback(null, true);
  },
});

export function receberComprovante(req: Request, res: Response, next: NextFunction) {
  comprovanteUpload.single("comprovante")(req, res, (error: unknown) => {
    if (error instanceof multer.MulterError) {
      res.status(400).json({
        erro: error.code === "LIMIT_FILE_SIZE"
          ? "O comprovante deve ter no máximo 8 MB."
          : "Não foi possível receber o arquivo do comprovante.",
      });
      return;
    }
    if (error) {
      res.status(400).json({ erro: error instanceof Error ? error.message : "Arquivo de comprovante inválido." });
      return;
    }
    next();
  });
}

export { uploadDirectory };
