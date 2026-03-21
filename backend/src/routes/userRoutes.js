import { Router } from "express";
import { createUser, listUsers } from "../controller/userController.js";

const router = Router();

router.post("/", createUser);
router.get("/", listUsers);

export default router;
