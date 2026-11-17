CREATE TABLE "PagamentoPrevisto" (
    "id" SERIAL NOT NULL,
    "showId" INTEGER NOT NULL,
    "descricao" VARCHAR(100) NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "dataPrevista" DATE,
    "isEntrada" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PagamentoPrevisto_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PagamentoPrevisto_showId_dataPrevista_idx" ON "PagamentoPrevisto"("showId", "dataPrevista");

ALTER TABLE "PagamentoPrevisto"
ADD CONSTRAINT "PagamentoPrevisto_showId_fkey"
FOREIGN KEY ("showId") REFERENCES "Show"("id") ON DELETE CASCADE ON UPDATE CASCADE;
