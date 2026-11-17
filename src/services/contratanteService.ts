import * as contratanteRepository from "../repositories/contratanteRepository.js";

export async function listarContratantes() {
  return contratanteRepository.listarContratantes();
}
