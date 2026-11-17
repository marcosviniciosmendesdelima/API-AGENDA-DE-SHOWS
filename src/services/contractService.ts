import fs from "node:fs/promises";
import * as contractRepository from "../repositories/contractRepository.js";

export {
  ContractNotFoundError,
  ContractShowNotFoundError,
} from "../repositories/contractRepository.js";

export class InvalidContractFileError extends Error {
  constructor(name: string) {
    super(`O arquivo "${name}" não é um PDF válido.`);
    this.name = "InvalidContractFileError";
  }
}

export async function criarContratos(showId: number, files: Express.Multer.File[]) {
  for (const file of files) {
    if (file.originalname.length > 255 || !(await isPdf(file.path))) {
      throw new InvalidContractFileError(file.originalname);
    }
  }
  return contractRepository.criarContratos(showId, files);
}

export function listarContratos(showId: number) {
  return contractRepository.listarContratos(showId);
}

export function buscarContrato(id: number) {
  return contractRepository.buscarContrato(id);
}

export function removerContrato(id: number) {
  return contractRepository.removerContrato(id);
}

async function isPdf(filePath: string): Promise<boolean> {
  const file = await fs.open(filePath, "r");
  try {
    const signature = Buffer.alloc(5);
    const { bytesRead } = await file.read(signature, 0, signature.length, 0);
    return bytesRead === signature.length && signature.toString("ascii") === "%PDF-";
  } finally {
    await file.close();
  }
}
