import { Router } from "express";
import * as controller from "../controllers/contratanteController.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

router.get("/contratantes", requireAuth, requireAdmin, controller.listar);

export default router;
