import * as localRepository from "../repositories/localRepository.js";

export async function listarLocais() {
  return localRepository.listarLocais();
}

export async function criarLocal(input: unknown) {
  return localRepository.criarLocal(input);
}
