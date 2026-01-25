import express from "express"
const router=express.Router();
import {getUserGarbageReport,getGarbageReportById} from "../controllers/garbage.controller.js"
import { checkJwt } from "../auth/authMiddleware.js";


router.get("/",checkJwt,getUserGarbageReport)
router.get("/:id",checkJwt,getGarbageReportById)
export default router;