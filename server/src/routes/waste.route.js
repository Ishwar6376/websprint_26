import express from "express";
import { checkJwt } from "../auth/authMiddleware.js";


const router=express.Router();

import { fetchWasteZones } from "../controllers/administration/waste.controller.js"
router.get("/waste/reports",fetchWasteZones)
export default router
