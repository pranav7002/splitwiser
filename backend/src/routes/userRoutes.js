import { Router } from "express";
import { createUser, listUsers, updateSmartAccount } from "../controller/userController.js";

const router = Router();

router.post("/", createUser);
router.get("/", listUsers);
router.put("/:id/smart-account", updateSmartAccount);

export default router;
