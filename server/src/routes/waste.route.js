import express from "express";
import { checkJwt } from "../auth/authMiddleware.js";


const router=express.Router();

import { fetchWasteZones,fetchInfraZones,fetchElectricityZones,fetchWaterZones,fetchFireZones } from "../controllers/administration/waste.controller.js"
router.get("/waste/reports",fetchWasteZones)
router.get("/infra/reports",fetchInfraZones)
router.get("/electricity/reports",fetchElectricityZones)
router.get("/water/reports",fetchWaterZones)
router.get("/fire/reports", fetchFireZones);



export default router
