CREATE TYPE "TipoLocal" AS ENUM ('PUBLICO', 'PRIVADO');

ALTER TABLE "Show"
ADD COLUMN "tipoLocal" "TipoLocal" NOT NULL DEFAULT 'PRIVADO';

CREATE TABLE "Pagamento" (
    "id" SERIAL NOT NULL,
    "showId" INTEGER NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "dataPagamento" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "comprovantePath" TEXT,
    "comprovanteNome" TEXT,
    "comprovanteTipo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pagamento_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Pagamento"
ADD CONSTRAINT "Pagamento_showId_fkey"
FOREIGN KEY ("showId") REFERENCES "Show"("id") ON DELETE CASCADE ON UPDATE CASCADE;
