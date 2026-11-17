import express from "express";
import swaggerUi from "swagger-ui-express";
import path from "node:path";
import fs from "node:fs";
import "dotenv/config";
import authRoutes from "./routes/authRoutes.js";
import showRoutes from "./routes/showRoutes.js";
import contratanteRoutes from "./routes/contratanteRoutes.js";
import localRoutes from "./routes/localRoutes.js";
import { ensureDefaultAdmin } from "./services/authService.js";
import openApiDocument from "./openapi.js";

const app = express();
const PORT = Number(process.env.PORT ?? 3000);

app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));

app.get("/api/docs.json", (_req, res) => {
  res.json(openApiDocument);
});
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument, {
  customSiteTitle: "Documentação da API — Agenda de Shows",
  swaggerOptions: { persistAuthorization: true },
}));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "agenda-de-shows",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api", showRoutes);
app.use("/api", contratanteRoutes);
app.use("/api", localRoutes);

const distPath = path.resolve(process.cwd(), "dist", "client");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));

  app.get(/^(?!\/api\/).*/, (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

try {
  await ensureDefaultAdmin();
} catch (error) {
  console.warn("Banco de dados indisponível no momento; a API será iniciada em modo aguardando conexão.");
  console.warn(error instanceof Error ? error.message : String(error));
}

app.listen(PORT, () => {
  console.log(`Agenda de shows ativa na porta ${PORT}`);
});
