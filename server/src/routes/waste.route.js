import express from "express";
import { checkJwt } from "../auth/authMiddleware.js";


const router=express.Router();

import { fetchWasteZones,fetchInfraZones } from "../controllers/administration/waste.controller.js"
router.get("/waste/reports",fetchWasteZones)
router.get("/infra/reports",fetchInfraZones)




export default router
