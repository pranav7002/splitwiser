import { Router } from "express";
import {
    createGroup,
    listGroups,
    getGroupById,
    getGroupBalances,
    getGroupSettlementPreview,
} from "../controller/groupController.js";

const router = Router();

router.post("/", createGroup);
router.get("/", listGroups);
router.get("/:id", getGroupById);
router.get("/:groupId/balances", getGroupBalances);
router.get("/:groupId/settlement-preview", getGroupSettlementPreview);

export default router;
