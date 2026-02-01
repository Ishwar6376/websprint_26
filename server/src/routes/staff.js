import express from "express";
import {getTask,getAllPastTask,assignTask} from "../controllers/staff/staff.controller.js"
import {checkJwt} from "../auth/authMiddleware.js"
import { resolveWasteReports } from "../controllers/staff/resolveWasteReports.js";
const router = express.Router();

router.get('/tasks/active',checkJwt,getTask);
router.get('/tasks/history',checkJwt,getAllPastTask);
router.post('/tasks/assign',checkJwt,assignTask);
router.post('/tasks/resolve',checkJwt,resolveWasteReports)

export default router;