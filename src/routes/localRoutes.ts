import { Router } from "express";
import * as controller from "../controllers/localController.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

router.get("/locais", requireAuth, requireAdmin, controller.listar);
router.post("/locais", requireAuth, requireAdmin, controller.criar);

export default router;
