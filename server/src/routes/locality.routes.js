import express from "express"
const router=express.Router();
import {electricityCheck} from "../controllers/localityCheck/electrictiyCheck.js"
import { wasteCheck } from "../controllers/localityCheck/wasteCheck.js";
import { waterCheck } from "../controllers/localityCheck/waterCheck.js";
import { infraCheck } from "../controllers/localityCheck/infraCheck.js";
router.post('/waterCheck',waterCheck)
router.post('/wasteCheck',wasteCheck)
router.post('/infraCheck',infraCheck)
router.post('/electricityCheck',electricityCheck)

export default router
