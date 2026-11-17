ALTER TABLE "Contratante"
ADD COLUMN "cpf" TEXT;

CREATE UNIQUE INDEX "Contratante_cpf_key" ON "Contratante"("cpf");

ALTER TABLE "Show"
ADD COLUMN "dataFim" TIMESTAMP(3),
ADD COLUMN "responsavelVenda" TEXT,
ADD COLUMN "valorShow" DECIMAL(10,2) NOT NULL DEFAULT 0;

UPDATE "Show"
SET "dataFim" = "data" + INTERVAL '2 hours'
WHERE "dataFim" IS NULL;

ALTER TABLE "Show"
ALTER COLUMN "dataFim" SET NOT NULL;
