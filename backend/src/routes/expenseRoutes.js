import { Router } from "express";
import { addExpense } from "../controller/expenseController.js";

const router = Router();

router.post("/", addExpense);

export default router;
