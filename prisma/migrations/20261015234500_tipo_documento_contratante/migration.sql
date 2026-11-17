CREATE TYPE "TipoDocumentoFiscal" AS ENUM ('CPF', 'CNPJ', 'RG');

ALTER TABLE "Contratante"
ADD COLUMN "tipoDocumento" "TipoDocumentoFiscal" NOT NULL DEFAULT 'CPF';

UPDATE "Contratante"
SET "tipoDocumento" = 'CNPJ'
WHERE "cpf" IS NOT NULL
  AND length(regexp_replace("cpf", '[^0-9]', '', 'g')) = 14;
