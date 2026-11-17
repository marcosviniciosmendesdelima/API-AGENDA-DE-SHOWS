import { Router } from "express";
import * as controller from "../controllers/authController.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

router.post("/login", controller.login);
router.post("/register", controller.registrar);
router.post("/change-password", requireAuth, controller.alterarSenha);
router.get("/users", requireAuth, requireAdmin, controller.listarUsuarios);
router.post("/users", requireAuth, requireAdmin, controller.criarUsuario);

export default router;
