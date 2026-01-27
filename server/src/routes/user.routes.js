import express from "express";
import { getUserById } from "../controllers/user.controller.js";
import { checkJwt } from "../auth/authMiddleware.js";
import { fetchReportsByUserId } from "../controllers/user/getRepots.js"

const router = express.Router();

router.get("/reports",checkJwt,fetchReportsByUserId);
router.get("/:id", getUserById);

export default router;