CREATE TYPE "TipoEntrada" AS ENUM ('VALOR', 'PERCENTUAL');

ALTER TABLE "Show"
ADD COLUMN "tipoEntrada" "TipoEntrada",
ADD COLUMN "valorEntrada" DECIMAL(10,2),
ADD COLUMN "numeroParcelas" INTEGER,
ADD COLUMN "inicioPlanoPagamento" TIMESTAMP(3);
