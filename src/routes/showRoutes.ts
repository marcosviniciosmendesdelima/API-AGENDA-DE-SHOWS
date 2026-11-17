import { Router } from "express";
import * as controller from "../controllers/showController.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import * as pagamentoController from "../controllers/pagamentoController.js";
import { receberComprovante } from "../middleware/paymentUpload.js";
import * as contractController from "../controllers/contractController.js";
import { receberContratos } from "../middleware/contractUpload.js";

const router = Router();

router.get("/shows", requireAuth, controller.listar);
router.post("/shows", requireAuth, requireAdmin, controller.criar);
router.put("/shows/:id", requireAuth, requireAdmin, controller.atualizar);
router.delete("/shows/:id", requireAuth, requireAdmin, controller.remover);
router.get("/shows/:id/pagamentos", requireAuth, requireAdmin, pagamentoController.listar);
router.post("/shows/:id/pagamentos", requireAuth, requireAdmin, receberComprovante, pagamentoController.criar);
router.get("/pagamentos/:pagamentoId/comprovante", requireAuth, requireAdmin, pagamentoController.comprovante);
router.delete("/pagamentos/:pagamentoId", requireAuth, requireAdmin, pagamentoController.remover);
router.get("/shows/:id/contratos", requireAuth, requireAdmin, contractController.listar);
router.post("/shows/:id/contratos", requireAuth, requireAdmin, receberContratos, contractController.criar);
router.get("/contratos/:contratoId/arquivo", requireAuth, requireAdmin, contractController.arquivo);
router.delete("/contratos/:contratoId", requireAuth, requireAdmin, contractController.remover);

export default router;
