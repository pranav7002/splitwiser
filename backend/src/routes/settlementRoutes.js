import { Router } from "express";
import { settleGroupAsync, getSettlementJobStatus } from "../controller/settlementController.js";

const router = Router();

router.post("/", settleGroupAsync);
router.get("/status/:jobId", getSettlementJobStatus);

export default router;
