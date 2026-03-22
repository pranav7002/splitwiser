import { Router } from "express";
import { settleGroup } from "../controller/settlementController.js";

const router = Router();

router.post("/settle", settleGroup);

export default router;
