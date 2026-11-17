CREATE TABLE "Contrato" (
    "id" SERIAL NOT NULL,
    "showId" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "arquivoPath" TEXT NOT NULL,
    "arquivoTipo" TEXT NOT NULL,
    "tamanhoBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contrato_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Contrato_arquivoPath_key" ON "Contrato"("arquivoPath");
CREATE INDEX "Contrato_showId_createdAt_idx" ON "Contrato"("showId", "createdAt");

ALTER TABLE "Contrato"
ADD CONSTRAINT "Contrato_showId_fkey"
FOREIGN KEY ("showId") REFERENCES "Show"("id") ON DELETE CASCADE ON UPDATE CASCADE;
